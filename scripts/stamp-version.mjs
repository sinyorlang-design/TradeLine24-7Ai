import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const sha=execSync("git rev-parse --short HEAD").toString().trim();
const branch=execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
const when=new Date().toISOString();
writeFileSync(join("dist","__version.json"), JSON.stringify({sha,branch,when},null,2));
try{const p=join("dist","index.html");writeFileSync(p,"<!-- build:"+sha+" "+when+" -->\n"+readFileSync(p,"utf8"));}catch{}
