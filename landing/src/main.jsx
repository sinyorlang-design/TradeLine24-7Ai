import React from "react";
import { createRoot } from "react-dom/client";
function Hero(){
  return (
    <main style={{maxWidth:960,margin:"6rem auto",padding:"1rem"}}>
      <h1 style={{fontSize:44,marginBottom:12}}>Your 24/7 Ai Receptionist!</h1>
      <p style={{opacity:.8,marginBottom:20}}>Never miss a call. Work while you sleep.</p>
      <div style={{display:"flex",gap:12}}>
        <a className="btn" href="https://app.example.com" style={btn}>Start free</a>
        <a className="btn" href="#features" style={{...btn, background:"#111", color:"#fff"}}>See features</a>
      </div>
      <section id="features" style={{marginTop:48,display:"grid",gap:16,gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>
        {[
          ["Instant call capture","After-hours calls summarized and sent to you."],
          ["Smart follow-ups","Optional SMS to missed callers (opt-in)."],
          ["Easy setup","No tech headaches—just switch it on."]
        ].map(([t,d],i)=>(
          <div key={i} style={{border:"1px solid #eee",borderRadius:12,padding:16}}>
            <h3 style={{margin:"0 0 6px"}}>{t}</h3><p style={{margin:0,opacity:.85}}>{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
const btn={padding:"10px 14px",borderRadius:10,textDecoration:"none",background:"#2563eb",color:"#fff"};
createRoot(document.getElementById("root")).render(<Hero/>);
