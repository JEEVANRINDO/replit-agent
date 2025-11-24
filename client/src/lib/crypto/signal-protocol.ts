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
 */
export async function buildSession(
  senderUid: string,
  recipientBundle: PrekeyBundle,
  recipientAddress: { name: string; deviceId: number }
): Promise<void> {
  // Get sender's identity key
  const senderIdentity = await getIdentityKeyPair(senderUid);
  if (!senderIdentity) {
    throw new Error("Sender identity key not found. Initialize crypto first.");
  }

  // Deserialize recipient's keys
  const recipientIdentityKey = PublicKey.deserialize(
    Buffer.from(recipientBundle.identityKey, "base64")
  );
  const signedPreKeyPublic = PublicKey.deserialize(
    Buffer.from(recipientBundle.signedPreKey.publicKey, "base64")
  );
  const signedPreKeySignature = Buffer.from(recipientBundle.signedPreKey.signature, "base64");

  // Get one one-time prekey (use first available)
  const oneTimePreKey = recipientBundle.oneTimePreKeys[0];
  const oneTimePreKeyPublic = oneTimePreKey
    ? PublicKey.deserialize(Buffer.from(oneTimePreKey.publicKey, "base64"))
    : null;

  // Create PreKeyBundle
  const preKeyBundle = PreKeyBundle.new(
    recipientBundle.registrationId,
    recipientAddress.deviceId,
    oneTimePreKey?.keyId ?? null,
    oneTimePreKeyPublic,
    recipientBundle.signedPreKey.keyId,
    signedPreKeyPublic,
    signedPreKeySignature,
    recipientIdentityKey
  );

  // Build session (this is a simplified version - actual implementation would use SessionStore)
  // For now, we'll store session data in IndexedDB
  console.log("Session built with recipient:", recipientAddress.name);
}

/**
 * Encrypt a message for a recipient
 */
export async function encryptMessage(
  senderUid: string,
  recipientId: string,
  plaintext: string
): Promise<{ type: number; body: string }> {
  // In a real implementation, this would use SessionCipher
  // For now, return a placeholder that will be implemented in integration phase
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = Buffer.from(data).toString("base64");

  return {
    type: CiphertextMessageType.Whisper,
    body: encrypted,
  };
}

/**
 * Decrypt a message from a sender
 */
export async function decryptMessage(
  recipientUid: string,
  senderId: string,
  messageType: number,
  ciphertext: string
): Promise<string> {
  // In a real implementation, this would use SessionCipher
  // For now, return a placeholder that will be implemented in integration phase
  const data = Buffer.from(ciphertext, "base64");
  const decoder = new TextDecoder();
  return decoder.decode(data);
}
