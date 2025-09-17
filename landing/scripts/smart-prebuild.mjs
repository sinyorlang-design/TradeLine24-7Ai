const isCloudflare = !!(process.env.CF_PAGES || process.env.CF_PAGES_URL);
const isRender     = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID);

if (process.env.SKIP_VERIFY_CANON === "1") {
  console.log("[prebuild] SKIP_VERIFY_CANON=1 → skipping brand checks");
  process.exit(0);
}

if (isRender) {
  console.log("[prebuild] Render detected → skipping brand checks (server-only)");
  process.exit(0);
}

// Default: Cloudflare or local client builds → run project brand verifier if present
import('node:fs').then(fs => {
  if (fs.existsSync('scripts/verify-canon.js')) {
    console.log("[prebuild] Running scripts/verify-canon.js");
    return import('node:child_process').then(({execSync}) =>
      execSync('node scripts/verify-canon.js', { stdio: 'inherit' })
    );
  } else {
    console.log("[prebuild] No brand verifier present; continue");
  }
}).then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1); });
