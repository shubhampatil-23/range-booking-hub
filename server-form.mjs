#!/usr/bin/env node
/**
 * Serves the built app at /form/ for local testing.
 * Run: npm run build && node server-form.mjs
 * Then open http://localhost:8080/form/
 */
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 4173;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  let path = req.url?.split("?")[0] || "/";

  // Serve /form/ and /form with index.html
  if (path === "/form" || path === "/form/") {
    path = "/form/index.html";
  }

  // Map /form/assets/* to dist/assets/*
  if (path.startsWith("/form/assets/")) {
    path = path.replace("/form", "");
  }
  // Map /form/config.json to dist/config.json
  if (path === "/form/config.json") {
    path = "/config.json";
  }

  const filePath = join(__dirname, "dist", path === "/form/index.html" ? "index.html" : path.slice(1));
  const ext = extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const data = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime });
  res.end(data);
});

server.listen(PORT, () => {
  console.log(`Serving at http://localhost:${PORT}/form/`);
});
