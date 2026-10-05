import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // 0.0.0.0 so dev container / WSL can also reach it
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});