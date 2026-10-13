// Offline standalone NEXO Bridge renderer, bundled with the Windows PoC.
import {defineConfig} from 'vite';
export default defineConfig({
  root: 'experiments/qt-unified-shell/render_web',
  base: './',
  build: {
    outDir: '../dist-render',
    emptyOutDir: true,
    target: 'chrome110',
    sourcemap: false
  }
});
