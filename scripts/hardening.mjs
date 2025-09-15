import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

export function applyHardening(app) {
  if (!app || app.locals?.tl247Hardened) return;
  app.locals = app.locals || {};
  app.locals.tl247Hardened = true;

  app.use(hpp());
  app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
  app.use((_, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=()"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  const globalLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
  const apiLimiter    = rateLimit({ windowMs: 60_000, max: 60,  standardHeaders: true, legacyHeaders: false });
  app.use(globalLimiter);
  app.use("/api", apiLimiter);

  // graceful shutdown
  const close = () => { if (app.locals.__closing) return; app.locals.__closing = true; setTimeout(() => process.exit(0), 750).unref(); };
  process.on("SIGTERM", close);
  process.on("SIGINT",  close);
}
