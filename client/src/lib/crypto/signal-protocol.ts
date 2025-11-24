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
  const { SignalProtocolStore } = await import("./signal-store");
  
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
): Promise<PreKeyRecord[]> {
  const { SignalProtocolStore } = await import("./signal-store");
  
  const preKeys: PreKeyRecord[] = [];
  const store = new SignalProtocolStore(uid);
  await store.initialize();

  for (let i = 0; i < count; i++) {
    const keyId = startId + i;
    const keyPair = IdentityKeyPair.generate();
    
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
 * Uses Signal's SessionBuilder to establish a proper session
 */
export async function buildSession(
  senderUid: string,
  recipientBundle: PrekeyBundle,
  recipientId: string
): Promise<void> {
  const { SignalProtocolStore } = await import("./signal-store");
  const { SessionBuilder, PreKeyBundle, PublicKey } = await import("@signalapp/libsignal-client");

  // Initialize store
  const store = new SignalProtocolStore(senderUid);
  await store.initialize();

  // Deserialize recipient's public keys
  const identityKey = PublicKey.deserialize(
    Buffer.from(recipientBundle.identityKey, "base64")
  );
  const signedPreKeyPublic = PublicKey.deserialize(
    Buffer.from(recipientBundle.signedPreKey.publicKey, "base64")
  );
  const signedPreKeySignature = Buffer.from(
    recipientBundle.signedPreKey.signature,
    "base64"
  );

  // Get one-time prekey if available
  const oneTimePreKey = recipientBundle.oneTimePreKeys[0];
  const oneTimePreKeyId = oneTimePreKey?.keyId ?? null;
  const oneTimePreKeyPublic = oneTimePreKey
    ? PublicKey.deserialize(Buffer.from(oneTimePreKey.publicKey, "base64"))
    : null;

  // Create PreKeyBundle
  const preKeyBundle = PreKeyBundle.new(
    recipientBundle.registrationId,
    1, // deviceId
    oneTimePreKeyId,
    oneTimePreKeyPublic,
    recipientBundle.signedPreKey.keyId,
    signedPreKeyPublic,
    signedPreKeySignature,
    identityKey
  );

  // Use SessionBuilder to process the bundle
  const builder = SessionBuilder.new(
    store as any, // Type assertion for compatibility
    {
      name: recipientId,
      deviceId: 1,
    }
  );

  await builder.processPreKeyBundle(preKeyBundle);

  console.log("Session established with:", recipientId);
}

/**
 * Check if a session exists with a recipient
 */
export async function hasSession(
  uid: string,
  recipientId: string
): Promise<boolean> {
  const { SignalProtocolStore } = await import("./signal-store");
  
  const store = new SignalProtocolStore(uid);
  await store.initialize();
  
  return await store.containsSession(recipientId, 1);
}

/**
 * Encrypt a message for a recipient using SessionCipher
 * Proper Signal protocol encryption with Double Ratchet
 */
export async function encryptMessage(
  senderUid: string,
  recipientId: string,
  plaintext: string
): Promise<{ type: number; body: string }> {
  const { SignalProtocolStore } = await import("./signal-store");
  const { SessionCipher } = await import("@signalapp/libsignal-client");

  try {
    // Initialize store
    const store = new SignalProtocolStore(senderUid);
    await store.initialize();

    // Create SessionCipher
    const cipher = SessionCipher.new(
      store as any,
      {
        name: recipientId,
        deviceId: 1,
      }
    );

    // Encrypt the message
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const ciphertextMessage = await cipher.encrypt(Buffer.from(plaintextBytes));

    // Serialize the ciphertext
    const serialized = ciphertextMessage.serialize();

    return {
      type: ciphertextMessage.type(),
      body: Buffer.from(serialized).toString("base64"),
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt message");
  }
}

/**
 * Decrypt a message from a sender using SessionCipher
 * Proper Signal protocol decryption with Double Ratchet
 */
export async function decryptMessage(
  recipientUid: string,
  senderId: string,
  messageType: number,
  ciphertext: string
): Promise<string> {
  const { SignalProtocolStore } = await import("./signal-store");
  const { SessionCipher, CiphertextMessageType, PreKeySignalMessage, SignalMessage } = await import("@signalapp/libsignal-client");

  try {
    // Initialize store
    const store = new SignalProtocolStore(recipientUid);
    await store.initialize();

    // Create SessionCipher
    const cipher = SessionCipher.new(
      store as any,
      {
        name: senderId,
        deviceId: 1,
      }
    );

    // Deserialize ciphertext
    const ciphertextBytes = Buffer.from(ciphertext, "base64");

    // Decrypt based on message type
    let plaintextBytes: Buffer;
    if (messageType === CiphertextMessageType.PreKey) {
      const message = PreKeySignalMessage.deserialize(ciphertextBytes);
      plaintextBytes = await cipher.decryptPreKeySignalMessage(message);
    } else if (messageType === CiphertextMessageType.Whisper) {
      const message = SignalMessage.deserialize(ciphertextBytes);
      plaintextBytes = await cipher.decryptSignalMessage(message);
    } else {
      throw new Error(`Unsupported message type: ${messageType}`);
    }

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
}
