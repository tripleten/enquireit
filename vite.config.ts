import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the *.css?url imports in node_modules with an empty module
// to prevent Vite from processing them as stylesheets.
const noopStylesPlugin = {
  name: "vite-plugin-noop-styles",
  resolveId(id: string) {
    if (id.includes("?url")) return;
  },
};

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    allowedHosts: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 64999,
      clientPort: 64999,
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
    noopStylesPlugin,
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@shopify/polaris"],
  },
}) satisfies UserConfig;
