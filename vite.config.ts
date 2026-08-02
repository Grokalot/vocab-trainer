import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/dictionary': {
        target: 'https://www.dictionary.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dictionary/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api/dictionary': {
        target: 'https://www.dictionary.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dictionary/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
});
