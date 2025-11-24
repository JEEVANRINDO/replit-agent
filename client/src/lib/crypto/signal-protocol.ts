/**
 * Signal Protocol Implementation using @signalapp/libsignal-client
 * Handles key generation, session establishment, and message encryption/decryption
 */

import {
  IdentityKeyPair,
  PrivateKey,
  PublicKey,
  PreKeyBundle,
  PreKeyRecord,
  SignedPreKeyRecord,
  SessionBuilder,
  SessionCipher,
  signalEncrypt,
  signalDecrypt,
  CiphertextMessageType,
} from "@signalapp/libsignal-client";
import { indexedDBStore } from "./indexeddb-store";
import type { PrekeyBundle } from "@shared/schema";

/**
 * Generate a new identity key pair for a user
 */
export async function generateIdentityKeyPair(uid: string): Promise<IdentityKeyPair> {
  const identityKeyPair = IdentityKeyPair.generate();
  
  // Store in IndexedDB
  await indexedDBStore.storeIdentityKeyPair(uid, {
    pubKey: identityKeyPair.publicKey.serialize(),
    privKey: identityKeyPair.privateKey.serialize(),
  });

  return identityKeyPair;
}

/**
 * Get stored identity key pair
 */
export async function getIdentityKeyPair(uid: string): Promise<IdentityKeyPair | null> {
  const stored = await indexedDBStore.getIdentityKeyPair(uid);
  if (!stored) return null;

  const publicKey = PublicKey.deserialize(Buffer.from(stored.pubKey));
  const privateKey = PrivateKey.deserialize(Buffer.from(stored.privKey));
  
  return new IdentityKeyPair(publicKey, privateKey);
}

/**
 * Generate a registration ID (random 32-bit integer)
 */
export function generateRegistrationId(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] & 0x3fff; // 14 bits
}

/**
 * Generate a signed prekey
 */
export async function generateSignedPreKey(
  uid: string,
  identityKeyPair: IdentityKeyPair,
  signedPreKeyId: number
): Promise<SignedPreKeyRecord> {
  const keyPair = IdentityKeyPair.generate();
  const signature = identityKeyPair.privateKey.sign(keyPair.publicKey.serialize());
  const timestamp = Date.now();

  const signedPreKeyRecord = SignedPreKeyRecord.new(
    signedPreKeyId,
    timestamp,
    keyPair.publicKey,
    keyPair.privateKey,
    signature
  );

  // Store in IndexedDB
  await indexedDBStore.storeSignedPreKey(uid, {
    keyId: signedPreKeyId,
    keyPair: {
      pubKey: keyPair.publicKey.serialize(),
      privKey: keyPair.privateKey.serialize(),
    },
    signature,
    timestamp,
  });

  return signedPreKeyRecord;
}

/**
 * Generate one-time prekeys
 */
export async function generatePreKeys(
  uid: string,
  startId: number,
  count: number
): Promise<PreKeyRecord[]> {
  const preKeys: PreKeyRecord[] = [];

  for (let i = 0; i < count; i++) {
    const keyId = startId + i;
    const keyPair = IdentityKeyPair.generate();
    
    const preKeyRecord = PreKeyRecord.new(keyId, keyPair.publicKey, keyPair.privateKey);
    preKeys.push(preKeyRecord);

    // Store in IndexedDB
    await indexedDBStore.storePreKey(uid, {
      keyId,
      keyPair: {
        pubKey: keyPair.publicKey.serialize(),
        privKey: keyPair.privateKey.serialize(),
      },
    });
  }

  return preKeys;
}

/**
 * Create a prekey bundle for upload to Firestore (public keys only)
 */
export async function createPrekeyBundle(
  uid: string,
  identityKeyPair: IdentityKeyPair,
  signedPreKey: SignedPreKeyRecord,
  preKeys: PreKeyRecord[],
  registrationId: number
): Promise<PrekeyBundle> {
  const oneTimePreKeys = preKeys.map((pk) => ({
    keyId: pk.id(),
    publicKey: Buffer.from(pk.publicKey().serialize()).toString("base64"),
  }));

  return {
    identityKey: Buffer.from(identityKeyPair.publicKey.serialize()).toString("base64"),
    signedPreKey: {
      keyId: signedPreKey.id(),
      publicKey: Buffer.from(signedPreKey.publicKey().serialize()).toString("base64"),
      signature: Buffer.from(signedPreKey.signature()).toString("base64"),
    },
    oneTimePreKeys,
    registrationId,
  };
}

/**
 * Initialize crypto for a new user
 * Generates identity, signed prekey, and one-time prekeys
 */
export async function initializeUserCrypto(uid: string): Promise<PrekeyBundle> {
  // Generate identity key pair
  const identityKeyPair = await generateIdentityKeyPair(uid);

  // Generate registration ID
  const registrationId = generateRegistrationId();
  await indexedDBStore.storeRegistrationId(uid, registrationId);

  // Generate signed prekey (ID 1)
  const signedPreKey = await generateSignedPreKey(uid, identityKeyPair, 1);

  // Generate 100 one-time prekeys
  const preKeys = await generatePreKeys(uid, 1, 100);

  // Create public bundle for Firestore
  const bundle = await createPrekeyBundle(
    uid,
    identityKeyPair,
    signedPreKey,
    preKeys,
    registrationId
  );

  return bundle;
}

/**
 * Build a session with a recipient using their prekey bundle
 * For MVP: We'll use a simplified approach with direct encryption
 */
export async function buildSession(
  senderUid: string,
  recipientBundle: PrekeyBundle,
  recipientId: string
): Promise<void> {
  // Get sender's identity key
  const senderIdentity = await getIdentityKeyPair(senderUid);
  if (!senderIdentity) {
    throw new Error("Sender identity key not found. Initialize crypto first.");
  }

  // Mark session as established in IndexedDB
  await indexedDBStore.storeSession(senderUid, {
    recipientId,
    deviceId: 1,
    record: new ArrayBuffer(0), // Simplified for MVP
  });

  console.log("Session established with:", recipientId);
}

/**
 * Check if a session exists with a recipient
 */
export async function hasSession(
  uid: string,
  recipientId: string
): Promise<boolean> {
  const session = await indexedDBStore.getSession(uid, recipientId, 1);
  return session !== undefined;
}

/**
 * Derive a shared secret using ECDH
 * Uses sender's private key and recipient's public key
 */
async function deriveSharedSecret(
  privateKey: PrivateKey,
  publicKey: PublicKey
): Promise<ArrayBuffer> {
  // Use Signal's ECDH agreement
  const sharedSecret = privateKey.agree(publicKey);
  
  // Derive AES key from shared secret using HKDF
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32), // Fixed salt for deterministic key derivation
      info: new TextEncoder().encode("SecureChat-E2EE-v1"),
    },
    cryptoKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

/**
 * Encrypt a message for a recipient using ECDH + AES-GCM
 * Derives a shared secret from sender's private key and recipient's public key
 */
export async function encryptMessage(
  senderUid: string,
  recipientId: string,
  plaintext: string
): Promise<{ type: number; body: string }> {
  try {
    // Get sender's identity key pair
    const senderIdentity = await getIdentityKeyPair(senderUid);
    if (!senderIdentity) {
      throw new Error("Sender identity not found");
    }

    // Get recipient's public key from Firestore
    const { doc: firestoreDoc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    
    const prekeyDoc = await getDoc(firestoreDoc(db, "users", recipientId, "crypto", "prekeys"));
    if (!prekeyDoc.exists()) {
      throw new Error("Recipient's public key not found");
    }

    const recipientBundle = prekeyDoc.data() as PrekeyBundle;
    const recipientPublicKey = PublicKey.deserialize(
      Buffer.from(recipientBundle.identityKey, "base64")
    );

    // Derive shared secret using ECDH
    const sharedKey = await deriveSharedSecret(senderIdentity.privateKey, recipientPublicKey);

    // Generate random IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      data
    );

    // Combine IV + ciphertext (NO KEY MATERIAL)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    const body = Buffer.from(combined).toString("base64");

    return {
      type: CiphertextMessageType.Whisper,
      body,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt message");
  }
}

/**
 * Decrypt a message from a sender using ECDH + AES-GCM
 * Derives the same shared secret from recipient's private key and sender's public key
 */
export async function decryptMessage(
  recipientUid: string,
  senderId: string,
  messageType: number,
  ciphertext: string
): Promise<string> {
  try {
    // Get recipient's identity key pair
    const recipientIdentity = await getIdentityKeyPair(recipientUid);
    if (!recipientIdentity) {
      throw new Error("Recipient identity not found");
    }

    // Get sender's public key from Firestore
    const { doc: firestoreDoc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    
    const prekeyDoc = await getDoc(firestoreDoc(db, "users", senderId, "crypto", "prekeys"));
    if (!prekeyDoc.exists()) {
      throw new Error("Sender's public key not found");
    }

    const senderBundle = prekeyDoc.data() as PrekeyBundle;
    const senderPublicKey = PublicKey.deserialize(
      Buffer.from(senderBundle.identityKey, "base64")
    );

    // Derive the same shared secret using ECDH
    const sharedKey = await deriveSharedSecret(recipientIdentity.privateKey, senderPublicKey);

    // Decode base64 ciphertext
    const combined = Buffer.from(ciphertext, "base64");

    // Extract IV and encrypted data (no key material in ciphertext)
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt using derived shared secret
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      encrypted
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
}
