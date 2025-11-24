import { z } from "zod";

// User schema for Firebase Auth + Firestore user data
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  createdAt: z.number(),
});

export type User = z.infer<typeof userSchema>;

// Prekey bundle schema (public keys only - stored in Firestore)
export const prekeyBundleSchema = z.object({
  identityKey: z.string(), // Base64 encoded public identity key
  signedPreKey: z.object({
    keyId: z.number(),
    publicKey: z.string(), // Base64 encoded
    signature: z.string(), // Base64 encoded
  }),
  oneTimePreKeys: z.array(z.object({
    keyId: z.number(),
    publicKey: z.string(), // Base64 encoded
  })),
  registrationId: z.number(),
});

export type PrekeyBundle = z.infer<typeof prekeyBundleSchema>;

// Message schema (encrypted - stored in Firestore)
export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  recipientId: z.string(),
  type: z.number(), // Signal message type
  body: z.string(), // Base64 encoded encrypted message
  timestamp: z.number(),
  deviceId: z.number().optional(),
});

export type Message = z.infer<typeof messageSchema>;

// Chat/Conversation schema
export const chatSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()), // Array of UIDs
  lastMessage: z.object({
    text: z.string(),
    timestamp: z.number(),
    senderId: z.string(),
  }).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Chat = z.infer<typeof chatSchema>;

// Decrypted message (for display in UI)
export interface DecryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  isSent?: boolean;
  isDelivered?: boolean;
}

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// IndexedDB stored data (private keys - never sent to server)
export interface StoredIdentityKeyPair {
  pubKey: ArrayBuffer;
  privKey: ArrayBuffer;
}

export interface StoredSignedPreKey {
  keyId: number;
  keyPair: {
    pubKey: ArrayBuffer;
    privKey: ArrayBuffer;
  };
  signature: ArrayBuffer;
  timestamp: number;
}

export interface StoredPreKey {
  keyId: number;
  keyPair: {
    pubKey: ArrayBuffer;
    privKey: ArrayBuffer;
  };
}

export interface StoredSession {
  recipientId: string;
  deviceId: number;
  record: ArrayBuffer;
}
