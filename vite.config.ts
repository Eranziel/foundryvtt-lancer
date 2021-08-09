import type { UserConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
const path = require('path');

const config: UserConfig = {
  root: 'src/',
  base: '/systems/lancer/',
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 30001,
    open: true,
    proxy: {
      '^(?!/systems/lancer)': 'http://localhost:30000/',
      '/socket.io': {
        target: 'ws://localhost:30000',
        ws: true,
      },
    }
  },
  resolve: {
    alias: [{
      find: "./runtimeConfig",
      replacement: ("./runtimeConfig.browser"),
    }]
  },
  optimizeDeps: {
    exclude: ['machine-mind'], // machine-mind triggers https://github.com/evanw/esbuild/issues/1433
    include: ['lancer-data', 'jszip', 'axios'], // machine-mind's cjs dependencies
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    brotliSize: true,
    lib: {
      name: 'lancer',
      entry: path.resolve(__dirname, 'src/lancer.ts'),
      formats: ['es'],
      fileName: 'lancer'
    }
  },
  plugins: [
    visualizer({
      gzipSize: true,
      template: "treemap",
    })
  ]
};

export default config;
