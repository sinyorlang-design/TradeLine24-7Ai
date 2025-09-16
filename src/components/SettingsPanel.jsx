import React from "react";
import { useSettings } from "../context/SettingsContext.jsx";
import AvatarPicker from "./AvatarPicker.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function SettingsPanel({ onClose }){
  const { s, setBusinessName, setHours, setTone, toggleAnswering } = useSettings();
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:9999}} onClick={onClose}>
      <div className="card" onClick={e=>e.stopPropagation()}
           style={{maxWidth:720,margin:"5% auto",padding:20,background:"var(--bg)"}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <h2 style={{margin:"6px 0"}}>Settings</h2>
          <ThemeToggle/>
        </div>

        <label>Business name</label>
        <input className="input" value={s.businessName} onChange={e=>setBusinessName(e.target.value)} />

        <div className="row">
          <div style={{flex:1}}>
            <label>Hours of operation</label>
            <input className="input" value={s.hours} onChange={e=>setHours(e.target.value)} />
          </div>
          <div>
            <label>Tone of voice</label>
            <select className="input" value={s.tone} onChange={e=>setTone(e.target.value)}
              style={{padding:"10px 12px"}}>
              <option>Friendly</option><option>Professional</option><option>Warm</option>
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={toggleAnswering}>
            {s.answeringEnabled ? "Turn OFF answering (session)" : "Turn ON answering"}
          </button>
          <small style={{opacity:.8}}>Default resets to <b>ON</b> every time the app loads.</small>
        </div>

        <div style={{marginTop:16}}>
          <label>Avatar</label>
          <AvatarPicker/>
        </div>

        <div className="row" style={{justifyContent:"flex-end",marginTop:16}}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
