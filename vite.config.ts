import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
// import cloudflarePagesPlugin from "@hono/vite-cloudflare-pages";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // esbuild: {
  //   platform: "node",
  // },
  /* build: {
    rollupOptions: {
      external: ["@langchain/cloudflare"],
    },
  }, */
  plugins: [
    react(),
    // devServer({ entry: "src/main.jsx" }),
    // cloudflarePagesPlugin(),
  ],
});
