/**
 * IndexedDB Storage for Private Key Material
 * Stores identity keys, signed prekeys, one-time prekeys, and session data
 * NEVER syncs to server - local only
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import type {
  StoredIdentityKeyPair,
  StoredSignedPreKey,
  StoredPreKey,
  StoredSession,
} from "@shared/schema";

interface SignalDB extends DBSchema {
  identity: {
    key: string; // uid
    value: StoredIdentityKeyPair;
  };
  signedPreKeys: {
    key: string; // `${uid}:${keyId}`
    value: StoredSignedPreKey;
    indexes: { "by-uid": string };
  };
  preKeys: {
    key: string; // `${uid}:${keyId}`
    value: StoredPreKey;
    indexes: { "by-uid": string };
  };
  sessions: {
    key: string; // `${uid}:${recipientId}:${deviceId}`
    value: StoredSession;
    indexes: { "by-uid": string; "by-recipient": string };
  };
  registrationId: {
    key: string; // uid
    value: number;
  };
}

class IndexedDBStore {
  private db: IDBPDatabase<SignalDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<SignalDB>("signal-store", 1, {
      upgrade(db) {
        // Identity key pair store
        if (!db.objectStoreNames.contains("identity")) {
          db.createObjectStore("identity");
        }

        // Signed prekeys store
        if (!db.objectStoreNames.contains("signedPreKeys")) {
          const signedPreKeysStore = db.createObjectStore("signedPreKeys");
          signedPreKeysStore.createIndex("by-uid", "uid");
        }

        // One-time prekeys store
        if (!db.objectStoreNames.contains("preKeys")) {
          const preKeysStore = db.createObjectStore("preKeys");
          preKeysStore.createIndex("by-uid", "uid");
        }

        // Session store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionsStore = db.createObjectStore("sessions");
          sessionsStore.createIndex("by-uid", "uid");
          sessionsStore.createIndex("by-recipient", "recipientId");
        }

        // Registration ID store
        if (!db.objectStoreNames.contains("registrationId")) {
          db.createObjectStore("registrationId");
        }
      },
    });
  }

  private ensureDB(): IDBPDatabase<SignalDB> {
    if (!this.db) {
      throw new Error("IndexedDB not initialized. Call init() first.");
    }
    return this.db;
  }

  // Identity Key Pair
  async storeIdentityKeyPair(uid: string, keyPair: StoredIdentityKeyPair): Promise<void> {
    const db = this.ensureDB();
    await db.put("identity", keyPair, uid);
  }

  async getIdentityKeyPair(uid: string): Promise<StoredIdentityKeyPair | undefined> {
    const db = this.ensureDB();
    return await db.get("identity", uid);
  }

  // Registration ID
  async storeRegistrationId(uid: string, id: number): Promise<void> {
    const db = this.ensureDB();
    await db.put("registrationId", id, uid);
  }

  async getRegistrationId(uid: string): Promise<number | undefined> {
    const db = this.ensureDB();
    return await db.get("registrationId", uid);
  }

  // Signed PreKey
  async storeSignedPreKey(uid: string, preKey: StoredSignedPreKey): Promise<void> {
    const db = this.ensureDB();
    const key = `${uid}:${preKey.keyId}`;
    await db.put("signedPreKeys", preKey, key);
  }

  async getSignedPreKey(uid: string, keyId: number): Promise<StoredSignedPreKey | undefined> {
    const db = this.ensureDB();
    const key = `${uid}:${keyId}`;
    return await db.get("signedPreKeys", key);
  }

  async getLatestSignedPreKey(uid: string): Promise<StoredSignedPreKey | undefined> {
    const db = this.ensureDB();
    const keys = await db.getAllFromIndex("signedPreKeys", "by-uid", uid);
    if (keys.length === 0) return undefined;
    // Return the most recent one
    return keys.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  // One-Time PreKeys
  async storePreKey(uid: string, preKey: StoredPreKey): Promise<void> {
    const db = this.ensureDB();
    const key = `${uid}:${preKey.keyId}`;
    await db.put("preKeys", preKey, key);
  }

  async getPreKey(uid: string, keyId: number): Promise<StoredPreKey | undefined> {
    const db = this.ensureDB();
    const key = `${uid}:${keyId}`;
    return await db.get("preKeys", key);
  }

  async removePreKey(uid: string, keyId: number): Promise<void> {
    const db = this.ensureDB();
    const key = `${uid}:${keyId}`;
    await db.delete("preKeys", key);
  }

  async getAllPreKeys(uid: string): Promise<StoredPreKey[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex("preKeys", "by-uid", uid);
  }

  // Sessions
  async storeSession(uid: string, session: StoredSession): Promise<void> {
    const db = this.ensureDB();
    const key = `${uid}:${session.recipientId}:${session.deviceId}`;
    await db.put("sessions", session, key);
  }

  async getSession(
    uid: string,
    recipientId: string,
    deviceId: number
  ): Promise<StoredSession | undefined> {
    const db = this.ensureDB();
    const key = `${uid}:${recipientId}:${deviceId}`;
    return await db.get("sessions", key);
  }

  async removeSession(uid: string, recipientId: string, deviceId: number): Promise<void> {
    const db = this.ensureDB();
    const key = `${uid}:${recipientId}:${deviceId}`;
    await db.delete("sessions", key);
  }

  async getAllSessions(uid: string): Promise<StoredSession[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex("sessions", "by-uid", uid);
  }
}

export const indexedDBStore = new IndexedDBStore();
