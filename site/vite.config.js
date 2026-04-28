import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import compression from 'vite-plugin-compression';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // Not in a git repo or git not available
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    compression({ algorithm: 'gzip', ext: '.gz' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        help: resolve(__dirname, 'help.html')
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pixi.js') || id.includes('pixi-filters')) return 'vendor-pixi';
          if (id.includes('howler')) return 'vendor-audio';
          if (id.includes('gsap')) return 'vendor-gsap';
          return 'vendor';
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
    sourcemap: false,
  },
  server: {
    port: 5600,
    strictPort: false,
    open: true
  },
  preview: {
    port: 5601,
    strictPort: false
  }
});
