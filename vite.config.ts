import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import preprocess from "svelte-preprocess";
import resolve from "@rollup/plugin-node-resolve"; // This resolves NPM modules from node_modules.
// @ts-ignore
import { postcssConfig, typhonjsRuntime } from "@typhonjs-fvtt/runtime/rollup";

const HOST = "www.localhost.com";
const PORT = 30000;
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
    port: 20001,
    host: HOST,
    open: "/game",
    proxy: {
      "^(?!/systems/lancer/)": `http://${HOST}:${PORT}/`,
      "/socket.io": {
        target: `ws://${HOST}:${PORT}`,
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
      {
        find: "tslib",
        replacement: "tslib/tslib.es6.js",
      },
    ],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["lancer-data", "jszip", "tslib"],
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
      configFile: "../svelte.config.js", // relative to src/
    }),
    resolve({
      browser: true,
      dedupe: ["svelte"],
    }),
    s_TYPHONJS_MODULE_LIB && typhonjsRuntime(),
  ],
});

export default config;
