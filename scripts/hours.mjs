/**
 * Business hours helper (no deps).
 * Enable by setting env:
 *   BUSINESS_HOURS="09:00-17:00"
 *   TIMEZONE="America/Edmonton"
 *   BUSINESS_HOURS_MODE="soft"   // optional; reserved for future
 */
function parseSpan(span) {
  // "HH:MM-HH:MM"
  const m = /^([0-2]\d):([0-5]\d)-([0-2]\d):([0-5]\d)$/.exec((span||"").trim());
  if (!m) return null;
  const [ , h1, m1, h2, m2 ] = m.map(Number);
  return { start: h1*60 + m1, end: h2*60 + m2 };
}
export function isClosedNow() {
  const span = process.env.BUSINESS_HOURS || "";
  const tz   = process.env.TIMEZONE || "America/Edmonton";
  const win  = parseSpan(span);
  if (!win) return false; // feature OFF if not configured

  const now  = new Date();
  // minutes since midnight in TZ:
  const fmt  = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = fmt.format(now).split(":").map(Number);
  const mins  = parts[0]*60 + parts[1];

  // supports same-day span only (09:00-17:00). Overnight can be added later if needed.
  return !(mins >= win.start && mins <= win.end);
}
"HOURS"

# 2) Inject import + branch (idempotent)
if ! grep -q "from \"./scripts/hours.mjs\"" "server.mjs"; then
  sed -i 1i
