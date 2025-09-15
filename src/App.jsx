import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

export default function App() {
  const [api, setApi] = useState("checking…");

  useEffect(() => {
    if (!API) { setApi("VITE_API_BASE not set"); return; }
    fetch(`${API}/healthz`)
      .then(r => r.text())
      .then(t => setApi(t === "OK" ? "online" : t))
      .catch(() => setApi("offline"));
  }, []);

  return (
    <main style={{
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      margin: "0 auto", maxWidth: 880, padding: "40px 20px"
    }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>TradeLine 24/7</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        AI receptionist that answers, routes, and connects calls—reliably.
      </p>

      <div style={{ display: "flex", gap: 12, margin: "24px 0" }}>
        <a href="tel:+15877428885"
           style={{ background: "#111", color:"#fff", padding:"12px 18px",
                    borderRadius: 10, textDecoration:"none" }}>
          Call (587) 742‑8885
        </a>
        <a href="sms:+15877428885"
           style={{ border:"1px solid #ccc", padding:"12px 18px",
                    borderRadius: 10, textDecoration:"none", color:"#111" }}>
          Text us
        </a>
      </div>

      <div style={{ fontSize:14, color:"#555" }}>
        API status: <strong>{api}</strong> • Destination: +1‑431‑990‑0222
      </div>

      <hr style={{ margin:"24px 0" }}/>

      <ul style={{ lineHeight: 1.6 }}>
        <li>Rings your real line (+1‑431‑990‑0222) with caller ID from your Twilio DID.</li>
        <li>Graceful fallback via TwiML Bin if webhook ever misfires.</li>
        <li>Secure—no secrets in the browser; all keys live on the API.</li>
      </ul>
    </main>
  );
}
