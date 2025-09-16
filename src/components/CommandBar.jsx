import React,{useEffect,useState} from "react";
const ITEMS=[{label:"Open Settings",action:()=>location.assign("/dashboard/settings")},
             {label:"Open Dashboard",action:()=>location.assign("/")},
             {label:"Open FAQs",action:()=>location.assign("/#faq")}];
export default function CommandBar(){const [open,setOpen]=useState(false),[q,setQ]=useState("");
useEffect(()=>{const h=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(o=>!o)} if(e.key==="Escape") setOpen(false)};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[]);
const results=ITEMS.filter(i=>i.label.toLowerCase().includes(q.toLowerCase()));
if(!open) return null; return (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)"}} onClick={()=>setOpen(false)}>
  <div role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{maxWidth:560,margin:"10% auto",background:"#fff",borderRadius:12,padding:16,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
    <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a command…" style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #ddd",marginBottom:10}}/>
    <ul style={{listStyle:"none",margin:0,padding:0}}>
      {results.map((r,i)=>(<li key={i}><button onClick={()=>{r.action();setOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",border:"1px solid #eee",borderRadius:8,marginBottom:6,background:"#fafafa"}}>{r.label}</button></li>))}
    </ul>
    <p style={{fontSize:12,opacity:.7,marginTop:8}}>Tip: ⌘K / Ctrl+K</p>
  </div></div>);}
