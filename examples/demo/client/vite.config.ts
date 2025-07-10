import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@yoyo-org/progressive-json": path.resolve(__dirname, "../../../progressive-json/src"),
    },
  },
});
