import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  build: {
    outDir: 'dist', emptyOutDir: true,
    rollupOptions: { output: { manualChunks: id => {
      if (id.includes('node_modules') && /recharts|d3-|victory|decimal/.test(id)) return 'charts';
      if (id.includes('node_modules')) return 'vendor';
    } } },
  },
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/resources': 'http://127.0.0.1:8000' } },
});
