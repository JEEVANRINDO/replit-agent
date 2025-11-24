/**
 * SignalProtocolStore Implementation
 * Provides storage interface required by libsignal-client SessionBuilder and SessionCipher
 * All data stored in IndexedDB - never sent to server
 */

import { indexedDBStore } from "./indexeddb-store";

export class SignalProtocolStore {
  private uid: string;
  private identityKeyPair: any = null;
  private registrationId: number | null = null;

  constructor(uid: string) {
    this.uid = uid;
  }

  /**
   * Initialize the store by loading identity key and registration ID
   */
  async initialize(): Promise<void> {
    const { PublicKey, PrivateKey, IdentityKeyPair } = await import("@signalapp/libsignal-client");
    
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
  async getIdentityKeyPair() {
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
   * Load a prekey record
   */
  async loadPreKey(preKeyId: number) {
    const { PreKeyRecord, PublicKey, PrivateKey } = await import("@signalapp/libsignal-client");
    
    const stored = await indexedDBStore.getPreKey(this.uid, preKeyId);
    if (!stored) {
      throw new Error(`PreKey ${preKeyId} not found`);
    }

    const publicKey = PublicKey.deserialize(Buffer.from(stored.keyPair.pubKey));
    const privateKey = PrivateKey.deserialize(Buffer.from(stored.keyPair.privKey));
    
    return PreKeyRecord.new(preKeyId, publicKey, privateKey);
  }

  /**
   * Store a prekey record
   */
  async storePreKey(preKeyId: number, record: any): Promise<void> {
    await indexedDBStore.storePreKey(this.uid, {
      keyId: preKeyId,
      keyPair: {
        pubKey: record.publicKey().serialize(),
        privKey: record.privateKey().serialize(),
      },
    });
  }

  /**
   * Check if prekey exists
   */
  async containsPreKey(preKeyId: number): Promise<boolean> {
    const stored = await indexedDBStore.getPreKey(this.uid, preKeyId);
    return stored !== undefined;
  }

  /**
   * Remove a used prekey
   */
  async removePreKey(preKeyId: number): Promise<void> {
    await indexedDBStore.removePreKey(this.uid, preKeyId);
  }

  /**
   * Load signed prekey record
   */
  async loadSignedPreKey(signedPreKeyId: number) {
    const { SignedPreKeyRecord, PublicKey, PrivateKey } = await import("@signalapp/libsignal-client");
    
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
   * Store signed prekey record
   */
  async storeSignedPreKey(signedPreKeyId: number, record: any): Promise<void> {
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
   * Check if signed prekey exists
   */
  async containsSignedPreKey(signedPreKeyId: number): Promise<boolean> {
    const stored = await indexedDBStore.getSignedPreKey(this.uid, signedPreKeyId);
    return stored !== undefined;
  }

  /**
   * Load a session record by ProtocolAddress
   */
  async loadSession(address: any) {
    const { SessionRecord } = await import("@signalapp/libsignal-client");
    
    const recipientId = address.name();
    const deviceId = address.deviceId();
    
    const stored = await indexedDBStore.getSession(this.uid, recipientId, deviceId);
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
   * Store a session record by ProtocolAddress
   */
  async storeSession(address: any, record: any): Promise<void> {
    const recipientId = address.name();
    const deviceId = address.deviceId();
    const serialized = record.serialize();
    
    await indexedDBStore.storeSession(this.uid, {
      recipientId,
      deviceId,
      record: serialized,
    });
  }

  /**
   * Check if a session exists by ProtocolAddress
   */
  async containsSession(address: any): Promise<boolean> {
    const session = await this.loadSession(address);
    return session !== null && session.hasCurrentState();
  }

  /**
   * Remove a session by ProtocolAddress
   */
  async removeSession(address: any): Promise<void> {
    const recipientId = address.name();
    const deviceId = address.deviceId();
    await indexedDBStore.removeSession(this.uid, recipientId, deviceId);
  }

  /**
   * Save identity
   */
  async saveIdentity(address: any, identityKey: any): Promise<boolean> {
    return true;
  }

  /**
   * Check if identity is trusted
   */
  async isTrustedIdentity(address: any, identityKey: any): Promise<boolean> {
    return true;
  }

  /**
   * Get identity
   */
  async getIdentity(address: any) {
    return null;
  }
}
