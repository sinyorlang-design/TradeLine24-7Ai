import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https:"],
      "frame-ancestors": ["'none'"]
    }
  }
}));
app.use(compression());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

const distDir = path.resolve(__dirname, "dist");
const indexHtml = path.join(distDir, "index.html");

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => res.status(fs.existsSync(indexHtml) ? 200 : 503).send(fs.existsSync(indexHtml) ? "ready" : "not-ready"));

app.use(express.static(distDir, {
  index: "index.html",
  extensions: ["html"],
  setHeaders(res, filePath) {
    const name = path.basename(filePath);
    if (name === "index.html") res.setHeader("Cache-Control", "no-store");
    else if (/\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

app.get("*", (req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(indexHtml);
});

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`✅ Server listening on http://${HOST}:${PORT}`));
