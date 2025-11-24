import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  // On Vercel, dist/ contains both index.js (server) and public/ (static files)
  // The bundled code's import.meta.dirname points to dist/
  // So we look for public/ relative to that, or in common locations
  
  const possiblePaths = [
    // When running with npm start (dist/index.js from root)
    path.join(process.cwd(), "dist", "public"),
    // When bundled server's dirname is dist/
    path.join(import.meta.dirname, "public"),
    // Fallback - just try dist/
    import.meta.dirname,
  ];

  let staticPath = "";
  for (const checkPath of possiblePaths) {
    const indexPath = path.join(checkPath, "index.html");
    if (fs.existsSync(indexPath)) {
      staticPath = checkPath;
      console.log(`✓ Found static files at: ${staticPath}`);
      break;
    }
  }

  if (!staticPath) {
    // Last resort - use first path and hope it works
    staticPath = possiblePaths[1];
    console.log(`⚠ Using default path: ${staticPath}`);
  }

  // Serve static files
  app.use(express.static(staticPath));

  // SPA fallback - route all requests to index.html
  app.use("*", (_req, res) => {
    const indexPath = path.join(staticPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>SecureChat</title></head>
          <body>
            <h1>SecureChat - E2EE Messaging</h1>
            <p>App loading... If this persists, the build may be incomplete.</p>
          </body>
        </html>
      `);
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
