import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const workspaceRoot = fileURLToPath(new URL('./', import.meta.url));

const disableDevelopmentServiceWorker: Plugin = {
  name: 'timepulse-disable-service-worker-in-development',
  transformIndexHtml(html, context) {
    if (!context.server) return html;
    return html.replace('<script src="/register-sw.js" async></script>', '');
  },
};

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), disableDevelopmentServiceWorker],
  resolve: {
    alias: {
      '@': resolve(workspaceRoot, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('qrcode.react')) {
              return 'vendor-qr';
            }
            if (id.includes('react-colorful')) {
              return 'vendor-color';
            }
            if (id.includes('date-fns') || id.includes('solarlunar')) {
              return 'vendor-date';
            }
            if (id.includes('@number-flow') || id.includes('overlayscrollbars')) {
              return 'vendor-ui';
            }
            if (id.includes('react-icons') || id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-misc';
          }
        },
      },
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'framer-motion',
      'date-fns',
      'qrcode.react',
      'react-colorful',
      'react-icons/fi',
      'lucide-react',
      'solarlunar',
      'uuid',
    ],
  },
  server: {
    host: '127.0.0.1',
  },
});
