// Polyfill for libsignal-client browser compatibility
if (typeof window !== "undefined" && !window.process) {
  (window as any).process = {
    env: {},
    versions: { node: "" },
    platform: "browser",
  };
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
