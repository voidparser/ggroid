import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Check if we're building for GitHub Pages (with /ggroid/ path) or Cloudflare Pages (root path)
const isCloudflare = process.env.CLOUDFLARE_PAGES === 'true';
const basePath = isCloudflare ? '/' : '/ggroid/';

export default defineConfig({
  plugins: [react()],
  base: basePath, // Use conditional base path
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
    base: '/ggroid/' // Keep the development server path
  }
});