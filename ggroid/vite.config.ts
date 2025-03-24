import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/ggroid/', // Set the base URL to /ggroid/
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'tailwind-merge']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    base: '/ggroid/' // Also set for development server
  }
});