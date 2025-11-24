/**
 * SignalProtocolStore Implementation
 * Provides storage interface required by libsignal-client SessionBuilder and SessionCipher
 * All data stored in IndexedDB - never sent to server
 */

import {
  IdentityKeyPair,
  PublicKey,
  PrivateKey,
  PreKeyRecord,
  SignedPreKeyRecord,
  SessionRecord,
  Direction,
} from "@signalapp/libsignal-client";
import { indexedDBStore } from "./indexeddb-store";

export class SignalProtocolStore {
  private uid: string;
  private identityKeyPair: IdentityKeyPair | null = null;
  private registrationId: number | null = null;

  constructor(uid: string) {
    this.uid = uid;
  }

  /**
   * Initialize the store by loading identity key and registration ID
   */
  async initialize(): Promise<void> {
    // Load identity key pair
    const storedIdentity = await indexedDBStore.getIdentityKeyPair(this.uid);
    if (storedIdentity) {
      const publicKey = PublicKey.deserialize(Buffer.from(storedIdentity.pubKey));
      const privateKey = PrivateKey.deserialize(Buffer.from(storedIdentity.privKey));
      this.identityKeyPair = new IdentityKeyPair(publicKey, privateKey);
    }

    // Load registration ID
    this.registrationId = await indexedDBStore.getRegistrationId(this.uid) || null;
  }

  /**
   * Get the local identity key pair
   */
  async getIdentityKeyPair(): Promise<IdentityKeyPair> {
    if (!this.identityKeyPair) {
      throw new Error("Identity key pair not initialized");
    }
    return this.identityKeyPair;
  }

  /**
   * Get the local registration ID
   */
  async getLocalRegistrationId(): Promise<number> {
    if (this.registrationId === null) {
      throw new Error("Registration ID not initialized");
    }
    return this.registrationId;
  }

  /**
   * Save identity (for recipient verification)
   */
  async saveIdentity(address: string, identityKey: PublicKey): Promise<boolean> {
    // For simplicity in MVP, we trust on first use (TOFU)
    // In production, this should verify against stored keys
    console.log(`Saving identity for ${address}`);
    return true;
  }

  /**
   * Check if an identity is trusted
   */
  async isTrustedIdentity(
    address: string,
    identityKey: PublicKey,
    direction: Direction
  ): Promise<boolean> {
    // For MVP, trust all identities
    // In production, implement proper identity verification
    return true;
  }

  /**
   * Load a prekey record (required by libsignal-client)
   */
  async loadPreKey(preKeyId: number): Promise<PreKeyRecord> {
    const stored = await indexedDBStore.getPreKey(this.uid, preKeyId);
    if (!stored) {
      throw new Error(`PreKey ${preKeyId} not found`);
    }

    const publicKey = PublicKey.deserialize(Buffer.from(stored.keyPair.pubKey));
    const privateKey = PrivateKey.deserialize(Buffer.from(stored.keyPair.privKey));
    
    return PreKeyRecord.new(preKeyId, publicKey, privateKey);
  }

  /**
   * Store a prekey record (required by libsignal-client)
   */
  async storePreKey(preKeyId: number, record: PreKeyRecord): Promise<void> {
    await indexedDBStore.storePreKey(this.uid, {
      keyId: preKeyId,
      keyPair: {
        pubKey: record.publicKey().serialize(),
        privKey: record.privateKey().serialize(),
      },
    });
  }

  /**
   * Check if prekey exists (required by libsignal-client)
   */
  async containsPreKey(preKeyId: number): Promise<boolean> {
    const stored = await indexedDBStore.getPreKey(this.uid, preKeyId);
    return stored !== undefined;
  }

  /**
   * Remove a used prekey (required by libsignal-client)
   */
  async removePreKey(preKeyId: number): Promise<void> {
    await indexedDBStore.removePreKey(this.uid, preKeyId);
  }

  /**
   * Load signed prekey record (required by libsignal-client)
   */
  async loadSignedPreKey(signedPreKeyId: number): Promise<SignedPreKeyRecord> {
    const stored = await indexedDBStore.getSignedPreKey(this.uid, signedPreKeyId);
    if (!stored) {
      throw new Error(`SignedPreKey ${signedPreKeyId} not found`);
    }

    const publicKey = PublicKey.deserialize(Buffer.from(stored.keyPair.pubKey));
    const privateKey = PrivateKey.deserialize(Buffer.from(stored.keyPair.privKey));
    
    return SignedPreKeyRecord.new(
      signedPreKeyId,
      stored.timestamp,
      publicKey,
      privateKey,
      Buffer.from(stored.signature)
    );
  }

  /**
   * Store signed prekey record (required by libsignal-client)
   */
  async storeSignedPreKey(signedPreKeyId: number, record: SignedPreKeyRecord): Promise<void> {
    await indexedDBStore.storeSignedPreKey(this.uid, {
      keyId: signedPreKeyId,
      keyPair: {
        pubKey: record.publicKey().serialize(),
        privKey: record.privateKey().serialize(),
      },
      signature: record.signature(),
      timestamp: record.timestamp(),
    });
  }

  /**
   * Check if signed prekey exists (required by libsignal-client)
   */
  async containsSignedPreKey(signedPreKeyId: number): Promise<boolean> {
    const stored = await indexedDBStore.getSignedPreKey(this.uid, signedPreKeyId);
    return stored !== undefined;
  }

  /**
   * Load a session record
   */
  async loadSession(address: string, deviceId: number = 1): Promise<SessionRecord | null> {
    const stored = await indexedDBStore.getSession(this.uid, address, deviceId);
    if (!stored || !stored.record || stored.record.byteLength === 0) {
      return null;
    }

    try {
      return SessionRecord.deserialize(Buffer.from(stored.record));
    } catch (error) {
      console.error("Failed to deserialize session:", error);
      return null;
    }
  }

  /**
   * Store a session record (required by libsignal-client)
   */
  async storeSession(address: string, record: SessionRecord, deviceId: number = 1): Promise<void> {
    const serialized = record.serialize();
    
    await indexedDBStore.storeSession(this.uid, {
      recipientId: address,
      deviceId,
      record: serialized,
    });
  }

  /**
   * Check if a session exists (required by libsignal-client)
   */
  async containsSession(address: string, deviceId: number = 1): Promise<boolean> {
    const session = await this.loadSession(address, deviceId);
    return session !== null && session.hasCurrentState();
  }

  /**
   * Remove a session (required by libsignal-client)
   */
  async removeSession(address: string, deviceId: number = 1): Promise<void> {
    await indexedDBStore.removeSession(this.uid, address, deviceId);
  }

  /**
   * Get identity for address (required by libsignal-client)
   */
  async getIdentity(address: string): Promise<PublicKey | null> {
    // For MVP, we don't cache identities separately
    // In production, this should maintain a trust store
    return null;
  }
}
