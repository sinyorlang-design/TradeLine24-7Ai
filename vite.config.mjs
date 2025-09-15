import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/",
  publicDir: "public",
  build: { outDir: "dist", sourcemap: true, assetsDir: "assets" },
  server: { host: "0.0.0.0", port: 5173 }
});
