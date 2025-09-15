/**
 * TL247 hardening — additive protections. Import once and call applyHardening(app).
 * Does NOT change routes or UI.
 */
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

export function applyHardening(app) {
  if (!app || app.locals?.__tl247Hardened) return;
  app.locals = app.locals || {};
  app.locals.__tl247Hardened = true;

  // Light, safe defaults that won’t fight your current config
  app.use(hpp());
  app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
  app.use((_, res, next) => {
    res.setHeader("Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=()");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Soft global limiter + stricter /api if you add one later
  const globalLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
  const apiLimiter    = rateLimit({ windowMs: 60_000, max: 60,  standardHeaders: true, legacyHeaders: false });
  app.use(globalLimiter);
  app.use("/api", apiLimiter);

  // Graceful shutdown (doesn’t touch your existing app.listen)
  const stop = () => { if (!app.locals.__closing) { app.locals.__closing = true; setTimeout(() => process.exit(0), 750).unref(); } };
  process.on("SIGTERM", stop);
  process.on("SIGINT",  stop);
}
