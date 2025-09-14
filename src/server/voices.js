// src/server/voices.js

// 1) Safe, in-repo fallbacks (keep/add your locales here)
export const LOCALE_FALLBACK_VOICE = {
  'en-CA': { language: 'en-US', voice: 'alice' },
  'en-US': { language: 'en-US', voice: 'alice' },
  'fr-CA': { language: 'fr-CA', voice: 'alice' },
  'zh-CN': { language: 'zh-CN', voice: 'alice' },
  'fil-PH': { language: 'en-US', voice: 'alice' }, // Twilio fallback
  'hi-IN': { language: 'en-IN', voice: 'alice' },
  'vi-VN': { language: 'vi-VN', voice: 'alice' },
  'uk-UA': { language: 'uk-UA', voice: 'alice' },
};

const DEFAULT = { language: 'en-US', voice: 'alice' };

// 2) Helpers to read env overrides (JSON or per-locale keys)
function parseJSONEnv(name) {
  try { return process.env[name] ? JSON.parse(process.env[name]) : null; }
  catch { return null; }
}

function readPairFromEnv(locale) {
  const slug = locale.replace('-', '_').toUpperCase(); // en-CA -> EN_CA
  const language = process.env[`VOICE_${slug}_LANGUAGE`];
  const voice    = process.env[`VOICE_${slug}_VOICE`];
  return (language || voice)
    ? { language: language || DEFAULT.language, voice: voice || DEFAULT.voice }
    : null;
}

// 3) Public API: resolve the effective voice for a locale
export function resolveVoice(locale) {
  const json = parseJSONEnv('LOCALE_VOICE_OVERRIDES') || {};
  return json[locale]
      || readPairFromEnv(locale)
      || LOCALE_FALLBACK_VOICE[locale]
      || DEFAULT;
}

// Optional: get the whole effective map (useful for diagnostics/UI)
export function effectiveVoiceMap() {
  const json = parseJSONEnv('LOCALE_VOICE_OVERRIDES') || {};
  const locales = new Set([
    ...Object.keys(LOCALE_FALLBACK_VOICE),
    ...Object.keys(json),
  ]);
  const out = {};
  for (const loc of locales) out[loc] = resolveVoice(loc);
  return out;
}
