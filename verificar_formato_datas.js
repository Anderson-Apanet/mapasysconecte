// Script para verificar o formato exato das datas no banco de dados
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

async function verificarFormatoDatas() {
  try {
    console.log('Verificando o formato exato das datas no banco de dados...');
    
    // Buscar todos os eventos de março de 2025 - sem filtros adicionais
    const { data: eventos, error } = await supabase
      .from('agenda')
      .select('*')
      .gte('datainicio', '2025-03-01')
      .lt('datainicio', '2025-04-01');
      
    if (error) {
      console.error('Erro na consulta:', error);
      return;
    }
    
    console.log(`Total de eventos encontrados (sem filtros): ${eventos.length}`);
    
    if (eventos.length > 0) {
      console.log('\nDetalhes dos primeiros 5 eventos:');
      eventos.slice(0, 5).forEach(evento => {
        console.log(`ID: ${evento.id}`);
        console.log(`Nome: ${evento.nome}`);
        console.log(`Data Início (formato original): ${evento.datainicio}`);
        console.log(`Data Final (formato original): ${evento.datafinal}`);
        console.log(`Cancelado: ${evento.cancelado}`);
        console.log('---');
      });
      
      // Verificar eventos cancelados
      const cancelados = eventos.filter(e => e.cancelado === true);
      console.log(`\nEventos cancelados: ${cancelados.length}`);
      
      // Verificar o formato exato das datas
      console.log('\nAnálise do formato das datas:');
      eventos.forEach(evento => {
        console.log(`Evento ${evento.id}:`);
        console.log(`  - datainicio: ${evento.datainicio} (tipo: ${typeof evento.datainicio})`);
        
        // Tentar converter para Date e verificar
        try {
          const data = new Date(evento.datainicio);
          console.log(`  - Conversão para Date: ${data.toISOString()}`);
          console.log(`  - Data válida: ${!isNaN(data.getTime())}`);
          console.log(`  - Ano: ${data.getFullYear()}, Mês: ${data.getMonth() + 1}, Dia: ${data.getDate()}`);
          console.log(`  - Hora: ${data.getHours()}:${data.getMinutes()}:${data.getSeconds()}`);
        } catch (e) {
          console.log(`  - Erro ao converter data: ${e.message}`);
        }
        
        console.log('---');
      });
    }
    
    // Testar a consulta exata que usamos na aplicação
    console.log('\nTestando a consulta exata da aplicação:');
    
    const { data: eventosApp, error: errorApp } = await supabase
      .from('agenda')
      .select('*')
      .eq('cancelado', false)
      .gte('datainicio', '2025-03-01')
      .lt('datainicio', '2025-04-01T23:59:59');
      
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
    } else {
      console.log('Nenhum evento encontrado com a consulta da aplicação.');
      
      // Verificar se todos os eventos estão marcados como cancelados
      const { data: eventosCancelados, error: errorCancelados } = await supabase
        .from('agenda')
        .select('*')
        .eq('cancelado', true)
        .gte('datainicio', '2025-03-01')
        .lt('datainicio', '2025-04-01');
        
      if (!errorCancelados) {
        console.log(`Total de eventos CANCELADOS para o período: ${eventosCancelados.length}`);
        
        if (eventosCancelados.length > 0) {
          console.log('\nPrimeiros 5 eventos CANCELADOS:');
          eventosCancelados.slice(0, 5).forEach(evento => {
            console.log(`ID: ${evento.id}`);
            console.log(`Nome: ${evento.nome}`);
            console.log(`Data Início: ${evento.datainicio}`);
            console.log(`Data Final: ${evento.datafinal}`);
            console.log(`Cancelado: ${evento.cancelado}`);
            console.log('---');
          });
        }
      }
      
      // Verificar eventos com cancelado = null
      const { data: eventosNull, error: errorNull } = await supabase
        .from('agenda')
        .select('*')
        .is('cancelado', null)
        .gte('datainicio', '2025-03-01')
        .lt('datainicio', '2025-04-01');
        
      if (!errorNull) {
        console.log(`Total de eventos com cancelado = NULL para o período: ${eventosNull.length}`);
        
        if (eventosNull.length > 0) {
          console.log('\nPrimeiros 5 eventos com cancelado = NULL:');
          eventosNull.slice(0, 5).forEach(evento => {
            console.log(`ID: ${evento.id}`);
            console.log(`Nome: ${evento.nome}`);
            console.log(`Data Início: ${evento.datainicio}`);
            console.log(`Data Final: ${evento.datafinal}`);
            console.log(`Cancelado: ${evento.cancelado}`);
            console.log('---');
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

verificarFormatoDatas();
