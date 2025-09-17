import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath,"utf8"));

const isCloudflare = !!(process.env.CF_PAGES || process.env.CF_PAGES_URL);
const isRender     = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID);

console.log(`[build] cwd=${process.cwd()} pkg=${pkg.name}@${pkg.version || "0.0.0"} commit=${process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT || "local"}`);

if (process.env.BUILD_CLIENT === "1") {
  console.log("[build] BUILD_CLIENT=1 override → running client build");
  execSync("npm run build:client", { stdio: "inherit" });
  process.exit(0);
}

if (isCloudflare && !isRender) {
  console.log("[build] Cloudflare Pages detected → running client build");
  execSync("npm run build:client", { stdio: "inherit" });
  process.exit(0);
}

console.log("[build] Server-only environment detected → skipping client build");
process.exit(0);
