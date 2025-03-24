import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:10000',
          changeOrigin: true
        }
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 5173
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      // Configurações para resolver problemas de MIME type
      assetsInlineLimit: 0, // Não inline nenhum arquivo
      sourcemap: isProd ? false : 'inline', // Sourcemaps apenas em desenvolvimento
      rollupOptions: {
        output: {
          // Configurações para garantir que os arquivos JS sejam servidos corretamente
          format: 'es', // Usar formato ES modules
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          // Desativar manualChunks para evitar problemas com MIME types
          manualChunks: undefined
        }
      },
      // Configurações adicionais para resolver problemas de MIME type
      target: 'es2015', // Usar ES2015 para melhor compatibilidade
      minify: 'esbuild' // Usar esbuild em vez de terser
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  };
});
