import { createClient } from '@supabase/supabase-js';

// Valores padrão para produção - SUBSTITUA pelos valores reais do seu projeto Supabase
const PROD_SUPABASE_URL = 'https://hhcmwfgbzpxrpjjqnbmb.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoY213ZmdienB4cnBqanFuYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU0MzA0NDMsImV4cCI6MjAxMTAwNjQ0M30.KXBvGUAUFTVJBPuFv-JbHgwIcwNrIRVkt3PbMqbwpZc';

// Verificar se estamos em ambiente de produção
const isProd = import.meta.env.PROD;

// Usar variáveis de ambiente se disponíveis, caso contrário, usar valores padrão para produção
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

console.log('Ambiente:', isProd ? 'Produção' : 'Desenvolvimento');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Configurada' : 'Não configurada');

// Verificar conectividade com o Supabase
const checkSupabaseConnectivity = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    console.log('Conectividade com Supabase:', response.ok ? 'OK' : 'Falha');
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar conectividade com Supabase:', error);
    return false;
  }
};

// Iniciar verificação de conectividade
if (isProd) {
  checkSupabaseConnectivity().then(isConnected => {
    console.log('Supabase está conectado:', isConnected);
  });
}

// Criar o cliente Supabase com opções adicionais para melhorar a estabilidade
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Função para definir o empresa_id atual
export const setEmpresaIdContext = (empresaId: number | null) => {
  if (empresaId) {
    // Armazenar no localStorage para persistência
    localStorage.setItem('selectedEmpresaId', empresaId.toString());
    console.log(`Contexto de empresa definido: ${empresaId}`);
  } else {
    // Limpar o ID da empresa
    localStorage.removeItem('selectedEmpresaId');
    console.log('Contexto de empresa removido');
  }
};

// Função para obter o empresa_id atual
export const getEmpresaIdContext = (): number | null => {
  const empresaId = localStorage.getItem('selectedEmpresaId');
  return empresaId ? parseInt(empresaId) : null;
};

// Inicializar o contexto de empresa a partir do localStorage
getEmpresaIdContext();
