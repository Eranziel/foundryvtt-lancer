import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import { sveltePreprocess } from "svelte-preprocess";
import foundryvtt from "vite-plugin-foundryvtt";
import checker from "vite-plugin-checker";
import fs from "node:fs/promises";
import path from "node:path";

import systemJson from "./src/system.json";

const DIST_DIR = "dist";
const FOUNDRY_SYSTEM_DIR = "F:/FoundryVTT/Data/systems/lancer";

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
  // For AWS Config
  resolve: { alias: [{ find: "./runtimeConfig", replacement: "./runtimeConfig.browser" }] },
  optimizeDeps: {
    include: ["@massif/lancer-data"],
  },
  build: {
    outDir: DIST_DIR,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      name: "lancer",
      entry: "src/lancer.ts",
      formats: ["es"],
      fileName: "lancer",
    },
  },
  esbuild: {
    minifyIdentifiers: false,
    keepNames: true,
  },
  plugins: [
    checker({ typescript: true, enableBuild: false }),
    svelte({ preprocess: sveltePreprocess() }),
    foundryvtt(systemJson),
    {
      name: "aws-global-fix",
      apply: "serve",
      transform(code, id) {
        // Define window.global for use by an aws dependency
        if (id === "\0virtual:entrypoint") return "window.global = window;\n" + code;
      },
    },
    {
      name: "mirror-build-to-foundry-system",
      apply: "build",
      async closeBundle() {
        const sourceDir = path.resolve(DIST_DIR);
        const targetDir = path.resolve(FOUNDRY_SYSTEM_DIR);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
      },
    },
    visualizer({ gzipSize: true, template: "treemap" }),
  ],
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV) }, // This is to make tippy not error out in production
});
