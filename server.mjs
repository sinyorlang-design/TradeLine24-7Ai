// server.mjs — hardened, hairpin-safe, human-sounding, production-ready
import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import twilioPkg from "twilio";
// --- startup checks & OpenAI probe ---
import OpenAI from "openai";
const must = (k) => {
  const v = process.env[k] || "";
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
  
};
async function startupChecks() {
  // Required envs
  [
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "FORWARD_E164",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN"
  ].forEach(must);

  // OpenAI ping
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 4
    });
    console.log("✓ OpenAI ok:", r.model, "usage:", r.usage?.total_tokens ?? "?");
  } catch (e) {
    console.error("✗ OpenAI probe failed:", e.status || "", e.message);
    // Don’t crash prod; just log loudly.
  }
}
// expose a diag route too
app.get("/diag/openai", async (_req, res) => {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 4
    });
    res.json({ ok: true, model: r.model, usage: r.usage });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

const { twiml: { VoiceResponse } } = twilioPkg;

// --- brand & SSML helpers ---
const biz  = () => process.env.BIZ_NAME || "TradeLine twenty four seven";
const ssml = (s) => `<speak><prosody rate="92%" pitch="+2st">${s.trim()}</prosody></speak>`;

const app   = express();
const isProd= process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`✓ Server running on http://${HOST}:${PORT}`);

// ---------- security & middleware ----------
app.disable("x-powered-by");
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      "style-src":  ["'self'", "'unsafe-inline'"],
      "img-src":    ["'self'", "data:"],
      "font-src":   ["'self'", "data:"],
      "connect-src":["'self'", "https://*.supabase.co", "wss:"],
      "frame-ancestors": isProd
        ? ["'self'"]
        : ["'self'", "https://*.replit.com", "https://*.repl.co", "https://*.replit.dev"]
    }
  }
}));
app.use(compression());
app.use(express.json());
const urlencoded = express.urlencoded({ extended: false });
app.use("/voice", rateLimit({ windowMs: 30_000, max: 40 }));

// ---------- health & diagnostics ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
app.get("/healthz", (_req,res)=>res.status(200).send("OK"));
app.get("/readyz",  (_req,res)=>res.status(fs.existsSync(path.join(dist,"index.html"))?200:503).send("READY"));
const lastCalls = [];
app.get("/twilioz", (_req,res)=>res.json(lastCalls.slice(-10)));

// ---------- helpers ----------
const clean  = (s)=> (s||"").replace(/[^\d+]/g,"");
const TARGET = ()=> clean(process.env.FORWARD_E164);                      // relay number (Twilio B)
const CALLER = (req)=> clean(process.env.TWILIO_CALLER_ID || req.body.To);// shows Main CNAM

// ---------- core handler ----------
function handleInbound(req, res) {
  const r = new VoiceResponse();
  const target    = TARGET();
  const forwarded = clean(req.body.ForwardedFrom);

  console.log("INBOUND", { From:req.body.From, To:req.body.To, ForwardedFrom:req.body.ForwardedFrom||"", target });

  if (!target) {
    r.say({ voice: "Polly.Joanna-Neural" }, ssml(`Sorry, our lines are busy. Please leave a message after the tone.`));
    r.record({ maxLength:120, playBeep:true, trim:"do-not-trim", recordingStatusCallback:"/voice/recording-status" });
    return res.type("text/xml").send(r.toString());
  }

  // hairpin guard: never redial the number that forwarded to us
  if (forwarded && forwarded === target) {
    r.say({ voice:"Polly.Joanna-Neural" }, ssml(`Connecting you to our receptionist.`));
    r.record({ maxLength:120, playBeep:true, trim:"do-not-trim", recordingStatusCallback:"/voice/recording-status" });
    return res.type("text/xml").send(r.toString());
  }

  // warm greeting + optional barge-in
  r.say({ voice:"Polly.Joanna-Neural" }, ssml(`Hi, you’ve reached ${biz()}.`));
  const g = r.gather({
    input: "speech",
    speechTimeout: "auto",
    bargeIn: true,
    action: "/voice/intent",
    method: "POST",
    timeout: 2
  });
  g.say({ voice:"Polly.Joanna-Neural" }, ssml(`You can say sales, support, or operator.`));

  // if nothing said, continue and bridge
  { voice: "Polly.Joanna-Neural" },
  ssml(`Hi, you’ve reached ${biz()}. One moment while I connect you.`)
  // helper already in your file:
  const ssml = (s) => `<speak><prosody rate="90%" pitch="+1st">${s.trim()}</prosody></speak>`;

  r.say(
    { voice: "Polly.Joanna-Neural" },
    ssml(`Hi, you’ve reached ${biz()}. One moment while I connect you.`)
  );

  r.dial({
    callerId: CALLER(req),
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    action: "/voice/after-dial",
    method: "POST"
  }, target);

  return res.type("text/xml").send(r.toString());
}

// two valid entry paths (so Console can’t mispoint)
app.post("/voice/answer",  urlencoded, handleInbound);
app.post("/voice/inbound", urlencoded, handleInbound);

// intent handler (barge-in result)
app.post("/voice/intent", urlencoded, (req, res) => {
  const speech = (req.body.SpeechResult || "").toLowerCase();
  console.log("INTENT", { speech });

  // simple keyword routing hook (can expand later)
  const dest = TARGET(); // for now, always bridge to the relay
  const r = new VoiceResponse();
  r.say({ voice:"Polly.Joanna-Neural" }, ssml(`Got it, connecting you now.`));
  r.dial({
    callerId: CALLER(req),
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    action: "/voice/after-dial",
    method: "POST"
  }, dest);

  return res.type("text/xml").send(r.toString());
});

// dial outcome → voicemail if not completed
app.post("/voice/after-dial", urlencoded, (req,res)=>{
  const status = req.body.DialCallStatus || "unknown";
  const duration = Number(req.body.DialCallDuration || 0);
  lastCalls.push({ t:new Date().toISOString(), status, duration });
  console.log("AFTER DIAL", { status, duration });

  const r = new VoiceResponse();
  if (status !== "completed") {
    r.say({ voice:"Polly.Joanna-Neural" }, ssml(`Sorry we missed you. <break time="250ms"/> Please leave your name, number, and a quick reason for calling.`));
    r.record({ maxLength:120, playBeep:true, trim:"do-not-trim", recordingStatusCallback:"/voice/recording-status" });
  }
  return res.type("text/xml").send(r.toString());
});

app.post("/voice/recording-status", urlencoded, (_req,res)=>res.sendStatus(204));

// ---------- static + SPA fallback ----------
app.use(express.static(dist, { index:false, maxAge: isProd ? "1y" : 0 }));
app.get("*", (_req,res)=>res.sendFile(path.join(dist,"index.html")));

  await startupChecks();

// ---------- listener ----------
app.listen(PORT, HOST, ()=>console.log(`✓ Serving /dist and Twilio webhooks on http://${HOST}:${PORT}`));










