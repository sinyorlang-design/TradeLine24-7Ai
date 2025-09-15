#!/usr/bin/env node
const fs = require("fs");
let ok = true;
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const needDeps = ["express","compression","helmet","express-rate-limit","hpp"];

const err = m => (console.error("✗", m), ok=false);
const info = m => console.log("•", m);

for (const d of needDeps) {
  if (!pkg.dependencies || !pkg.dependencies[d]) err(`Runtime dep "${d}" must be in dependencies.`);
}
if (!pkg.scripts?.start || !/node\s+server\.mjs/.test(pkg.scripts.start)) err(`"start" script must be "node server.mjs".`);

const mustEnv = ["OPENAI_API_KEY","SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","EMAIL_FROM"];
const missing = mustEnv.filter(k => !process.env[k]);
if (missing.length) info(`Missing non-fatal envs (set when wiring features): ${missing.join(", ")}`);

if (!ok) process.exit(1);
console.log("✓ Runtime looks sane.");
