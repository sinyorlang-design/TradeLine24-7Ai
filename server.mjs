import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { twiml as TwiML } from "twilio";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** ===== App hard locks ===== */
const FORWARD_E164 = process.env.FORWARD_E164 || "+14319900222"; // physical handset only
const BASE_URL = process.env.PUBLIC_BASE_URL || "https://api.tradeline247.ca";

/** ===== Express base ===== */
const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true })); // Twilio posts form-encoded
app.use(express.json({ limit: "1mb" }));
app.use(compression());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

/** ===== Health ===== */
app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/readyz",  (_, res) => res.status(200).json({ ready: true, forward: FORWARD_E164 }));

/** ===== Inbound call → bridge + record; set recording callback ===== */
app.post("/voice/answer", (req, res) => {
  const vr = new TwiML.VoiceResponse();
  const dial = vr.dial({
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    recordingStatusCallback: `${BASE_URL}/voice/recording`,
    recordingStatusCallbackEvent: "completed"
  });
  dial.number(FORWARD_E164);
  res.type("text/xml").send(vr.toString());
});

/** ===== Twilio recording callback → fetch MP3 → Whisper STT → email via Resend ===== */
app.post("/voice/recording", async (req, res) => {
  res.sendStatus(200); // ack fast for Twilio
  try {
    const { RecordingUrl, RecordingSid, CallSid, From, To, CallDuration } = req.body || {};
    if (!RecordingUrl) return;

    // 1) fetch recording (Twilio basic auth)
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const tok = process.env.TWILIO_AUTH_TOKEN  || "";
    const mp3Url = RecordingUrl.endsWith(".mp3") ? RecordingUrl : RecordingUrl + ".mp3";
    const r = await fetch(mp3Url, {
      headers: { "Authorization": "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") }
    });
    if (!r.ok) throw new Error(`recording_fetch_${r.status}`);
    const audioBuf = Buffer.from(await r.arrayBuffer());

    // 2) transcribe
    const text = await transcribeWhisper(audioBuf);

    // 3) email via Resend
    await sendViaResend({
      subject: "TradeLine 24/7 • Call transcript",
      text: buildEmailBody(text, { RecordingSid, RecordingUrl: mp3Url, CallSid, From, To, CallDuration })
    });
  } catch (err) {
    console.error("[/voice/recording] error", err);
  }
});

/** ===== Optional: status hook (no-op) ===== */
app.post("/voice/status", (req, res) => res.sendStatus(200));

/** ===== Static /dist (single service on Render) ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("/", (_, res) => res.sendFile(path.join(dist, "index.html")));

/** ===== Helpers ===== */
async function transcribeWhisper(buffer) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "[No OPENAI_API_KEY set — transcript unavailable]";
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }), "call.mp3");
  form.append("model", "whisper-1");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });
  if (!r.ok) throw new Error("openai_fail_" + r.status);
  const j = await r.json();
  return j.text || "";
}

async function sendViaResend({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM || "TradeLine 24/7 <noreply@tradeline247.ca>";
  const to     = process.env.EMAIL_TO   || process.env.EMAIL_FROM || "root@localhost";
  if (!apiKey) { console.warn("[email] RESEND_API_KEY missing; skipping send."); return; }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, text })
  });
  if (!resp.ok) throw new Error("resend_fail_" + (await resp.text()).slice(0,200));
}

function buildEmailBody(text, meta) {
  const brand = [
    "Your 24/7 Ai Receptionist. Never miss a call. Work while you sleep.",
    "Let Ai grow you, not replace you.",
    "CanAdian Built and owned in Edmonton, Alberta"
  ].join("\n");
  return [
    "TradeLine 24/7 — Call Transcript",
    "",
    `From: ${meta.From || ""}`,
    `To:   ${meta.To || ""}`,
    `Call SID: ${meta.CallSid || ""}`,
    `Recording: ${meta.RecordingUrl || ""}`,
    `Duration: ${meta.CallDuration || ""}`,
    "",
    "— Transcript —",
    text || "[empty]",
    "",
    brand
  ].join("\n");
}

/** ===== Start ===== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] listening on :${PORT} forward=${FORWARD_E164}`);
});
