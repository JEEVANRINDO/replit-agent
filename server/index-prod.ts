import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  // Get the directory of THIS file (dist/)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // On Vercel: __dirname = /var/task (or similar)
  // Vite outputs to dist/public/
  // So public/ should be at __dirname + /public
  const staticPath = path.join(__dirname, "public");

  app.use(express.static(staticPath));

  // SPA fallback
  app.use("*", (_req, res) => {
    const indexFile = path.join(staticPath, "index.html");
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send("SecureChat - App files not found");
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
