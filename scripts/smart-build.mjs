import { execSync } from "node:child_process";

const isCloudflare = !!(process.env.CF_PAGES || process.env.CF_PAGES_URL);
const isRender     = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID);

if (isCloudflare && !isRender) {
  console.log("[build] Cloudflare Pages detected → running vite build");
  execSync("npx vite build", { stdio: "inherit" });
  process.exit(0);
}

// Default: no-op build for server-only environments (Render, local server)
console.log("[build] Server-only environment detected → skipping client build");
process.exit(0);
