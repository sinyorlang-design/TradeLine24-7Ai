// server.mjs  — canonical, consolidated

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import OpenAI from "openai";
import { Resend } from "resend";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const dist = path.join(__dirname, "dist");

// ---- External services -------------------------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const resend = new Resend(process.env.RESEND_API_KEY || "");

export const supaAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || "",
  { auth: { persistSession: false } }
);

// ---- Express baseline (order matters) ----------------------------------
app.set("trust proxy", 1); // required on Render for correct proto/host
app.use(express.urlencoded({ extended: true })); // Twilio sends x-www-form-urlencoded
app.use(express.json());                          // also accept JSON
app.use(express.static(dist, { maxAge: "1h", index: false }));

// Health checks
app.get("/healthz", (_req, res) => res.type("text/plain").send("ok"));
app.get("/readyz", (_req, res) => res.type("text/plain").send("ready"));

// ---- Voice fallback map (used when DB lacks a match) --------------------
const LOCALE_FALLBACK_VOICE = {
  "en-CA": { language: "en-US", voice: "alice" },
  "en-US": { language: "en-US", voice: "alice" },
  "fr-CA": { language: "fr-CA", voice: "alice" },
  "zh-CN": { language: "zh-CN", voice: "alice" },
  "fil-PH": { language: "en-US", voice: "alice" }, // Twilio fallback
  "hi-IN": { language: "en-IN", voice: "alice" },
  "vi-VN": { language: "vi-VN", voice: "alice" },
  "uk-UA": { language: "uk-UA", voice: "alice" },
};

// ---- Twilio signature validator (optional but recommended) --------------
const TWILIO_VALIDATE = process.env.TWILIO_WEBHOOK_VALIDATE === "1";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

function absoluteUrl(req) {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}${req.originalUrl}`;
}
function validateTwilio(req) {
  if (!TWILIO_VALIDATE) return true;
  const sig = req.get("x-twilio-signature") || "";
  return twilio.validateRequest(AUTH_TOKEN, sig, absoluteUrl(req), req.body);
}

// ---- Webhooks: canonical endpoints -------------------------------------

// 1) Incoming call → resolve greeting → speak
app.post("/voice/inbound", async (req, res) => {
  try {
    if (!validateTwilio(req)) return res.status(403).send("forbidden");

    const to = (req.body.To || "").trim(); // hotline E.164
    // Resolve tenant greeting from Supabase
    const { data: greeting, error } = await supaAdmin.rpc("resolve_greeting", {
      p_phone_e164: to,
    });
    if (error) throw error;

    // Derive locale from hotline record if you want (optional)
    // For now use en-CA fallback if unknown
    const fb = LOCALE_FALLBACK_VOICE["en-CA"];

    const vr = new twilio.twiml.VoiceResponse();
    // Optional: simulate 3 rings (RING_SECONDS env)
    const ringSeconds = Math.min(Number(process.env.RING_SECONDS || 0), 30);
    if (ringSeconds > 0) vr.pause({ length: ringSeconds });

    vr.say({ language: fb.language, voice: fb.voice }, greeting || "Hello.");
    res.type("text/xml").status(200).send(vr.toString());
  } catch (e) {
    console.error("inbound error", e);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say("We are experiencing issues. Please call again shortly.");
    res.type("text/xml").status(200).send(vr.toString());
  }
});

// 2) Call status → (optional) log to inbox; always 204 quickly
app.post("/voice/status", async (req, res) => {
  try {
    if (!validateTwilio(req)) return res.status(403).send("forbidden");
    // Minimal, fast ACK to Twilio
    res.sendStatus(204);

    // Optional: log status event idempotently via inbox unique key
    const to = req.body.To;
    const callSid = req.body.CallSid;
    if (!to || !callSid) return;

    const { data: hotline } = await supaAdmin
      .from("hotline_numbers")
      .select("org_id")
      .eq("phone_e164", to)
      .single();

    if (hotline?.org_id) {
      await supaAdmin.from("events_inbox").insert({
        org_id: hotline.org_id,
        call_sid: callSid,
        kind: "call.status",
        payload: req.body,
        idempotency_key: `${callSid}:status`,
      });
      // if conflict on (org_id,idempotency_key), PostgREST will 409; ignore
    }
  } catch (e) {
    console.error("status error (ignored)", e);
  }
});

// 3) Transcript chunk → call DB pipeline
app.post("/voice/transcript", async (req, res) => {
  try {
    if (!validateTwilio(req)) return res.status(403).send("forbidden");

    const callSid = req.body.CallSid || req.body.callSid;
    const to = req.body.To || req.body.to;
    const content =
      req.body.SpeechResult ||
      req.body.TranscriptionText ||
      req.body.text ||
      "";

    if (!callSid || !to) return res.status(200).send("ok");

    const { data: hotline } = await supaAdmin
      .from("hotline_numbers")
      .select("org_id")
      .eq("phone_e164", to)
      .single();
    if (!hotline?.org_id) return res.status(200).send("ok");

    const idem = `${callSid}:tx:${Date.now()}`;
    const { error } = await supaAdmin.rpc("process_event", {
      p_org_id: hotline.org_id,
      p_call_sid: callSid,
      p_kind: "transcript.appended",
      p_payload: { content },
      p_idempotency_key: idem,
    });
    if (error) console.error("process_event error", error);

    res.status(200).send("ok");
  } catch (e) {
    console.error("transcript error", e);
    res.status(200).send("ok");
  }
});

// ---- SPA fallback (exclude API prefixes) --------------------------------
const nonApiSpa = /^\/(?!api\/|voice\/|twilio\/).*/;
app.get(nonApiSpa, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

// ---- Start server -------------------------------------------------------
app.listen(PORT, HOST, () =>
  console.log(`✓ Server listening on http://${HOST}:${PORT}`)
);

// ---- Optional: your recording/Whisper/Resend helpers remain usable -----
// (Keep your existing implementations here if you want them for later.)
// ------------------------------------------------------------------------
const FORWARD_E164 = process.env.FORWARD_E164; // +1XXXXXXXXXX (NOT the carrier-forwarding source)
const CALLER_ID    = process.env.TWILIO_CALLER_ID; // your Twilio DID

app.post("/voice/inbound", express.urlencoded({extended:false}), (req, res) => {
  const twiml = new VoiceResponse();

  const forwarded = (req.body.ForwardedFrom || "").replace(/[^\d+]/g,"");
  const target    = (FORWARD_E164 || "").replace(/[^\d+]/g,"");

  // Prevent hairpin loop: never redial the line that forwarded to us
  if (forwarded && target && forwarded === target) {
    twiml.say("Connecting you to our receptionist.");
    twiml.record({ maxLength:120, playBeep:true, trim:"do-not-trim",
                   recordingStatusCallback:"/voice/recording-status" });
    return res.type("text/xml").send(twiml.toString());
  }

  const dial = twiml.dial({
    callerId: CALLER_ID || req.body.To,
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    action: "/voice/after-dial", method:"POST"
  }, target);

  res.type("text/xml").send(twiml.toString());
});

app.post("/voice/after-dial", express.urlencoded({extended:false}), (req, res) => {
  console.log("AFTER DIAL", { DialCallStatus:req.body.DialCallStatus, DialCallDuration:req.body.DialCallDuration });
  const r = new VoiceResponse();
  if (req.body.DialCallStatus !== "completed") {
    r.say("Sorry we missed you. Please leave a message after the tone.");
    r.record({ maxLength:120, playBeep:true, trim:"do-not-trim",
               recordingStatusCallback:"/voice/recording-status" });
  }
  res.type("text/xml").send(r.toString());
});

app.post("/voice/recording-status", express.urlencoded({extended:false}), (req,res)=>{
  console.log("RECORDING", { Sid:req.body.RecordingSid, Url:req.body.RecordingUrl, Status:req.body.RecordingStatus });
  res.sendStatus(204);
});
const FORWARD_E164 = process.env.FORWARD_E164; // +1XXXXXXXXXX (NOT the carrier-forwarding source)
const CALLER_ID    = process.env.TWILIO_CALLER_ID; // your Twilio DID

app.post("/voice/inbound", express.urlencoded({extended:false}), (req, res) => {
  const twiml = new VoiceResponse();

  const forwarded = (req.body.ForwardedFrom || "").replace(/[^\d+]/g,"");
  const target    = (FORWARD_E164 || "").replace(/[^\d+]/g,"");

  // Prevent hairpin loop: never redial the line that forwarded to us
  if (forwarded && target && forwarded === target) {
    twiml.say("Connecting you to our receptionist.");
    twiml.record({ maxLength:120, playBeep:true, trim:"do-not-trim",
                   recordingStatusCallback:"/voice/recording-status" });
    return res.type("text/xml").send(twiml.toString());
  }

  const dial = twiml.dial({
    callerId: CALLER_ID || req.body.To,
    timeout: 25,
    answerOnBridge: true,
    record: "record-from-answer-dual",
    action: "/voice/after-dial", method:"POST"
  }, target);

  res.type("text/xml").send(twiml.toString());
});

app.post("/voice/after-dial", express.urlencoded({extended:false}), (req, res) => {
  console.log("AFTER DIAL", { DialCallStatus:req.body.DialCallStatus, DialCallDuration:req.body.DialCallDuration });
  const r = new VoiceResponse();
  if (req.body.DialCallStatus !== "completed") {
    r.say("Sorry we missed you. Please leave a message after the tone.");
    r.record({ maxLength:120, playBeep:true, trim:"do-not-trim",
               recordingStatusCallback:"/voice/recording-status" });
  }
  res.type("text/xml").send(r.toString());
});

app.post("/voice/recording-status", express.urlencoded({extended:false}), (req,res)=>{
  console.log("RECORDING", { Sid:req.body.RecordingSid, Url:req.body.RecordingUrl, Status:req.body.RecordingStatus });
  res.sendStatus(204);
});
import helmet from "helmet";
const isProd = process.env.NODE_ENV === "production";

app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": isProd ? ["'self'"] : ["'self'","'unsafe-inline'"],
      "style-src": ["'self'","'unsafe-inline'"],
      "img-src": ["'self'","data:"],
      "font-src": ["'self'","data:"],
      "connect-src": ["'self'","https://*.supabase.co"],
      "frame-ancestors": isProd ? ["'self'"] : ["'self'","https://*.replit.com","https://*.repl.co","https://*.replit.dev"]
    }
  }
  import path from "path"; import { fileURLToPath } from "url";
  const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);

  app.use(express.static(path.join(__dirname, "dist"), { index:false, maxAge: isProd ? "1y" : 0 }));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
// server.mjs (excerpt)
import express from "express";
import helmet from "helmet";
import twilioPkg from "twilio";
const { twiml: { VoiceResponse } } = twilioPkg;

const app = express();
const isProd = process.env.NODE_ENV === "production";

// security + parsers
app.use(helmet({ /* your existing CSP config */ }));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // <-- keep this high

// --- DROP THE MINIMAL HANDLER HERE ---
app.post("/voice/inbound", (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say({ voice: "Polly.Matthew" }, "TradeLine twenty four seven. Inbound OK.");
  res.type("text/xml").send(twiml.toString());
});
// --- END DROP ---

// static + SPA fallback (must come after the webhook)
app.use(express.static("dist", { index: false, maxAge: isProd ? "1y" : 0 }));
app.get("*", (_req, res) => res.sendFile(new URL("./dist/index.html", import.meta.url)));

}));

