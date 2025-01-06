import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseado no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'custom-csp',
        transformIndexHtml(html) {
          return html.replace(
            /<head>/,
            `<head>
              <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' http://localhost:* https://*.supabase.co https://aunfucsmyfbdyxfgvpha.supabase.co https://187.103.249.49:3306 https://*.google.com https://maps.googleapis.com https://*.onrender.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; frame-src 'self' https://*.supabase.co;">`
          )
        }
      }
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || ''),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || '')
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:10000',
          changeOrigin: true
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            maps: ['@react-google-maps/api'],
            ui: ['@material-tailwind/react', '@headlessui/react', '@heroicons/react'],
            calendar: ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/list', '@fullcalendar/interaction']
          }
        }
      }
    }
  };
});
