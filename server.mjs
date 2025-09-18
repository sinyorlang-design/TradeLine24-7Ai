import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pkg from "twilio";
const { twiml: TwiML, validateRequest } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

const BASE_URL = process.env.PUBLIC_BASE_URL || "https://api.tradeline247.ca";
const FORWARD_E164 = process.env.FORWARD_E164 || "+14319900222";
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "TradeLine 24/7 <noreply@tradeline247.ca>";
const EMAIL_TO = process.env.EMAIL_TO || EMAIL_FROM;

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true })); // Twilio sends form-encoded
app.use(express.json({ limit: "1mb" }));
app.use(compression());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Health
app.get("/healthz", (_,res)=>res.status(200).send("ok"));
app.get("/readyz",  (_,res)=>res.status(200).json({ ready:true, forward: FORWARD_E164 }));

// Twilio debug surface (lightweight)
let _lastRecording = { at: null, meta: null, error: null };
app.get("/twilioz", (_,res)=> res.json({ last:_lastRecording }));

// Twilio signature verification middleware
function verifyTwilio(req, res, next) {
  try {
    const sig = req.get("X-Twilio-Signature");
    const url = `${BASE_URL}${req.originalUrl}`;
    const ok = validateRequest(TWILIO_TOKEN, sig, url, req.body || {});
    if (!ok) return res.status(403).send("invalid signature");
    return next();
  } catch {
    return res.status(403).send("invalid");
  }
}

// Inbound call: bridge + record
app.post("/voice/answer", verifyTwilio, (req, res) => {
  const vr = new TwiML.VoiceResponse();
  const dial = vr.dial({
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    trim: "trim-silence",
    recordingStatusCallback: `${BASE_URL}/voice/recording`,
    recordingStatusCallbackEvent: "completed"
  });
  dial.number(FORWARD_E164);
  res.type("text/xml").send(vr.toString());
});

// Recording callback: fetch MP3 -> Whisper -> Resend email
app.post("/voice/recording", verifyTwilio, async (req, res) => {
  _lastRecording = { at: new Date().toISOString(), meta: req.body, error: null };
  res.sendStatus(200); // ack fast
  try {
    const { RecordingUrl, RecordingSid, CallSid, From, To, CallDuration } = req.body || {};
    if (!RecordingUrl) return;

    const mp3Url = RecordingUrl.endsWith(".mp3") ? RecordingUrl : RecordingUrl + ".mp3";
    const r = await fetch(mp3Url, {
      headers: { "Authorization": "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64") }
    });
    if (!r.ok) throw new Error(`recording_fetch_${r.status}`);
    const audioBuf = Buffer.from(await r.arrayBuffer());

    // Whisper transcription
    let transcript = "Transcript pending";
    if (OPENAI_KEY) {
      try {
        const form = new FormData();
        form.append("file", new Blob([audioBuf], { type: "audio/mpeg" }), "call.mp3");
        form.append("model", "whisper-1");
        const tr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${OPENAI_KEY}` },
          body: form
        });
        if (tr.ok) {
          const j = await tr.json();
          transcript = j.text || transcript;
        }
      } catch {}
    }

    await sendViaResend({
      subject: "TradeLine 24/7 • Call transcript",
      text: buildEmailBody(transcript, { From, To, CallSid, RecordingSid, RecordingUrl: mp3Url, CallDuration })
    });
  } catch (e) {
    console.error("[recording] error", e?.message || e);
  }
});

// Ops smoke
app.post("/ops/test-email", async (_, res) => {
  try {
    await sendViaResend({ subject: "TL247 • Resend smoke", text: "Smoke OK" });
    res.status(200).send("ok");
  } catch (e) { res.status(500).send("fail"); }
});

// Static /dist + SPA fallback
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.join(__dirname, "dist");
app.use(express.static(dist,{index:false,etag:true,maxAge:"1y"}));
app.get("/__version",(_,res)=>{try{const v=fs.readFileSync(path.join(dist,"__version.json"),"utf8");res.set("Cache-Control","no-store").type("application/json").send(v);}catch{res.status(404).json({});}});
app.get("*",(_,res)=>{res.set("Cache-Control","no-store");res.sendFile(path.join(dist,"index.html"));});

function buildEmailBody(text, meta) {
  const brand = [
    "Your 24/7 Ai Receptionist. Never miss a call. Work while you sleep.",
    "Let Ai grow you, not replace you.",
    "Canadian Built & Owned."
  ].join("\n");
  return [
    "TradeLine 24/7 — Call Transcript",
    "",
    `From: ${meta.From || ""}`,
    `To:   ${meta.To || ""}`,
    `Call SID: ${meta.CallSid || ""}`,
    `Recording: ${meta.RecordingUrl || ""}`,
    `Duration: ${meta.CallDuration || ""}s`,
    "",
    "— Transcript —",
    text || "Transcript pending",
    "",
    brand
  ].join("\n");
}

async function sendViaResend({ subject, text }) {
  if (!RESEND_API_KEY) { console.warn("[email] RESEND_API_KEY missing; skipping"); return; }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: EMAIL_TO, subject, text })
  });
  if (!resp.ok) throw new Error("resend_fail_" + await resp.text());
}

app.listen(PORT, "0.0.0.0", () => console.log(`[server] :${PORT} → forward ${FORWARD_E164}`));
