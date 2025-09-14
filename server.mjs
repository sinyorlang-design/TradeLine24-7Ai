// server.mjs — TradeLine 24/7 hardened voice + static server (Node 18, ESM)
import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import twilioPkg from "twilio";
import path from "path";
import { fileURLToPath } from "url";

const { twiml: { VoiceResponse } } = twilioPkg;
const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

// ---- Security & middleware ----
app.disable("x-powered-by");
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://*.supabase.co", "wss:"],
      "frame-ancestors": isProd
        ? ["'self'"]
        : ["'self'", "https://*.replit.com", "https://*.repl.co", "https://*.replit.dev"]
    }
  }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limit only the Twilio ingress to avoid abuse
app.use("/voice", rateLimit({ windowMs: 30_000, max: 30 }));

// ---- Health & diagnostics ----
app.get("/healthz", (_req, res) => res.status(200).type("text/plain").send("OK"));
app.get("/readyz", (_req, res) => res.status(200).type("text/plain").send("READY"));
const lastCalls = [];
app.get("/twilioz", (_req, res) => res.json(lastCalls.slice(-5)));

// ---- Twilio Voice ingress (hairpin-safe bridge) ----
function e164(s) { return (s || "").replace(/[^\d+]/g, ""); }

app.post("/voice/inbound", (req, res) => {
  const r = new VoiceResponse();

  const TARGET = e164(process.env.FORWARD_E164);
  const CALLER_ID = e164(process.env.TWILIO_CALLER_ID || req.body.To);
  const forwarded = e164(req.body.ForwardedFrom);

  console.log("INBOUND", {
    From: req.body.From, To: req.body.To,
    ForwardedFrom: req.body.ForwardedFrom || "", TARGET, CALLER_ID
  });

  // No target configured => voicemail/AI path only
  if (!TARGET) {
    r.say("TradeLine twenty four seven. Please leave a message after the tone.");
    r.record({ maxLength: 120, playBeep: true, trim: "do-not-trim",
               recordingStatusCallback: "/voice/recording-status" });
    return res.type("text/xml").send(r.toString());
  }

  // Anti-loop: if carrier forwarded from the same target, don't redial it
  if (forwarded && forwarded === TARGET) {
    r.say("Connecting you to our receptionist.");
    r.record({ maxLength: 120, playBeep: true, trim: "do-not-trim",
               recordingStatusCallback: "/voice/recording-status" });
    return res.type("text/xml").send(r.toString());
  }

  // Normal bridge with audible ringing; fall back to voicemail on no-answer/busy/failed
  r.say("Please hold while we connect you.");
  r.dial({
    callerId: CALLER_ID,
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    action: "/voice/after-dial", method: "POST"
  }, TARGET);

  return res.type("text/xml").send(r.toString());
});

app.post("/voice/after-dial", (req, res) => {
  const status = req.body.DialCallStatus || "unknown";
  const duration = Number(req.body.DialCallDuration || 0);
  lastCalls.push({ t: new Date().toISOString(), status, duration });
  console.log("AFTER DIAL", { status, duration });

  const r = new VoiceResponse();
  if (status !== "completed") {
    r.say("Sorry we missed you. Please leave a message after the tone.");
    r.record({ maxLength: 120, playBeep: true, trim: "do-not-trim",
               recordingStatusCallback: "/voice/recording-status" });
  }
  return res.type("text/xml").send(r.toString());
});

app.post("/voice/recording-status", (req, res) => {
  console.log("RECORDING", {
    RecordingSid: req.body.RecordingSid,
    RecordingUrl: req.body.RecordingUrl,
    Status: req.body.RecordingStatus
  });
  res.sendStatus(204);
});

// ---- Static hosting + SPA fallback ----
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist"), { index: false, maxAge: isProd ? "1y" : 0 }));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

// ---- Listener ----
app.listen(PORT, "0.0.0.0", () => console.log(`✓ Serving /dist on http://0.0.0.0:${PORT}`));