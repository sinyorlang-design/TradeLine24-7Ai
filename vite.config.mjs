import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/",
  plugins: [react()],
  publicDir: "public",
  build: { outDir: "dist", assetsDir: "assets", sourcemap: false }
});
