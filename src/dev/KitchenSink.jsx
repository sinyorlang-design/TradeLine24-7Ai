import React, {useState} from "react";
import "../styles/brand.css";
export default function KitchenSink(){
  const [title,setTitle] = useState("Your 24/7 Ai Receptionist!");
  const [sub,setSub] = useState("Never miss a call. Work while you sleep.");
  return (
    <main className="center">
      <div className="card" style={{marginBottom:"1rem"}}>
        <h2 style={{marginTop:0}}>Kitchen Sink</h2>
        <p>Live playground to tweak text and layout.</p>
        <label>Title<br/><input value={title} onChange={e=>setTitle(e.target.value)} style={{width:"100%"}}/></label>
        <label>Subline<br/><input value={sub} onChange={e=>setSub(e.target.value)} style={{width:"100%"}}/></label>
      </div>
      <div className="card">
        <h1 style={{margin:"0 0 .5rem"}}>{title}</h1>
        <p style={{margin:"0 0 1rem"}}>{sub}</p>
        <a className="btn" href="/">Back to Home</a>
      </div>
    </main>
  );
}
