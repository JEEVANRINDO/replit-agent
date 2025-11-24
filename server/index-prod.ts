import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  // Vercel deploys dist/ folder as root
  // Vite outputs to dist/public/
  // So on Vercel, files are at ./public/ relative to running server
  
  const staticPath = path.join(process.cwd(), "public");

  app.use(express.static(staticPath));

  // SPA fallback - serve index.html for all routes
  app.use("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

(async () => {
  await runApp(serveStatic);
})();
