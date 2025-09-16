import React, { useState } from "react";
import SettingsPanel from "./SettingsPanel.jsx";
export default function SettingsFab(){
  const [open,setOpen] = useState(false);
  return (
    <>
      {open && <SettingsPanel onClose={()=>setOpen(false)} />}
      <button onClick={()=>setOpen(true)} aria-label="Open settings"
        style={{position:"fixed",right:18,bottom:18,zIndex:9998,background:"var(--accent)",color:"#fff",
                border:"none",borderRadius:999,padding:"12px 14px",boxShadow:"0 8px 24px rgba(0,0,0,.2)",cursor:"pointer"}}>
        ⚙️
      </button>
    </>
  );
}
