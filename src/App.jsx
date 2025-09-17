import "./theme.css";
import SettingsFab from "./components/SettingsFab.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import CommandBar from "./components/CommandBar.jsx";
import React from "react";
import "./styles/brand.css";
export default function App(){
  return (
    <main className="center">
      <div className="card">
        <h1 style={{margin:"0 0 .5rem"}}>Your 24/7 Ai Receptionist!</h1>
        <p style={{margin:"0 0 1rem"}}>Never miss a call. Work while you sleep.</p>
        <a className="btn" href="/dev/kitchen">Open Kitchen Sink</a>
      </div>
    </main>
  );
}
