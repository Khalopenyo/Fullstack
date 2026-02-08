import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vitePrerender from "vite-plugin-prerender";
import fs from "fs";
import path from "path";

function buildPrerenderRoutes() {
  const routes = ["/", "/about", "/delivery", "/payment", "/contacts"];
  const dataPath = path.join(__dirname, "scripts", "perfumes.json");
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && item.id) routes.push(`/perfumes/${item.id}`);
      }
    }
  } catch (e) {
    console.warn("Prerender: failed to read perfumes.json:", e.message);
  }
  return routes;
}

const enablePrerender =
  process.env.PRERENDER === "1" ||
  process.env.PRERENDER === "true" ||
  Boolean(process.env.PUPPETEER_EXECUTABLE_PATH);

export default defineConfig({
  plugins: [
    react(),
    enablePrerender
      ? vitePrerender({
          staticDir: path.join(__dirname, "dist"),
          routes: buildPrerenderRoutes(),
          renderer: new vitePrerender.PuppeteerRenderer({
            injectProperty: "__PRERENDER_INJECTED",
            inject: { prerender: true },
            renderAfterTime: 4000,
            navigationOptions: { waitUntil: "domcontentloaded", timeout: 30000 },
            maxConcurrentRoutes: 4,
          }),
        })
      : null,
  ].filter(Boolean),
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
