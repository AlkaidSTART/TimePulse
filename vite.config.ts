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
          if (!id.includes('node_modules')) return;
          const parts = id.split('node_modules/');
          const rawPkg = parts[parts.length - 1];
          const pkg = rawPkg.startsWith('@')
            ? rawPkg.split('/').slice(0, 2).join('/')
            : rawPkg.split('/')[0];

          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
            return 'vendor-react';
          }
          if (pkg === 'framer-motion' || pkg === 'motion' || pkg?.startsWith('motion-')) {
            return 'vendor-motion';
          }
          if (pkg === 'react-colorful') {
            // 仅被懒加载的取色器使用：交给 Rollup 放入动态依赖图
            return undefined;
          }
          if (pkg === 'solarlunar') {
            return 'vendor-lunar';
          }
          if (pkg === 'date-fns') {
            // 仅被懒加载的日期选择器使用：交给 Rollup 放入动态依赖图
            return undefined;
          }
          if (pkg?.startsWith('@radix-ui') || pkg?.startsWith('@floating-ui') || pkg === 'radix-ui') {
            // 仅被懒加载的弹窗/浮层使用：交给 Rollup 放入动态依赖图，避免首屏静态加载
            return undefined;
          }
          if (pkg?.startsWith('@supabase')) {
            return 'vendor-supabase';
          }
          if (pkg === '@hello-pangea/dnd') {
            // 仅被懒加载的待办视图使用：交给 Rollup 放入动态依赖图，避免首屏静态加载
            return undefined;
          }
          if (pkg?.includes('number-flow') || pkg === 'overlayscrollbars' || pkg === 'clsx' || pkg === 'tailwind-merge' || pkg === 'class-variance-authority') {
            return 'vendor-ui';
          }
          if (pkg === 'react-icons' || pkg === 'lucide-react') {
            return 'vendor-icons';
          }
          return 'vendor-misc';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'framer-motion',
      'date-fns',
      'react-colorful',
      'react-icons/fi',
      'lucide-react',
      'solarlunar',
      'uuid',
      '@hello-pangea/dnd',
    ],
  },
  server: {
    host: '127.0.0.1',
  },
});
