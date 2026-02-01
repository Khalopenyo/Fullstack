import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      jsx: "automatic",
      loader: {
        ".js": "jsx",
        ".jsx": "jsx",
      },
    },
  },
  server: {
    port: 3000,
  },
});
