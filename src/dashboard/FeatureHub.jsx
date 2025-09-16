import React from "react";
const ITEMS=[{title:"Call Logs",desc:"Every call, all in one place.",href:"/"},
{title:"Voicemail & Messages",desc:"Read and listen in seconds.",href:"/"},
{title:"Analytics",desc:"Spot trends, win more jobs.",href:"/"},
{title:"Contacts",desc:"Your CRM, simplified.",href:"/"},
{title:"Settings",desc:"Personalize tone, hours & more.",href:"/dashboard/settings"},
{title:"Integrations",desc:"Webhooks, Slack, and more.",href:"/dashboard/settings"}];
export default function FeatureHub(){return(<main className="center" style={{maxWidth:960,margin:"0 auto"}}>
 <h2>What you can do</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
  {ITEMS.map((it,i)=>(<a key={i} href={it.href} className="card" style={{textDecoration:"none",color:"inherit"}}>
    <h3 style={{margin:"0 0 6px"}}>{it.title}</h3><p style={{margin:0,opacity:.8}}>{it.desc}</p>
  </a>))}
 </div></main>);}
