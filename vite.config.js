import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const replaceAssetsPaths = () => ({
  name: "replace-assets-paths",
  transformIndexHtml: {
    handler(html) {
      return html.replace(/\/assets/gi, "assets");
    },
  },
});

export default defineConfig({
  plugins: [svelte(), replaceAssetsPaths()],
});
