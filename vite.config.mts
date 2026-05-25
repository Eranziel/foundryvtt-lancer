import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import { sveltePreprocess } from "svelte-preprocess";
import foundryvtt from "vite-plugin-foundryvtt";
import checker from "vite-plugin-checker";

import systemJson from "./src/system.json";

export default defineConfig({
  base: "/systems/lancer/",
  server: {
    port: 30001,
    open: "/",
    proxy: {
      "^(?!/systems/lancer)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ["@massif/lancer-data"],
  },
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      name: "lancer",
      entry: "src/lancer.ts",
      formats: ["es"],
      fileName: "lancer",
    },
    rolldownOptions: { output: { keepNames: true } },
  },
  plugins: [
    checker({ typescript: true, enableBuild: false }),
    svelte({ preprocess: sveltePreprocess() }),
    foundryvtt(systemJson),
    visualizer({ gzipSize: true, template: "treemap" }),
  ],
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV) }, // This is to make tippy not error out in production
});
