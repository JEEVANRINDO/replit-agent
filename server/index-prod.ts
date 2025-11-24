import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  // Try multiple possible paths for static files
  const possiblePaths = [
    path.join(process.cwd(), "public"),           // Vercel deployment structure
    path.join(process.cwd(), "dist", "public"),   // Local/Replit structure
    path.resolve(import.meta.dirname, "public"),  // Relative to bundled server
  ];

  let distPath = possiblePaths[0];
  for (const checkPath of possiblePaths) {
    if (fs.existsSync(checkPath)) {
      distPath = checkPath;
      console.log(`Found static files at: ${distPath}`);
      break;
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found");
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
