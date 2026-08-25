import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['wawoff2', 'opentype.js', 'fflate', 'jszip', 'file-saver']
  },
  server: {
    port: 5173,
    host: true
  }
});
