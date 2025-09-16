export const DEFAULTS = {
  businessName: "Your Business",
  hours: "Mon–Fri, 9–5",
  tone: "Friendly",              // Friendly | Professional | Warm
  answeringEnabled: true,        // Always reset to true at app start
  avatar: "/avatars/avatar-1.svg",
  theme: "system"                // light | dark | system
};
export function loadSettings(){
  try{ const s = JSON.parse(localStorage.getItem("tl247:settings")||"{}");
       // Enforce answering ON at every fresh load
       return { ...DEFAULTS, ...s, answeringEnabled: true }; }
  catch(_){ return { ...DEFAULTS }; }
}
export function saveSettings(patch){
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem("tl247:settings", JSON.stringify(next));
  return next;
}
