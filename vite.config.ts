import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /mahboobahstitches/. Other hosts use /.
  base: process.env.GITHUB_PAGES ? "/mahboobahstitches/" : "/",
  server: { proxy: { "/api": "http://localhost:8787" } },
  build: { target: "es2020", sourcemap: false },
});
