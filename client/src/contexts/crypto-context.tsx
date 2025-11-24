import { createContext, useContext, useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./auth-context";
import { indexedDBStore } from "@/lib/crypto/indexeddb-store";
import {
  checkCryptoCompatibility,
  ensureCompatibility,
  type CompatibilityReport,
} from "@/lib/crypto/compatibility";
import {
  initializeUserCrypto,
  getIdentityKeyPair,
} from "@/lib/crypto/signal-protocol";
import type { PrekeyBundle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CryptoContextType {
  initialized: boolean;
  loading: boolean;
  compatible: boolean;
  compatibilityReport: CompatibilityReport | null;
  initializeCrypto: () => Promise<void>;
  getPublicFingerprint: () => Promise<string | null>;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compatible, setCompatible] = useState(false);
  const [compatibilityReport, setCompatibilityReport] = useState<CompatibilityReport | null>(null);

  // Check crypto compatibility on mount
  useEffect(() => {
    const checkCompat = async () => {
      const report = await checkCryptoCompatibility();
      setCompatibilityReport(report);
      setCompatible(report.compatible);

      if (!report.compatible) {
        toast({
          variant: "destructive",
          title: "Cryptography not supported",
          description: report.errors.join(". "),
          duration: 10000,
        });
      }
    };

    checkCompat();
  }, []);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const initDB = async () => {
      try {
        await indexedDBStore.init();
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
        toast({
          variant: "destructive",
          title: "Storage initialization failed",
          description: "Could not initialize secure storage",
        });
      }
    };

    initDB();
  }, []);

  // Check if crypto is initialized for current user
  useEffect(() => {
    const checkInitialized = async () => {
      if (!currentUser || !compatible) {
        setLoading(false);
        return;
      }

      try {
        // Check if identity key exists in IndexedDB
        const identityKey = await getIdentityKeyPair(currentUser.uid);
        
        if (identityKey) {
          setInitialized(true);
        } else {
          // Check if prekey bundle exists in Firestore (backup check)
          const prekeyDoc = await getDoc(doc(db, "users", currentUser.uid, "crypto", "prekeys"));
          setInitialized(prekeyDoc.exists());
        }
      } catch (error) {
        console.error("Error checking crypto initialization:", error);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    checkInitialized();
  }, [currentUser, compatible]);

  const initializeCrypto = async () => {
    if (!currentUser) {
      throw new Error("No user logged in");
    }

    try {
      await ensureCompatibility();
      setLoading(true);

      // Generate keys and create prekey bundle
      const bundle = await initializeUserCrypto(currentUser.uid);

      // Upload prekey bundle to Firestore (public keys only)
      await setDoc(doc(db, "users", currentUser.uid, "crypto", "prekeys"), bundle);

      setInitialized(true);
      
      toast({
        title: "Encryption keys generated",
        description: "Your account is now protected with end-to-end encryption",
      });
    } catch (error: any) {
      console.error("Failed to initialize crypto:", error);
      toast({
        variant: "destructive",
        title: "Encryption setup failed",
        description: error.message || "Failed to generate encryption keys",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPublicFingerprint = async (): Promise<string | null> => {
    if (!currentUser) return null;

    try {
      const identityKey = await getIdentityKeyPair(currentUser.uid);
      if (!identityKey) return null;

      // Create SHA-256 hash of public key for fingerprint
      const publicKeyBytes = identityKey.publicKey.serialize();
      const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprint = hashArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      return fingerprint;
    } catch (error) {
      console.error("Failed to get fingerprint:", error);
      return null;
    }
  };

  const value = {
    initialized,
    loading,
    compatible,
    compatibilityReport,
    initializeCrypto,
    getPublicFingerprint,
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (!context) {
    throw new Error("useCrypto must be used within CryptoProvider");
  }
  return context;
}
