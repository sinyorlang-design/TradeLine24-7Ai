import fs from "node:fs"; import path from "node:path";
const files=["index.html",path.join("landing","index.html")].filter(f=>fs.existsSync(f));
if(!files.length){ console.log("No index.html found. Skipping."); process.exit(0); }
const PUBLIC_URL=process.env.VITE_PUBLIC_URL||"";
const begin="<!-- TL247:SEO:BEGIN -->", end="<!-- TL247:SEO:END -->";
for(const f of files){
  let html=fs.readFileSync(f,"utf8");
  html=html.replace(/<html(?![^>]*lang=)/i,'<html lang="en"');
  const canonical=(PUBLIC_URL?`${PUBLIC_URL}/`:"/");
  const ld={"@context":"https://schema.org","@graph":[
    {"@type":"Organization","@id":(PUBLIC_URL||"/")+"/#org","name":"TradeLine 24/7","url":PUBLIC_URL||"/","logo":"/LOGO/OFFICIAL_LOGO.svg"},
    {"@type":"WebSite","@id":(PUBLIC_URL||"/")+"/#website","url":PUBLIC_URL||"/","name":"TradeLine 24/7",
     "description":"Your 24/7 Ai Receptionist! Never miss a call. Work while you sleep.",
     "potentialAction":{"@type":"SearchAction","target":(PUBLIC_URL||"/")+"?q={search_term_string}","query-input":"required name=search_term_string"}}]};
  const block=`
${begin}
<meta name="description" content="Your 24/7 Ai Receptionist! Never miss a call. Work while you sleep.">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="TradeLine 24/7">
<meta property="og:type" content="website">
<meta property="og:title" content="Your 24/7 Ai Receptionist!">
<meta property="og:description" content="Never miss a call. Work while you sleep.">
<meta property="og:image" content="/LOGO/OFFICIAL_LOGO.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your 24/7 Ai Receptionist!">
<meta name="twitter:description" content="Never miss a call. Work while you sleep.">
<link rel="manifest" href="/manifest.webmanifest">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${end}`.trim();
  html = html.includes(begin) ? html.replace(new RegExp(`${begin}[\\s\\S]*?${end}`),block)
                              : html.replace(/<head[^>]*>/i, m => `${m}\n  ${block}\n`);
  fs.writeFileSync(f,html,"utf8"); console.log("Patched:",f);
}
