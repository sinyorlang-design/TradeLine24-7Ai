#!/usr/bin/env bash
set -euo pipefail

fail=0
pass(){ printf "PASS  %s\n" "$1"; }
failf(){ printf "FAIL  %s\n" "$1"; fail=1; }
has(){ [ -f "$1" ]; }

# --- server.mjs checks ---
if has server.mjs; then pass "server.mjs present"; else failf "server.mjs missing"; fi
grep -Eq 'process\.env\.PORT' server.mjs        && pass "binds to PORT"           || failf "PORT bind missing"
grep -Eq 'express\.static' server.mjs           && pass "serves /dist"             || failf "no static /dist"
grep -Eq 'app\.(get|use)\s*\(\s*[\"'\'']/healthz' server.mjs && pass "/healthz route" || failf "no /healthz"
grep -Eq 'app\.(get|use)\s*\(\s*[\"'\'']/readyz' server.mjs && pass "/readyz route" || failf "no /readyz"

# --- package.json checks (exact scripts + deps) ---
if has package.json; then pass "package.json present"; else failf "package.json missing"; fi
node - <<'NODE'
try{
  const p=require('./package.json');
  const deps=p.dependencies||{};
  const scripts=p.scripts||{};
  let ok=true;
  function chk(cond,msg){ if(cond){ console.log("PASS  "+msg); } else { console.log("FAIL  "+msg); ok=false; } }
  chk(/server\.mjs/.test(scripts.start||""), 'scripts.start runs server.mjs');
  chk(/vite/.test(scripts.build||"") || /vite build/.test(scripts.build||""), 'scripts.build uses vite');
  ['express','compression','helmet','express-rate-limit'].forEach(n=>{
    chk(!!deps[n], `dependency "${n}" in dependencies`);
  });
  process.exit(ok?0:1);
} catch(e){ console.log("FAIL  package.json not parseable"); process.exit(1); }
NODE
node_ok=$?; [ $node_ok -eq 0 ] || fail=1

# --- vite config present ---
if [[ -f vite.config.ts || -f vite.config.js || -f vite.config.mjs || -f vite.config.cjs ]]; then
  pass "vite.config present"
else
  failf "vite.config missing"
fi

# --- brand asset present ---
has public/assets/brand/OFFICIAL_LOGO.svg && pass "OFFICIAL_LOGO.svg present" || failf "OFFICIAL_LOGO.svg missing"

# --- summary ---
if [ $fail -eq 0 ]; then
  echo "OK: repo looks correct."
else
  echo "Issues above. Fix and re-run."
  exit 1
fi
