import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import preprocess from "svelte-preprocess";
import { visualizer } from "rollup-plugin-visualizer";
import resolve from "@rollup/plugin-node-resolve"; // This resolves NPM modules from node_modules.
// @ts-ignore
import { postcssConfig, terserConfig, typhonjsRuntime } from "@typhonjs-fvtt/runtime/rollup";

const s_COMPRESS = false; // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

// Set to true to enable linking against the TyphonJS Runtime Library module.
// You must add a Foundry module dependency on the `typhonjs` Foundry package or manually install it in Foundry from:
// https://github.com/typhonjs-fvtt-lib/typhonjs/releases/latest/download/module.json
const s_TYPHONJS_MODULE_LIB = false;

// import preprocess from "svelte-preprocess";
// const path = require("path");
import path from "path";

const config = defineConfig({
  root: "src/",
  base: "/systems/lancer",
  publicDir: path.resolve(__dirname, "public"),
  cacheDir: "../.vite-cache", // Relative from root directory.

  esbuild: {
    target: ["es2022", "chrome100"],
    keepNames: true, // Note: doesn't seem to work.
  },

  css: {
    // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
    postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS }),
  },

  server: {
    port: 30001,
    open: "/game",
    proxy: {
      "^(?!/systems/lancer)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  resolve: {
    conditions: ["import", "browser"],
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
    minify: s_COMPRESS ? "terser" : false,
    terserOptions: {
      mangle: false,
      keep_classnames: true,
      keep_fnames: true,
    },
    lib: {
      name: "lancer",
      entry: path.resolve(__dirname, "src/lancer.js"),
      formats: ["es"],
      fileName: "lancer",
    },
  },
  plugins: [
    svelte({
      preprocess: preprocess(),
      // preprocess: preprocess(),
      configFile: "../svelte.config.js", // relative to src/
    }),
    /*
    checker({
      typescript: true,
      // svelte: { root: __dirname },
    }),
    */
    resolve({
      browser: true,
      dedupe: ["svelte"],
    }),

    s_TYPHONJS_MODULE_LIB && typhonjsRuntime(),

    // visualizer({
    // gzipSize: true,
    // template: "treemap",
    // }),
  ],
});

export default config;
