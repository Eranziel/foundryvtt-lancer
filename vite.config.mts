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

/** Remove prior JS chunks at the system root so old bundles cannot coexist with the new lancer.mjs. */
async function removeRootMjsArtifacts(systemDir: string) {
  let names: string[];
  try {
    names = await fs.readdir(systemDir);
  } catch {
    return;
  }
  await Promise.all(
    names.map(async (name) => {
      if (!name.endsWith(".mjs") && !name.endsWith(".mjs.map")) return;
      const p = path.join(systemDir, name);
      const st = await fs.stat(p).catch(() => null);
      if (st?.isFile()) await fs.unlink(p);
    }),
  );
}

/** Copy build output; packs may be locked while Foundry is running (LevelDB). */
async function mirrorDistToFoundrySystem(sourceDir: string, targetDir: string) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(sourceDir, e.name);
    const dest = path.join(targetDir, e.name);
    if (e.isDirectory() && e.name === "packs") {
      try {
        await fs.cp(src, dest, { recursive: true, force: true });
      } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "EBUSY" || code === "EPERM") {
          console.warn(
            "[mirror-build-to-foundry-system] Skipped packs/ (files in use). Close Foundry VTT and run `npm run build` again to update compendium packs.",
          );
        } else {
          throw err;
        }
      }
      continue;
    }
    await fs.cp(src, dest, { recursive: true, force: true });
  }
}

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
    emptyOutDir: true,
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
        await removeRootMjsArtifacts(targetDir);
        await mirrorDistToFoundrySystem(sourceDir, targetDir);
      },
    },
    visualizer({ gzipSize: true, template: "treemap" }),
  ],
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV) }, // This is to make tippy not error out in production
});
