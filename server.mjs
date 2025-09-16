import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { twiml as TwiML } from "twilio";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

const FORWARD_E164 = process.env.FORWARD_E164 || "+14319900222";

/* --- Health --- */
app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/readyz",  (_, res) => res.status(200).json({ ready: true, forward: FORWARD_E164 }));

/* --- Primary Twilio inbound handler --- */
app.post("/voice/answer", (req, res) => {
  const vr = new TwiML.VoiceResponse();
  const dial = vr.dial({ timeout: 25, answerOnBridge: true }); // no callerId, no record
  dial.number(FORWARD_E164); // physical handset only
  res.type("text/xml").send(vr.toString());
});

/* --- Optional: status callback (kept minimal) --- */
app.post("/voice/status", (req, res) => {
  // You can inspect req.body.CallStatus, etc. for observability.
  res.sendStatus(200);
});

/* --- Static app (Vite /dist) --- */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("*", (_, res) => res.sendFile(path.join(dist, "index.html")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] listening on :${PORT} with forward ${FORWARD_E164}`);
});
