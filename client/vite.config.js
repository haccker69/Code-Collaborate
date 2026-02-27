import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["monaco-editor"],
  },
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    // Proxy API and socket requests to the backend in dev
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5002",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
