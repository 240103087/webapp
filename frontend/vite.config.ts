import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on the local network too, so a phone can open the app and scan its QR codes (#38).
    host: true,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
