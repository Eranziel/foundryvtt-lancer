import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import type { UserConfig } from "vite";
// import preprocess from "svelte-preprocess";
// const path = require("path");
import path from "path";

const config = defineConfig({
  root: "src/",
  base: "/systems/lancer/",
  publicDir: path.resolve(__dirname, "public"),
  server: {
    port: 30001,
    open: true,
    proxy: {
      "^(?!/systems/lancer)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: "./runtimeConfig",
        replacement: "./runtimeConfig.browser",
      },
    ],
  },
  optimizeDeps: {
    include: ["lancer-data", "jszip" /* "axios" */], // machine-mind's cjs dependencies
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
    terserOptions: {
      mangle: false,
      keep_classnames: true,
      keep_fnames: true,
    },
    lib: {
      name: "lancer",
      entry: path.resolve(__dirname, "src/lancer.ts"),
      formats: ["es"],
      fileName: "lancer",
    },
  },
  plugins: [
    svelte({
      // preprocess: preprocess(),
      configFile: "../svelte.config.js", // relative to src/
    }),
    /*
    checker({
      typescript: true,
      // svelte: { root: __dirname },
    }),
    */
    visualizer({
      gzipSize: true,
      template: "treemap",
    }),
  ],
});

// export default defineConfig({
// plugins: [svelte()],
// })

export default config;
