import { createClient } from '@supabase/supabase-js';

// Valores padrão para produção com as chaves corretas do .env
const DEFAULT_SUPABASE_URL = 'https://dieycvogftvfoncigvtl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ';

// Verificar se estamos em ambiente de produção
const isProd = import.meta.env.PROD;

// Obter as variáveis de ambiente do Supabase com fallback para valores padrão
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Log de informações de configuração
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
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Detalhes da resposta:', responseText);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar conectividade com Supabase:', error);
    return false;
  }
};

// Iniciar verificação de conectividade
checkSupabaseConnectivity().then(isConnected => {
  console.log('Supabase está conectado:', isConnected);
});

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
