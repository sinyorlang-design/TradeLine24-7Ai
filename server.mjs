// server.mjs
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const dist = path.join(__dirname, "dist");

// static assets (serve index manually to control SPA fallback)
app.use(express.static(dist, { maxAge: "1h", index: false }));

// health endpoints for deploys
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => res.status(200).send("ready"));

// ✅ SPA fallback (no "*" string; works on Express 4 & 5)
// exclude any API routes you might add later (adjust prefix as needed)
const nonApiSpa = /^\/(?!api\/).*/;
app.get(nonApiSpa, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(PORT, HOST, () =>
  console.log(`✓ Serving dist on http://${HOST}:${PORT}`)
);
// 1) parse Twilio form posts (put near your other app.use lines)
app.use(express.urlencoded({ extended: false }));

// 2) inbound + recording callback (put below /healthz and /readyz)
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || ""; // set this in env

app.post("/voice/answer", (req, res) => {
  const cb = PUBLIC_BASE_URL
    ? ` recordingStatusCallback="${PUBLIC_BASE_URL}/voice/recording-status" recordingStatusCallbackMethod="POST"`
    : "";
  res.type("text/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Your twenty four seven A I receptionist. Please leave your message after the beep.</Say>
  <Record playBeep="true" maxLength="120" timeout="5"${cb}/>
  <Say>We didn't catch a message. Goodbye.</Say>
  <Hangup/>
</Response>`
  );
});

app.post("/voice/recording-status", (req, res) => {
  console.log("Recording:",
    req.body.RecordingSid,
    req.body.RecordingUrl,
    req.body.RecordingStatus);
  res.sendStatus(200);
});









