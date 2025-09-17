import fs from "node:fs";
import path from "node:path";

const REQ = [
  "Your 24/7 Ai Receptionist. Never miss a call. Work while you sleep.",
  "Let Ai grow you, not replace you.",
  "CanAdian Built and owned in Edmonton, Alberta"
];
const MUST = [
  "public/assets/brand/OFFICIAL_LOGO.svg",
  "public/assets/brand/BACKGROUND_IMAGE1.svg",
  "public/assets/brand/BACKGROUND_IMAGE2.svg",
  "public/assets/brand/BACKGROUND_IMAGE3.svg",
  "public/assets/brand/BACKGROUND_IMAGE4.svg",
  "public/assets/brand/BACKGROUND_IMAGE5.svg",
  "public/assets/brand/BACKGROUND_IMAGE6.svg",
  "public/assets/fonts/BrandFont.woff2"
];

// NOTE: use obfuscated tokens to avoid triggering our own banned-word scan.
const BAD_WORD   = new RegExp(String.raw`\\btr` + `a` + `des\\b`, "i");  // 't-word'
const BAD_PHRASE = /(always\s*on(?:-|\s*brand)?)/i;

const roots = ["src","public"].filter(d => fs.existsSync(d));
const textExt = /\.(jsx?|tsx?|css|scss|html|md|mdx)$/i;
const files=[];
function walk(d){ for(const e of fs.readdirSync(d)){ const p=path.join(d,e);
  const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(st.isFile() && textExt.test(p)) files.push(p);
}}
for (const r of roots) walk(r);
const read=f=>fs.readFileSync(f,"utf8");
const problems=[];

// A) Required files present
for (const p of MUST) if (!fs.existsSync(p)) problems.push(`[assets] missing ${p}`);

// B) No /public/assets/ at runtime
for (const f of files) if (read(f).includes("/public/assets/")) problems.push(`[assets] ${f}: use /assets/ at runtime`);

// C) Copy bans (in site only)
for (const f of files) {
  const s = read(f);
  if (BAD_WORD.test(s))   problems.push(`[copy] ${f}: banned t-word in visible copy`);
  if (BAD_PHRASE.test(s)) problems.push(`[copy] ${f}: banned "Always On / Always On-Brand"`);
}

// D) Required brand lines present somewhere in src/public
const corpus = files.map(read).join("\n");
for (const line of REQ) if (!corpus.includes(line)) problems.push(`[brand] missing line: ${line}`);

if (process.env.SKIP_VERIFY_CANON === "1") { console.warn("[verify-canon] SKIPPED"); process.exit(0); }
if (problems.length){ console.error("[verify-canon] FAIL\n"+problems.join("\n")); process.exit(1); }
console.log("[verify-canon] OK");
