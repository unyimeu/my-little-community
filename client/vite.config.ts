import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the React app is served by Vite (5173) and the API by Express (8787).
// Proxying /api means the browser only ever talks to its own origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
