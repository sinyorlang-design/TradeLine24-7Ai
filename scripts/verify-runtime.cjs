#!/usr/bin/env node
const fs = require("fs");
let ok = true;
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
function err(s){ console.error("✗", s); ok=false; }
function info(s){ console.log("•", s); }
if (!pkg.dependencies?.express) err('Runtime dep "express" must be under "dependencies" (not devDependencies).');
const s = pkg.scripts||{};
if (!s.start || !/node\s+server\.mjs/.test(s.start)) err('script "start" should run "node server.mjs".');
const must = ["OPENAI_API_KEY","SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","EMAIL_FROM"];
const missing = must.filter(k => !process.env[k]);
if (missing.length) info(`Missing non-fatal env (wire later): ${missing.join(", ")}`);
if (!ok) process.exit(1);
console.log("✓ Runtime looks sane");
