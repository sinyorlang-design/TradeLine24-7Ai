#!/usr/bin/env node
const fs = require("fs");
let ok = true;
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
function err(s){ console.error("✗", s); ok=false; }
function okmsg(s){ console.log("•", s); }

if (!pkg.dependencies?.express) err('Runtime dep "express" must be under "dependencies" (not devDependencies).');
if (!pkg.scripts?.start?.includes("node server.mjs")) err('scripts.start should be "node server.mjs".');

const must = ["OPENAI_API_KEY","VITE_SUPABASE_URL","VITE_SUPABASE_ANON_KEY"];
const missing = must.filter(k => !process.env[k]);
if (missing.length) okmsg("Missing non-fatal env (set in Render/Replit when ready): " + missing.join(", "));

if (!ok) process.exit(1);
console.log("✓ Runtime looks sane");
