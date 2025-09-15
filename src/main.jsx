import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // must exist in src/
const el = document.getElementById("root");
if (!el) {
  const m = document.createElement("pre");
  m.textContent = "Mount point #root not found.";
  document.body.appendChild(m);
} else {
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
