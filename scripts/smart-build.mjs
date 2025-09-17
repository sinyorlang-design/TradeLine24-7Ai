import { execSync } from "node:child_process";
import fs from "node:fs";

const isCloudflare = !!(process.env.CF_PAGES || process.env.CF_PAGES_URL);
const isRender     = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID);
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
console.log(`[build] pkg.name=${pkg.name} pkg.version=${pkg.version} commit=${process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT || "local"}`);

if (isCloudflare && !isRender) {
  console.log("[build] Cloudflare Pages detected → running client build");
  execSync("npm run build:client", { stdio: "inherit" });
  process.exit(0);
}
console.log("[build] Server-only environment detected → skipping client build");
process.exit(0);
