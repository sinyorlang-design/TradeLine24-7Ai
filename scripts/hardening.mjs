import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

export function applyHardening(app) {
  if (!app || app.locals?.tl247Hardened) return;
  app.locals = app.locals || {};
  app.locals.tl247Hardened = true;

  app.use(hpp());
  app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
  app.use((req,res,next)=>{
    res.setHeader("Permissions-Policy","geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=()");
    res.setHeader("X-Content-Type-Options","nosniff");
    next();
  });

  try {
    const express = (await import("express")).default;
    app.use("/api", express.json({ limit: "256kb" }));
  } catch (_) {}

  const globalLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
  const apiLimiter    = rateLimit({ windowMs: 60_000, max: 60,  standardHeaders: true, legacyHeaders: false });
  app.use(globalLimiter);
  app.use("/api", apiLimiter);

  const onExit = () => {
    if (app.locals?.__closing) return;
    app.locals.__closing = true;
    setTimeout(()=>process.exit(0),750).unref();
  };
  process.on("SIGTERM", onExit);
  process.on("SIGINT", onExit);
}
