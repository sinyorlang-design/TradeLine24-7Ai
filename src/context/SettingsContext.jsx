import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadSettings, saveSettings } from "../lib/settings.js";

const Ctx = createContext(null);
export function SettingsProvider({ children }){
  const [s, setS] = useState(loadSettings());

  // Theme application (system honors prefers-color-scheme)
  useEffect(()=>{
    const root = document.documentElement;
    const wanted = s.theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : s.theme;
    root.setAttribute("data-theme", wanted);
  }, [s.theme]);

  const api = useMemo(()=>({
    s,
    setBusinessName: (v)=> setS(p=>saveSettings({ ...p, businessName: v })),
    setHours:        (v)=> setS(p=>saveSettings({ ...p, hours: v })),
    setTone:         (v)=> setS(p=>saveSettings({ ...p, tone: v })),
    setAvatar:       (v)=> setS(p=>saveSettings({ ...p, avatar: v })),
    setTheme:        (v)=> setS(p=>saveSettings({ ...p, theme: v })),
    toggleAnswering: ()=> setS(p=>saveSettings({ ...p, answeringEnabled: !p.answeringEnabled })),
    // expose a “session off” (will reset to ON next full load)
    sessionOff:      ()=> setS(p=>({ ...p, answeringEnabled: false }))
  }), [s]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useSettings = ()=> useContext(Ctx);
