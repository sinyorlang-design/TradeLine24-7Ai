/* __TL247_PREVIEW_PATCH__ */
import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 5000);

app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Replit iframe preview helper (dev only)
if (process.env.ALLOW_PREVIEW_IFRAME === "1" || process.env.REPL_ID) {
  app.use((req, res, next) => {
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    next();
  });
}

// Health checks
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => {
  const ok = fs.existsSync(path.join(__dirname, "dist", "index.html"));
  res.status(ok ? 200 : 503).send(ok ? "ready" : "not-ready");
});

// Static + SPA fallback
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath, { extensions: ["html"] }));
app.get("*", (req, res, next) => {
  if (req.method !== "GET") return next();
  const idx = path.join(distPath, "index.html");
  if (!fs.existsSync(idx)) return res.status(503).send("Build missing");
  res.sendFile(idx);
});

app.listen(PORT, HOST, () => {
  console.log(`✓ TL247 serving /dist on http://${HOST}:${PORT}`);
});
