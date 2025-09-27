// server.mjs
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import OpenAI from "openai";
import { Resend } from "resend";
import twilio from "twilio";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Behind Cloudflare/Render so Express respects X-Forwarded-Proto for webhook validation
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const dist = path.join(__dirname, "dist");
const distIndex = path.join(dist, "index.html");

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

const resend = new Resend(process.env.RESEND_API_KEY || "");

// Middleware - MUST be before routes
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.urlencoded({ extended: false })); // Parse Twilio form posts
app.use(express.json()); // Parse JSON requests

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);
app.use("/auth", authLimiter);

const twilioWebhook = twilio.webhook({
  validate: true,
  protocol: "https",
  host: process.env.PUBLIC_HOSTNAME
});

// Static assets (serve index manually to control SPA fallback)
app.use(express.static(dist, { maxAge: "1h", index: false }));

// Health endpoints for deploys
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => {
  if (fs.existsSync(distIndex)) {
    return res.status(200).send("ready");
  }

  return res.status(503).send("not ready");
});

// Locale configuration with voice mappings
const LOCALE_CONFIG = {
  "GB": { lang: "en-GB", voice: "Polly.Brian", greeting: "Your twenty four seven AI receptionist. Please leave your message after the beep." },
  "FR": { lang: "fr-FR", voice: "Polly.Celine", greeting: "Votre réceptionniste IA vingt-quatre heures sur vingt-quatre. Veuillez laisser votre message après le bip." },
  "DE": { lang: "de-DE", voice: "Polly.Marlene", greeting: "Ihr vierundzwanzig Stunden KI-Empfang. Bitte hinterlassen Sie Ihre Nachricht nach dem Signalton." },
  "ES": { lang: "es-ES", voice: "Polly.Lucia", greeting: "Su recepcionista de IA las veinticuatro horas. Por favor, deje su mensaje después del pitido." },
  "IT": { lang: "it-IT", voice: "Polly.Carla", greeting: "Il vostro receptionist AI ventiquattro ore su ventiquattro. Si prega di lasciare il messaggio dopo il segnale acustico." },
  "NL": { lang: "nl-NL", voice: "Polly.Lotte", greeting: "Uw vierentwintig uur AI-receptionist. Laat uw bericht achter na de pieptoon." }
};

// Default configuration for unsupported locales
const DEFAULT_CONFIG = {
  lang: "en-US",
  voice: "alice",
  greeting: "Your twenty four seven AI receptionist. Please leave your message after the beep."
};

// Get locale config based on country code
function getLocaleConfig(countryCode) {
  return LOCALE_CONFIG[countryCode] || DEFAULT_CONFIG;
}

// Twilio inbound voice handler with multi-locale support
app.post("/voice/answer", twilioWebhook, (req, res) => {
  try {
    const fromCountry = req.body.FromCountry || "US";
    const config = getLocaleConfig(fromCountry);
    
    console.log(`Incoming call from ${fromCountry}, using ${config.lang} locale`);
    
    const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
    const callbackUrl = PUBLIC_BASE_URL 
      ? `${PUBLIC_BASE_URL}/voice/recording-status` 
      : "";
    
    const callbackAttr = callbackUrl 
      ? ` recordingStatusCallback="${callbackUrl}" recordingStatusCallbackMethod="POST"`
      : "";
    
    // Generate TwiML response with locale-specific voice and greeting
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${config.voice}" language="${config.lang}">${config.greeting}</Say>
  <Record playBeep="true" maxLength="120" timeout="5"${callbackAttr}/>
  <Say voice="${config.voice}" language="${config.lang}">We didn't catch a message. Goodbye.</Say>
  <Hangup/>
</Response>`;
    
    res.type("text/xml").send(twiml);
  } catch (error) {
    console.error("Error in /voice/answer:", error);
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`);
  }
});

// Recording status callback with full processing
app.post("/voice/recording-status", twilioWebhook, async (req, res) => {
  // Respond immediately to Twilio
  res.sendStatus(200);
  
  // Process recording asynchronously
  try {
    const {
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      CallSid,
      From,
      To,
      CallDuration,
      RecordingDuration
    } = req.body;
    
    console.log(`Recording received: ${RecordingSid} (Status: ${RecordingStatus})`);
    
    // Only process completed recordings
    if (RecordingStatus !== "completed") {
      console.log(`Skipping non-completed recording: ${RecordingStatus}`);
      return;
    }
    
    // Process the recording
    await processRecording({
      recordingSid: RecordingSid,
      recordingUrl: RecordingUrl,
      callSid: CallSid,
      from: From,
      to: To,
      callDuration: CallDuration,
      recordingDuration: RecordingDuration
    });
    
  } catch (error) {
    console.error("Error processing recording:", error);
  }
});

// Function to process recording with OpenAI and Resend
async function processRecording(recordingData) {
  const { recordingSid, recordingUrl, from, to, recordingDuration } = recordingData;
  
  try {
    console.log(`Starting processing for recording ${recordingSid}`);
    
    // Step 1: Download recording from Twilio
    const audioBuffer = await downloadRecording(recordingUrl);
    
    // Step 2: Transcribe with OpenAI Whisper
    const transcription = await transcribeAudio(audioBuffer, recordingSid);
    
    // Step 3: Generate summary with GPT
    const summary = await generateSummary(transcription, from, to);
    
    // Step 4: Send email via Resend
    await sendNotificationEmail({
      transcription,
      summary,
      from,
      to,
      duration: recordingDuration,
      recordingSid
    });
    
    console.log(`Successfully processed recording ${recordingSid}`);
    
  } catch (error) {
    console.error(`Failed to process recording ${recordingSid}:`, error);
  }
}

// Download recording from Twilio
async function downloadRecording(recordingUrl) {
  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }
    
    // Twilio recordings require authentication
    const fullUrl = recordingUrl.includes("http") ? recordingUrl : `https://api.twilio.com${recordingUrl}`;
    const mp3Url = `${fullUrl}.mp3`; // Get MP3 format
    
    const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
    
    console.log(`Downloading recording from Twilio: ${mp3Url}`);
    
    const response = await fetch(mp3Url, {
      headers: {
        "Authorization": `Basic ${auth}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    console.log(`Downloaded ${buffer.length} bytes`);
    
    return buffer;
    
  } catch (error) {
    console.error("Error downloading recording:", error);
    throw error;
  }
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(audioBuffer, recordingSid) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    
    console.log(`Transcribing audio for ${recordingSid}`);
    
    // Create a File object from the buffer
    const file = new File([audioBuffer], `${recordingSid}.mp3`, { type: "audio/mp3" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en", // Auto-detect language
      response_format: "text"
    });
    
    console.log(`Transcription completed: ${transcription.substring(0, 100)}...`);
    
    return transcription;
    
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

// Generate summary using GPT
async function generateSummary(transcription, from, to) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    
    console.log("Generating summary with GPT");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that summarizes voicemail messages. Provide a brief, professional summary of the key points and any action items mentioned."
        },
        {
          role: "user",
          content: `Please summarize this voicemail message:\n\n"${transcription}"\n\nProvide:\n1. Brief summary (2-3 sentences)\n2. Key points or requests\n3. Suggested follow-up actions if any`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });
    
    const summary = completion.choices[0].message.content;
    console.log("Summary generated successfully");
    
    return summary;
    
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Unable to generate summary";
  }
}

// Send notification email via Resend
async function sendNotificationEmail(data) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Resend API key not configured");
    }
    
    const recipientEmail = process.env.NOTIFICATION_EMAIL || "admin@example.com";
    const fromEmail = process.env.FROM_EMAIL || "voicemail@example.com";
    
    console.log(`Sending email notification to ${recipientEmail}`);
    
    const { transcription, summary, from, to, duration, recordingSid } = data;
    
    // Format phone numbers for display
    const formatPhone = (phone) => phone || "Unknown";
    
    // Create HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A90E2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #666; }
    .transcription { background-color: white; padding: 15px; border-left: 4px solid #4A90E2; margin: 10px 0; }
    .summary { background-color: #e8f4f8; padding: 15px; border-radius: 5px; }
    .metadata { font-size: 0.9em; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Voicemail Received</h2>
    </div>
    <div class="content">
      <div class="section">
        <p><span class="label">From:</span> ${formatPhone(from)}</p>
        <p><span class="label">To:</span> ${formatPhone(to)}</p>
        <p><span class="label">Duration:</span> ${duration} seconds</p>
        <p><span class="label">Recording ID:</span> ${recordingSid}</p>
      </div>
      
      <div class="section">
        <h3>AI Summary</h3>
        <div class="summary">${summary.replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="section">
        <h3>Full Transcription</h3>
        <div class="transcription">${transcription || "No transcription available"}</div>
      </div>
      
      <div class="metadata">
        <p>Processed at: ${new Date().toISOString()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    
    // Send email
    const emailData = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `New Voicemail from ${formatPhone(from)} (${duration}s)`,
      html: htmlBody,
      text: `New voicemail received\n\nFrom: ${formatPhone(from)}\nTo: ${formatPhone(to)}\nDuration: ${duration} seconds\n\nSummary:\n${summary}\n\nTranscription:\n${transcription}`
    });
    
    console.log(`Email sent successfully: ${emailData.id}`);
    
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// SPA fallback (no "*" string; works on Express 4 & 5)
// Exclude any API routes (adjust prefix as needed)
const nonApiSpa = /^\/(?!api\/|voice\/).*/;
app.get(nonApiSpa, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

// Start server
app.listen(PORT, HOST, () =>
  console.log(`✓ Server running on http://${HOST}:${PORT}`)
);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});