import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

const serviceWorkerTemplatePath = fileURLToPath(new URL("./service-worker.template.js", import.meta.url));
const appShellPublicUrls = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon.svg",
  "icons/icon-maskable.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

function smartDbPwaServiceWorker(): Plugin {
  return {
    name: "smart-db-pwa-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const emittedAssetUrls = Object.entries(bundle)
        .filter(([fileName, output]) => {
          if (!fileName.startsWith("assets/")) {
            return false;
          }
          return output.type === "asset" || output.isEntry;
        })
        .map(([fileName]) => fileName)
        .sort();
      const appShellUrls = Array.from(new Set([...appShellPublicUrls, ...emittedAssetUrls]));
      const template = readFileSync(serviceWorkerTemplatePath, "utf8");

      this.emitFile({
        type: "asset",
        fileName: "service-worker.js",
        source: template.replace(
          "__SMART_DB_APP_SHELL_URLS__",
          JSON.stringify(appShellUrls, null, 2),
        ),
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [smartDbPwaServiceWorker()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
});
