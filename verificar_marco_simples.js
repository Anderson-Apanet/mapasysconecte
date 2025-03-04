// Script simplificado para verificar eventos de março de 2025
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente manualmente
const envPath = join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

// Inicializar o cliente Supabase
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEventosMarco() {
  try {
    // Buscar eventos com datainicio em março de 2025
    console.log('Consultando eventos de março de 2025...');
    
    const { data: eventos, error } = await supabase
      .from('agenda')
      .select('*')
      .gte('datainicio', '2025-03-01')
      .lt('datainicio', '2025-04-01');
      
    if (error) {
      console.error('Erro na consulta:', error);
      return;
    }
    
    console.log(`Total de eventos em março de 2025: ${eventos.length}`);
    
    if (eventos.length > 0) {
      console.log('\nPrimeiros 5 eventos:');
      eventos.slice(0, 5).forEach(evento => {
        console.log(`ID: ${evento.id}`);
        console.log(`Nome: ${evento.nome}`);
        console.log(`Data Início: ${evento.datainicio}`);
        console.log(`Data Final: ${evento.datafinal}`);
        console.log(`Cancelado: ${evento.cancelado}`);
        console.log('---');
      });
    }
    
    // Verificar eventos cancelados
    const cancelados = eventos.filter(e => e.cancelado === true);
    console.log(`\nEventos cancelados: ${cancelados.length}`);
    
    // Testar a consulta que usamos na aplicação
    console.log('\nTestando a consulta da aplicação:');
    
    const { data: eventosApp, error: errorApp } = await supabase
      .from('agenda')
      .select('*')
      .eq('cancelado', false)
      .or(
        `datainicio.gte.2025-03-01,datainicio.lte.2025-03-31`,
        `datafinal.gte.2025-03-01,datafinal.lte.2025-03-31`,
        `and(datainicio.lt.2025-03-01,datafinal.gt.2025-03-31)`
      );
      
    if (errorApp) {
      console.error('Erro na consulta da aplicação:', errorApp);
      return;
    }
    
    console.log(`Total de eventos encontrados com a consulta da aplicação: ${eventosApp.length}`);
    
    if (eventosApp.length > 0) {
      console.log('\nPrimeiros 5 eventos da consulta da aplicação:');
      eventosApp.slice(0, 5).forEach(evento => {
        console.log(`ID: ${evento.id}`);
        console.log(`Nome: ${evento.nome}`);
        console.log(`Data Início: ${evento.datainicio}`);
        console.log(`Data Final: ${evento.datafinal}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

verificarEventosMarco();
