/**
 * WebCrypto Compatibility Check
 * Verifies that the browser supports required cryptographic APIs
 */

export interface CompatibilityReport {
  compatible: boolean;
  webCrypto: boolean;
  indexedDB: boolean;
  errors: string[];
}

export async function checkCryptoCompatibility(): Promise<CompatibilityReport> {
  const errors: string[] = [];
  let compatible = true;

  // Check WebCrypto API
  const webCrypto = typeof window !== "undefined" && 
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined";
  
  if (!webCrypto) {
    compatible = false;
    errors.push("WebCrypto API not available. Please use a modern browser with HTTPS.");
  }

  // Check IndexedDB
  const indexedDB = typeof window !== "undefined" && 
    typeof window.indexedDB !== "undefined";
  
  if (!indexedDB) {
    compatible = false;
    errors.push("IndexedDB not available. Private key storage will not work.");
  }

  // Check for secure context (HTTPS or localhost)
  if (typeof window !== "undefined" && !window.isSecureContext) {
    compatible = false;
    errors.push("Not in secure context. HTTPS is required for cryptographic operations.");
  }

  return {
    compatible,
    webCrypto,
    indexedDB,
    errors,
  };
}

export async function ensureCompatibility(): Promise<void> {
  const report = await checkCryptoCompatibility();
  
  if (!report.compatible) {
    throw new Error(
      `Cryptographic environment not compatible:\n${report.errors.join("\n")}`
    );
  }
}
