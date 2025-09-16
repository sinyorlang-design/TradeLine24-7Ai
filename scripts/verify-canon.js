/**
 * verify-canon.js — ESM-only. Fails build on brand/copy violations.
 * Set SKIP_VERIFY_CANON=1 to bypass for an emergency deploy.
 * Set VERIFY_CANON_SOFT=1 to warn (no fail).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const files = [];

// Collect candidate files, skipping build & vendor dirs
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", ".git", "dist", "build"].includes(e)) continue;
      walk(p);
    } else if (st.isFile() && /\.(jsx?|tsx?|css|html)$/i.test(p)) {
      files.push(p);
    }
  }
})(ROOT);

const problems = [];
const TAG = "Your 24/7 Ai Receptionist!"; // required tagline

for (const f of files) {
  const s = fs.readFileSync(f, "utf8");

  // 1) Background path must be via /assets/, not /public/assets/
  if (s.includes("/public/assets/")) {
    problems.push(`[bg-path] ${f}: use "/assets/..." at runtime (not "/public/assets/...").`);
  }

  // 2) Required tagline presence (warn if absent anywhere under src or public)
  if ((/\/(src|public)\//.test(f)) && !s.includes(TAG)) {
    // don't push per-file; just note once later
  }

  // 3) aria-hidden must be explicit true when present
  const ariaBad = s.match(/\baria-hidden\b(?!\s*=\s*["']true["'])/g);
  if (ariaBad) problems.push(`[a11y] ${f}: aria-hidden must be aria-hidden="true"`);

  // 4) Banned visible copy: "trades"
  if (/\btrades\b/i.test(s)) {
    problems.push(`[copy] ${f}: banned word "trades" in visible copy`);
  }
}

// Global tagline check (ensure at least one usage in code/public)
const anyTagUse = files.some(f => /\/(src|public)\//.test(f) && fs.readFileSync(f, "utf8").includes(TAG));
if (!anyTagUse) problems.push(`[brand] Required tagline missing somewhere in src/public: ${TAG}`);

if (process.env.SKIP_VERIFY_CANON === "1") {
  console.warn("[verify-canon] SKIPPED by SKIP_VERIFY_CANON=1");
  process.exit(0);
}

if (problems.length) {
  const msg = "[verify-canon] FAIL\n" + problems.join("\n");
  if (process.env.VERIFY_CANON_SOFT === "1") {
    console.warn(msg);
    process.exit(0);
  } else {
    console.error(msg);
    process.exit(1);
  }
}

console.log("[verify-canon] OK");
