import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY)
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
    chunkSizeWarningLimit: 1000, // Aumentando o limite de tamanho dos chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Separando as dependências em chunks diferentes
          vendor: ['react', 'react-dom'],
          maps: ['@react-google-maps/api'],
          ui: ['@material-tailwind/react', '@headlessui/react', '@heroicons/react'],
          calendar: ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/list', '@fullcalendar/interaction']
        }
      }
    }
  }
});
