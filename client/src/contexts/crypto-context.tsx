import { createContext, useContext, useState } from "react";

interface CryptoContextType {
  initialized: boolean;
  loading: boolean;
  compatible: boolean;
  initializeCrypto: () => Promise<void>;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [initialized] = useState(true);
  const [loading] = useState(false);
  const [compatible] = useState(true);

  const initializeCrypto = async () => {
    // Stub implementation - crypto initialization is handled by encryption logic
    return Promise.resolve();
  };

  const value = {
    initialized,
    loading,
    compatible,
    initializeCrypto,
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
