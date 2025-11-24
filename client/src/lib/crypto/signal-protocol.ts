/**
 * Crypto Protocol Implementation using Web Crypto API (AES-GCM)
 * Handles message encryption/decryption with AES-256-GCM
 */

import { indexedDBStore } from "./indexeddb-store";

/**
 * Build a session with a recipient using their prekey bundle
 */
export async function buildSession(
  senderUid: string,
  recipientBundle: any,
  recipientId: string
): Promise<void> {
  // For MVP, just mark that we have a session
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
    
    // Combine IV + ciphertext and convert to base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    // Convert to base64 string
    const base64 = btoa(String.fromCharCode(...combined));
    
    return {
      type: 1,
      body: base64,
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
    // Decode base64 string back to bytes
    const binaryString = atob(ciphertext);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
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
