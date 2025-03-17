// Script para verificar títulos do contrato sergiocarlos
import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Verificando contrato sergiocarlos...');
  
  // Buscar o contrato
  const { data: contrato, error: contratoError } = await supabase
    .from('contratos')
    .select('*')
    .eq('pppoe', 'sergiocarlos')
    .single();
  
  if (contratoError) {
    console.error('Erro ao buscar contrato:', contratoError);
    return;
  }
  
  console.log('Contrato encontrado:', contrato);
  
  // Buscar títulos do contrato
  const { data: titulos, error: titulosError } = await supabase
    .from('titulos')
    .select('*')
    .eq('id_contrato', contrato.id)
    .order('vencimento');
  
  if (titulosError) {
    console.error('Erro ao buscar títulos:', titulosError);
    return;
  }
  
  console.log(`Encontrados ${titulos.length} títulos para o contrato sergiocarlos:`);
  console.log(JSON.stringify(titulos, null, 2));
  
  // Verificar se há títulos com outros campos
  const { data: titulosPorPppoe, error: titulosPorPppoeError } = await supabase
    .from('titulos')
    .select('*')
    .eq('pppoe', 'sergiocarlos')
    .order('vencimento');
  
  if (titulosPorPppoeError) {
    console.error('Erro ao buscar títulos por PPPOE:', titulosPorPppoeError);
    return;
  }
  
  console.log(`Encontrados ${titulosPorPppoe.length} títulos para o PPPOE sergiocarlos:`);
  console.log(JSON.stringify(titulosPorPppoe, null, 2));
}

main().catch(console.error);
