// Polyfill for libsignal-client browser compatibility
if (typeof globalThis !== "undefined") {
  if (!globalThis.process) {
    (globalThis as any).process = {
      env: {},
      versions: { node: "" },
      platform: "browser",
    };
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
