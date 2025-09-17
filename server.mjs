import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { twiml as TwiML } from "twilio";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true })); // Twilio posts form-encoded
app.use(express.json({ limit: "1mb" }));
app.use(compression());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

const FORWARD_E164 = process.env.FORWARD_E164 || "+14319900222";
const BASE_URL = process.env.PUBLIC_BASE_URL || "https://api.tradeline247.ca";

/* Health */
app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/readyz",  (_, res) => res.status(200).json({ ready: true, forward: FORWARD_E164 }));

/* 1) Voice Answer — dial forward target; record both legs; set recording callback */
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

/* 2) Recording callback — fetch recording MP3, transcribe via Whisper, email transcript */
app.post("/voice/recording", async (req, res) => {
  res.sendStatus(200); // ack fast

  const { RecordingUrl, RecordingSid, CallSid, From, To, CallDuration } = req.body || {};
  if (!RecordingUrl) return;

  try {
    // Twilio recording requires Basic auth when fetching directly
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const tok = process.env.TWILIO_AUTH_TOKEN  || "";
    const mp3Url = RecordingUrl.endsWith(".mp3") ? RecordingUrl : RecordingUrl + ".mp3";
    const audioRes = await fetch(mp3Url, {
      headers: { "Authorization": "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") }
    });
    if (!audioRes.ok) throw new Error(`fetch_recording_${audioRes.status}`);
    const audioBuf = Buffer.from(await audioRes.arrayBuffer());

    const text = await transcribeWhisper(audioBuf);

    await sendEmail({
      subject: "TradeLine 24/7 • Call transcript",
      text,
      meta: { RecordingSid, RecordingUrl: mp3Url, CallSid, From, To, CallDuration }
    });
  } catch (e) {
    console.error("[recording->email] error", e);
  }
});

/* 3) (Optional) Call status hook — no-op but useful for logs */
app.post("/voice/status", (req, res) => { res.sendStatus(200); });

/* Static app (/dist) for convenience (Render serves one service) */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("/", (_, res) => res.sendFile(path.join(dist, "index.html")));

async function transcribeWhisper(buffer) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "[No OPENAI_API_KEY set — transcript unavailable]";
  // Node 18+ has FormData/Blob built-in
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

async function sendEmail({ subject, text, meta }) {
  const from = process.env.EMAIL_FROM || "TradeLine 24/7 <no-reply@localhost>";
  const to   = process.env.EMAIL_TO   || process.env.EMAIL_FROM || "root@localhost";

  // SMTP (preferred, no new vendors)
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
        user: process.env.SMTP_USER, pass: process.env.SMTP_PASS
      } : undefined
    });
    await transporter.sendMail({
      from, to, subject,
      text: buildEmailBody(text, meta)
    });
    return;
  }

  console.warn("[email] SMTP not configured; transcript not emailed.");
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`[server] listening on :${PORT} forward=${FORWARD_E164}`));
