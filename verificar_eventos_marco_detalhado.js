// Script para verificar eventos de março de 2025 em detalhes
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

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Configurado' : 'Não configurado');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEventosMarcoDetalhado() {
  console.log('Verificando eventos de março de 2025 em detalhes...');
  
  try {
    // Definir o período de março de 2025
    const inicioMarco = '2025-03-01T00:00:00';
    
    // Buscar eventos com datainicio > 2025-03-01
    console.log('Consultando eventos com datainicio > 2025-03-01');
    const { data: eventosMarco, error: errorMarco } = await supabase
      .from('agenda')
      .select('*')
      .gt('datainicio', inicioMarco);
      
    if (errorMarco) {
      console.error('Erro ao buscar eventos de março:', errorMarco);
      return;
    }
    
    console.log(`Total de eventos com datainicio > 2025-03-01: ${eventosMarco?.length || 0}`);
    
    // Exibir detalhes dos primeiros 10 eventos
    if (eventosMarco && eventosMarco.length > 0) {
      console.log('\nDetalhes dos primeiros 10 eventos:');
      eventosMarco.slice(0, 10).forEach(evento => {
        console.log(`ID: ${evento.id}, Nome: ${evento.nome}`);
        console.log(`Data Início: ${evento.datainicio}, Data Final: ${evento.datafinal}`);
        console.log(`Cancelado: ${evento.cancelado}`);
        console.log('---');
      });
      
      // Verificar o formato das datas
      console.log('\nAnálise do formato das datas:');
      const formatosDatas = {};
      
      eventosMarco.forEach(evento => {
        if (evento.datainicio) {
          const formato = typeof evento.datainicio;
          if (!formatosDatas[formato]) {
            formatosDatas[formato] = 0;
          }
          formatosDatas[formato]++;
          
          if (formato === 'string') {
            // Verificar se a data termina com Z (UTC)
            const terminaComZ = evento.datainicio.endsWith('Z');
            console.log(`Evento ${evento.id} - Data: ${evento.datainicio} - Termina com Z: ${terminaComZ}`);
          }
        }
      });
      
      console.log('Formatos de datas encontrados:', formatosDatas);
      
      // Verificar eventos cancelados
      const eventosCancelados = eventosMarco.filter(evento => evento.cancelado === true);
      console.log(`\nTotal de eventos cancelados: ${eventosCancelados.length}`);
      
      // Testar a conversão de datas
      console.log('\nTeste de conversão de datas:');
      eventosMarco.slice(0, 5).forEach(evento => {
        try {
          const dataOriginal = evento.datainicio;
          const dataConvertida = new Date(evento.datainicio);
          console.log(`Evento ${evento.id} - Original: ${dataOriginal} - Convertida: ${dataConvertida.toISOString()} - Válida: ${!isNaN(dataConvertida.getTime())}`);
        } catch (e) {
          console.error(`Erro ao converter data do evento ${evento.id}:`, e);
        }
      });
    } else {
      console.log('\nNão foram encontrados eventos com datainicio > 2025-03-01');
    }
    
    // Testar a consulta exata que usamos na aplicação
    console.log('\nTestando a consulta exata da aplicação:');
    const startDateISO = '2025-03-01T00:00:00';
    const endDateISO = '2025-03-31T23:59:59';
    
    const { data: eventosConsultaExata, error: errorConsultaExata } = await supabase
      .from('agenda')
      .select('*')
      .eq('cancelado', false)
      .or(
        `datainicio.gte.${startDateISO},datainicio.lte.${endDateISO}`,
        `datafinal.gte.${startDateISO},datafinal.lte.${endDateISO}`,
        `and(datainicio.lt.${startDateISO},datafinal.gt.${endDateISO})`
      );
      
    if (errorConsultaExata) {
      console.error('Erro ao executar consulta exata:', errorConsultaExata);
      return;
    }
    
    console.log(`Total de eventos encontrados com a consulta exata: ${eventosConsultaExata?.length || 0}`);
    
    if (eventosConsultaExata && eventosConsultaExata.length > 0) {
      console.log('\nDetalhes dos primeiros 10 eventos da consulta exata:');
      eventosConsultaExata.slice(0, 10).forEach(evento => {
        console.log(`ID: ${evento.id}, Nome: ${evento.nome}`);
        console.log(`Data Início: ${evento.datainicio}, Data Final: ${evento.datafinal}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar eventos:', error);
  }
}

verificarEventosMarcoDetalhado();
