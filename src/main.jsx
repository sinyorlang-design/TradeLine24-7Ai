import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div style={{padding:"2rem"}}>TradeLine 24/7 — Your 24/7 Ai Receptionist!</div>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App/></React.StrictMode>
);
