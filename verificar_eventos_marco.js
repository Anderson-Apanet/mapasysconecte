// Script para verificar eventos do mês de março
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Configurado' : 'Não configurado');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEventosMarco() {
  console.log('Verificando eventos do mês de março...');
  
  try {
    // Definir o período de março de 2025
    const inicioMarco = '2025-03-01T00:00:00';
    const fimMarco = '2025-03-31T23:59:59';
    
    // Buscar todos os eventos
    const { data: todosEventos, error: errorTodos } = await supabase
      .from('agenda')
      .select('*');
      
    if (errorTodos) {
      console.error('Erro ao buscar todos os eventos:', errorTodos);
      return;
    }
    
    console.log(`Total de eventos no banco: ${todosEventos.length}`);
    
    // Filtrar eventos de março manualmente
    const eventosMarco = todosEventos.filter(evento => {
      try {
        if (!evento.datainicio) return false;
        
        const dataInicio = new Date(evento.datainicio);
        const ano = dataInicio.getFullYear();
        const mes = dataInicio.getMonth() + 1;
        
        return ano === 2025 && mes === 3;
      } catch (e) {
        console.error(`Erro ao processar data do evento ${evento.id}:`, e);
        return false;
      }
    });
    
    console.log(`Total de eventos em março de 2025: ${eventosMarco.length}`);
    
    // Exibir detalhes dos eventos de março
    if (eventosMarco.length > 0) {
      console.log('\nDetalhes dos eventos de março:');
      eventosMarco.forEach(evento => {
        console.log(`ID: ${evento.id}, Nome: ${evento.nome}, Data Início: ${evento.datainicio}, Data Final: ${evento.datafinal}, Cancelado: ${evento.cancelado}`);
      });
    } else {
      console.log('\nNão há eventos cadastrados para março de 2025.');
      
      // Verificar eventos por mês para os próximos meses
      const eventosPorMes = {};
      todosEventos.forEach(evento => {
        try {
          if (!evento.datainicio) return;
          
          const dataInicio = new Date(evento.datainicio);
          if (isNaN(dataInicio.getTime())) return;
          
          const ano = dataInicio.getFullYear();
          const mes = dataInicio.getMonth() + 1;
          const chave = `${ano}-${mes}`;
          
          if (!eventosPorMes[chave]) {
            eventosPorMes[chave] = 0;
          }
          
          eventosPorMes[chave]++;
        } catch (e) {
          console.error(`Erro ao processar data do evento ${evento.id}:`, e);
        }
      });
      
      console.log('\nDistribuição de eventos por mês:');
      Object.keys(eventosPorMes).sort().forEach(chave => {
        console.log(`${chave}: ${eventosPorMes[chave]} eventos`);
      });
    }
    
    // Verificar eventos cancelados
    const eventosCancelados = todosEventos.filter(evento => evento.cancelado === true);
    console.log(`\nTotal de eventos cancelados: ${eventosCancelados.length}`);
    
    // Verificar eventos sem data de início
    const eventosSemDataInicio = todosEventos.filter(evento => !evento.datainicio);
    console.log(`Total de eventos sem data de início: ${eventosSemDataInicio.length}`);
    
    // Verificar eventos sem data final
    const eventosSemDataFinal = todosEventos.filter(evento => evento.datainicio && !evento.datafinal);
    console.log(`Total de eventos com data de início mas sem data final: ${eventosSemDataFinal.length}`);
    
  } catch (error) {
    console.error('Erro ao verificar eventos:', error);
  }
}

verificarEventosMarco();
