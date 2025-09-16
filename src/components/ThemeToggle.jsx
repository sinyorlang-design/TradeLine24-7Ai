import React from "react"; import { useSettings } from "../context/SettingsContext.jsx";
export default function ThemeToggle(){
  const { s, setTheme } = useSettings();
  const cycle = () => setTheme(s.theme === "light" ? "dark" : s.theme === "dark" ? "system" : "light");
  return <button className="btn" onClick={cycle} title={`Theme: ${s.theme}`}>Theme: {s.theme}</button>;
}
