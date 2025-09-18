/* TradeLine 24/7 — Strict Canon Guard (no alternates, no drift) */
const fs = require("fs"), p = require("path");
const REQUIRED = [
  "public/assets/brand/OFFICIAL_LOGO.svg",
  ...Array.from({length:6},(_,i)=>`public/assets/brand/BACKGROUND_IMAGE${i+1}.svg`),
  "public/assets/fonts/BrandFont.woff2",
];
const TAGLINE = "Your 24/7 Ai Receptionist!";
const BAN_WORDS = [/\btrades\b/i];           // whole-word only (fix FP on 'TradeLine')
const BAN_FILES = [/ORIGINAL_LOGO\.svg/i];   // any ref to ORIGINAL_LOGO.svg
const EXT_TEXT = new Set([".js",".jsx",".ts",".tsx",".mjs",".cjs",".html",".css",".json",".md"]);

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (["node_modules",".git","dist",".next",".vercel","build","scripts"].includes(e.name)) continue;
    const f = p.join(dir,e.name);
    e.isDirectory() ? walk(f,out) : out.push(f);
  } return out;
}

const errs = [];
for (const f of REQUIRED) { try { fs.accessSync(f); } catch { errs.push(`MISSING ${f}`); } }

let taglineSeen = false;
for (const f of walk(".")) {
  const ext = p.extname(f).toLowerCase();
  if (!EXT_TEXT.has(ext)) continue;
  const s = fs.readFileSync(f,"utf8");

  // Tagline only required in index.html head
  if (p.basename(f) === "index.html") {
    if (!/Your 24\/7 Ai Receptionist!/i.test(s)) errs.push(`${f}: missing tagline '${TAGLINE}'`);
    taglineSeen = taglineSeen || /Your 24\/7 Ai Receptionist!/i.test(s);
  }

  // Banned words (whole-word)
  for (const rx of BAN_WORDS) if (rx.test(s)) errs.push(`${f}: contains banned term '${rx.source}'`);

  // Banned file refs (exclude *this* guard file)
  if (f !== "scripts/verify-canon.cjs") {
    for (const rx of BAN_FILES) if (rx.test(s)) errs.push(`${f}: references ORIGINAL_LOGO.svg (must use OFFICIAL_LOGO.svg)`);
  }
}

if (!taglineSeen) errs.push(`index.html: missing tagline '${TAGLINE}'`);

if (errs.length) {
  console.error("❌ Canon guard failed:\n" + errs.map(e=>" - "+e).join("\n"));
  process.exit(1);
}
console.log("✅ Canon OK");
