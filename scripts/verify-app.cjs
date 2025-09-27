#!/usr/bin/env node
const { spawn } = require("child_process");
const { existsSync, readdirSync, readFileSync } = require("fs");
const path = require("path");
const http = require("http");

const DIST_INDEX = path.join(__dirname, "..", "dist", "index.html");
const BASE_URL = "http://127.0.0.1:5000";
const TAGLINE = "Your 24/7 Ai Receptionist!";
const PUBLIC_HOSTNAME = process.env.PUBLIC_HOSTNAME || "www.tradeline247ai.com";

function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("server did not become ready in time"));
    }, 10000);

    proc.stdout.on("data", (data) => {
      process.stdout.write(data);
      if (data.toString().includes("Server running")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    proc.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    proc.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited early with code ${code}`));
    });
  });
}

async function fetchText(url, options) {
  const response = await fetch(url, options);
  return { response, text: await response.text() };
}

async function assertStatus(url, expectedStatus, options) {
  const { response, text } = await fetchText(url, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${url} expected ${expectedStatus} but received ${response.status}`);
  }
  return text;
}

function postInvalidTwilioSignature() {
  return new Promise((resolve, reject) => {
    const body = "CallSid=CA_test&From=%2B15551234567&To=%2B15877428885";
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 5000,
        path: "/voice/answer",
        method: "POST",
        headers: {
          Host: PUBLIC_HOSTNAME,
          "X-Twilio-Signature": "invalid",
          "X-Forwarded-Proto": "https",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve(res.statusCode));
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function stopServer(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.killed) {
      resolve();
      return;
    }

    proc.once("exit", () => resolve());
    proc.kill("SIGINT");
  });
}

(async () => {
  if (!existsSync(DIST_INDEX)) {
    console.error("VERIFY: FAIL - dist/index.html missing. Run 'npm run build'.");
    process.exit(1);
  }

  let server;
  try {
    server = spawn("node", ["server.mjs"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        RESEND_API_KEY: process.env.RESEND_API_KEY || "verify-resend-key",
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "verify-twilio-token",
        PUBLIC_HOSTNAME
      }
    });

    await waitForServer(server);

    await assertStatus(`${BASE_URL}/healthz`, 200);
    await assertStatus(`${BASE_URL}/readyz`, 200);
    const homepage = await assertStatus(`${BASE_URL}/`, 200);
    if (!homepage.includes(TAGLINE)) {
      const assetsDir = path.join(__dirname, "..", "dist", "assets");
      const jsFiles = readdirSync(assetsDir).filter((file) => file.endsWith(".js"));
      const hasTagline = jsFiles.some((file) =>
        readFileSync(path.join(assetsDir, file), "utf8").includes(TAGLINE)
      );
      if (!hasTagline) {
        throw new Error("homepage missing tagline");
      }
    }

    const statusCode = await postInvalidTwilioSignature();
    if (statusCode !== 403) {
      throw new Error(`expected 403 from /voice/answer, received ${statusCode}`);
    }

    console.log("VERIFY: PASS");
  } catch (error) {
    console.error("VERIFY: FAIL", error.message);
    process.exitCode = 1;
  } finally {
    await stopServer(server);
  }
})();
