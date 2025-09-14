// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional: allow extra hosts via env
// VITE_ALLOWED_HOSTS="foo.example,bar.example"
const extra = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                               // 0.0.0.0
    port: Number(process.env.PORT) || 5000,
    strictPort: true,
    // Let Vite accept requests from Replit preview, Render, and your domain.
    // Regex entries are allowed.
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      /\.replit\.dev$/,                       // ex: ...kirk.replit.dev
      /\.repl\.co$/,
      /\.onrender\.com$/,
      'tradeline247.ca',
      ...extra,
    ],
    // helpful when behind HTTPS proxies
    hmr: { clientPort: 443 },
  },
});