// Arquivo de configuração de ambiente para produção e desenvolvimento
// Isso garante que as variáveis de ambiente estejam disponíveis mesmo quando .env não está presente

export const ENV = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dieycvogftvfoncigvtl.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ',
  
  // API Base URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Outros valores de configuração podem ser adicionados aqui
};
