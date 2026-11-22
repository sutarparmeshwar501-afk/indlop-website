import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          about: path.resolve(__dirname, 'about/index.html'),
          community: path.resolve(__dirname, 'community/index.html'),
          contact: path.resolve(__dirname, 'contact/index.html'),
          faq: path.resolve(__dirname, 'faq/index.html'),
          features: path.resolve(__dirname, 'features/index.html'),
          join: path.resolve(__dirname, 'join/index.html'),
          leadership: path.resolve(__dirname, 'leadership/index.html'),
          privacy: path.resolve(__dirname, 'privacy/index.html'),
          whyIndlop: path.resolve(__dirname, 'why-indlop/index.html'),
          admin: path.resolve(__dirname, 'admin/index.html'),
          customPage: path.resolve(__dirname, 'page/index.html'),
          notFound: path.resolve(__dirname, '404.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
