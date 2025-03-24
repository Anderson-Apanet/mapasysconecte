import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
