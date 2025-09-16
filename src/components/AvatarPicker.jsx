import React from "react"; import { useSettings } from "../context/SettingsContext.jsx";
const AVATARS = [1,2,3,4,5,6].map(n=>`/avatars/avatar-${n}.svg`);
export default function AvatarPicker(){
  const { s, setAvatar } = useSettings();
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,40px)",gap:10}}>
      {AVATARS.map(a=>(
        <button key={a} onClick={()=>setAvatar(a)} style={{
          width:40,height:40,padding:0,borderRadius:10,overflow:"hidden",
          border: s.avatar===a ? "2px solid var(--accent)" : "1px solid rgba(148,163,184,.4)",
          background:"transparent",cursor:"pointer"
        }}>
          <img src={a} alt="avatar" width="40" height="40" loading="lazy"/>
        </button>
      ))}
    </div>
  );
}
