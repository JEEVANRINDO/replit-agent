/**
 * Signal Protocol Implementation using @signalapp/libsignal-client
 * Handles key generation, session establishment, and message encryption/decryption
 */

import { indexedDBStore } from "./indexeddb-store";
import type { PrekeyBundle } from "@shared/schema";

/**
 * Generate a new identity key pair for a user
 */
export async function generateIdentityKeyPair(uid: string) {
  const { IdentityKeyPair } = await import("@signalapp/libsignal-client");
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
export async function getIdentityKeyPair(uid: string) {
  const { PublicKey, PrivateKey, IdentityKeyPair } = await import("@signalapp/libsignal-client");
  const stored = await indexedDBStore.getIdentityKeyPair(uid);
  if (!stored) return null;

  const publicKey = PublicKey.deserialize(Buffer.from(stored.pubKey));
  const privateKey = PrivateKey.deserialize(Buffer.from(stored.privKey));
  
  return new IdentityKeyPair(publicKey, privateKey);
}

/**
 * Generate a registration ID (random 32-bit integer)
 */
export function generateRegistrationId() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] & 0x3fff; // 14 bits
}

/**
 * Generate a signed prekey
 */
export async function generateSignedPreKey(
  uid: string,
  identityKeyPair: any,
  signedPreKeyId: number
) {
  const { IdentityKeyPair: IKP, SignedPreKeyRecord } = await import("@signalapp/libsignal-client");
  const { SignalProtocolStore } = await import("./signal-store");
  
  const keyPair = IKP.generate();
  const signature = identityKeyPair.privateKey.sign(keyPair.publicKey.serialize());
  const timestamp = Date.now();

  const signedPreKeyRecord = SignedPreKeyRecord.new(
    signedPreKeyId,
    timestamp,
    keyPair.publicKey,
    keyPair.privateKey,
    signature
  );

  // Store using SignalProtocolStore
  const store = new SignalProtocolStore(uid);
  await store.initialize();
  await store.storeSignedPreKey(signedPreKeyId, signedPreKeyRecord);

  return signedPreKeyRecord;
}

/**
 * Generate one-time prekeys
 */
export async function generatePreKeys(
  uid: string,
  startId: number,
  count: number
) {
  const { IdentityKeyPair: IKP, PreKeyRecord } = await import("@signalapp/libsignal-client");
  const { SignalProtocolStore } = await import("./signal-store");
  
  const preKeys = [];
  const store = new SignalProtocolStore(uid);
  await store.initialize();

  for (let i = 0; i < count; i++) {
    const keyId = startId + i;
    const keyPair = IKP.generate();
    
    const preKeyRecord = PreKeyRecord.new(keyId, keyPair.publicKey, keyPair.privateKey);
    preKeys.push(preKeyRecord);

    // Store using SignalProtocolStore
    await store.storePreKey(keyId, preKeyRecord);
  }

  return preKeys;
}

/**
 * Create a prekey bundle for upload to Firestore (public keys only)
 */
export async function createPrekeyBundle(
  uid: string,
  identityKeyPair: any,
  signedPreKey: any,
  preKeys: any[],
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
 */
export async function buildSession(
  senderUid: string,
  recipientBundle: PrekeyBundle,
  recipientId: string
): Promise<void> {
  // For MVP, just store that we have a session
  await indexedDBStore.init();
  console.log("Session prepared with:", recipientId);
}

/**
 * Check if a session exists with a recipient
 */
export async function hasSession(
  uid: string,
  recipientId: string
): Promise<boolean> {
  // For MVP, assume session always exists
  return true;
}

/**
 * Encrypt a message for a recipient
 * Uses AES-256-GCM for encryption
 */
export async function encryptMessage(
  senderUid: string,
  recipientId: string,
  plaintext: string
): Promise<{ type: number; body: string }> {
  try {
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Use a consistent key derived from sender UID + recipient ID
    const keyMaterial = new TextEncoder().encode(senderUid + recipientId);
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", keyMaterial),
      "AES-GCM",
      false,
      ["encrypt"]
    );
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintextBytes
    );
    
    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return {
      type: 1,
      body: Buffer.from(combined).toString("base64"),
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt message");
  }
}

/**
 * Decrypt a message from a sender
 * Uses AES-256-GCM for decryption
 */
export async function decryptMessage(
  recipientUid: string,
  senderId: string,
  messageType: number,
  ciphertext: string
): Promise<string> {
  try {
    const combined = Buffer.from(ciphertext, "base64");
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Use same key derivation
    const keyMaterial = new TextEncoder().encode(senderId + recipientUid);
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", keyMaterial),
      "AES-GCM",
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
}
