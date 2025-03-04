// Script para depurar problemas no calendário
// Salve este arquivo e execute-o no console do navegador quando estiver na página Agenda

(function() {
  // Função para verificar a consulta de eventos
  async function verificarConsultaEventos() {
    // Obter a instância do FullCalendar
    const calendarElement = document.querySelector('.fc');
    if (!calendarElement) {
      console.error('Elemento do calendário não encontrado');
      return;
    }
    
    // Verificar eventos no DOM
    const eventElements = document.querySelectorAll('.fc-event');
    console.log(`Eventos visíveis no DOM: ${eventElements.length}`);
    
    // Verificar filtros ativos
    const filtrosAtivos = {};
    
    // Verificar se há algum filtro de tipo de evento
    const tiposEventos = Array.from(document.querySelectorAll('[data-tipo-evento]')).map(el => el.getAttribute('data-tipo-evento'));
    if (tiposEventos.length > 0) {
      filtrosAtivos.tiposEventos = tiposEventos;
    }
    
    // Verificar se há filtro de status (realizada, cancelada, etc.)
    const statusFiltros = {
      realizada: document.querySelector('.filtro-realizada')?.classList.contains('ativo'),
      cancelada: document.querySelector('.filtro-cancelada')?.classList.contains('ativo'),
      pendente: document.querySelector('.filtro-pendente')?.classList.contains('ativo')
    };
    
    if (Object.values(statusFiltros).some(v => v)) {
      filtrosAtivos.status = statusFiltros;
    }
    
    console.log('Filtros ativos:', filtrosAtivos);
    
    // Fazer uma consulta direta ao Supabase para verificar os eventos
    try {
      // Definir o intervalo de datas para a consulta
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      // Consultar eventos diretamente
      const response = await fetch('https://dieycvogftvfoncigvtl.supabase.co/rest/v1/agenda?select=id,nome,datainicio,datafinal,tipo_evento,realizada,cancelado', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ'
        }
      });
      
      const eventos = await response.json();
      console.log(`Total de eventos no banco: ${eventos.length}`);
      
      // Agrupar eventos por mês
      const eventosPorMes = {};
      eventos.forEach(evento => {
        const data = new Date(evento.datainicio);
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const chave = `${ano}-${mes}`;
        
        if (!eventosPorMes[chave]) {
          eventosPorMes[chave] = [];
        }
        
        eventosPorMes[chave].push(evento);
      });
      
      console.log('Eventos por mês:', eventosPorMes);
      
      // Verificar eventos realizados vs não realizados
      const eventosRealizados = eventos.filter(e => e.realizada === true);
      const eventosNaoRealizados = eventos.filter(e => e.realizada !== true);
      console.log(`Eventos realizados: ${eventosRealizados.length}`);
      console.log(`Eventos não realizados: ${eventosNaoRealizados.length}`);
      
      // Verificar eventos cancelados
      const eventosCancelados = eventos.filter(e => e.cancelado === true);
      console.log(`Eventos cancelados: ${eventosCancelados.length}`);
      
      // Verificar eventos por tipo
      const eventosPorTipo = {};
      eventos.forEach(evento => {
        const tipo = evento.tipo_evento || 'sem_tipo';
        if (!eventosPorTipo[tipo]) {
          eventosPorTipo[tipo] = [];
        }
        eventosPorTipo[tipo].push(evento);
      });
      
      console.log('Eventos por tipo:', eventosPorTipo);
      
      // Verificar eventos de março de 2025
      const eventosMar2025 = eventos.filter(evento => {
        const data = new Date(evento.datainicio);
        return data.getFullYear() === 2025 && data.getMonth() === 2; // Março é mês 2 (0-indexed)
      });
      
      console.log(`Eventos de março de 2025: ${eventosMar2025.length}`);
      if (eventosMar2025.length > 0) {
        console.log('Primeiros 5 eventos de março de 2025:', eventosMar2025.slice(0, 5));
      }
      
      // Verificar eventos de fevereiro de 2025
      const eventosFev2025 = eventos.filter(evento => {
        const data = new Date(evento.datainicio);
        return data.getFullYear() === 2025 && data.getMonth() === 1; // Fevereiro é mês 1 (0-indexed)
      });
      
      console.log(`Eventos de fevereiro de 2025: ${eventosFev2025.length}`);
      if (eventosFev2025.length > 0) {
        console.log('Primeiros 5 eventos de fevereiro de 2025:', eventosFev2025.slice(0, 5));
      }
      
      // Verificar eventos do dia 15 de fevereiro de 2025
      const eventos15Fev2025 = eventos.filter(evento => {
        const data = new Date(evento.datainicio);
        return data.getFullYear() === 2025 && data.getMonth() === 1 && data.getDate() === 15;
      });
      
      console.log(`Eventos do dia 15 de fevereiro de 2025: ${eventos15Fev2025.length}`);
      if (eventos15Fev2025.length > 0) {
        console.log('Eventos do dia 15 de fevereiro de 2025:', eventos15Fev2025);
      }
      
      return {
        totalEventos: eventos.length,
        eventosRealizados: eventosRealizados.length,
        eventosNaoRealizados: eventosNaoRealizados.length,
        eventosCancelados: eventosCancelados.length,
        eventosMar2025: eventosMar2025.length,
        eventosFev2025: eventosFev2025.length,
        eventos15Fev2025: eventos15Fev2025.length
      };
    } catch (error) {
      console.error('Erro ao consultar eventos:', error);
      return { erro: error.message };
    }
  }
  
  // Executar a verificação
  verificarConsultaEventos().then(resultado => {
    console.log('Resumo da verificação:', resultado);
  });
  
  // Verificar se há algum filtro de visualização ativo
  function verificarFiltrosVisualizacao() {
    // Verificar se há algum elemento de filtro no DOM
    const filtros = document.querySelectorAll('.filtro-calendario, .filtro-evento, .filtro-status');
    console.log(`Elementos de filtro encontrados: ${filtros.length}`);
    
    if (filtros.length > 0) {
      console.log('Filtros encontrados:', Array.from(filtros).map(el => ({
        id: el.id,
        classe: el.className,
        ativo: el.classList.contains('ativo') || el.checked
      })));
    }
    
    // Verificar se há algum código JavaScript que pode estar filtrando eventos
    console.log('Verificando funções de filtro no código:');
    
    // Verificar se há alguma função de filtro definida
    const funcoesFiltro = [
      window.filterEvents,
      window.filterCalendarEvents,
      window.applyEventFilter
    ].filter(Boolean);
    
    console.log(`Funções de filtro encontradas: ${funcoesFiltro.length}`);
    
    return {
      filtrosDOM: filtros.length,
      funcoesFiltro: funcoesFiltro.length
    };
  }
  
  // Executar verificação de filtros
  const resultadoFiltros = verificarFiltrosVisualizacao();
  console.log('Resultado da verificação de filtros:', resultadoFiltros);
  
  // Verificar configurações do FullCalendar
  function verificarConfiguracoesCalendario() {
    const calendarElement = document.querySelector('.fc');
    if (!calendarElement) {
      return { erro: 'Elemento do calendário não encontrado' };
    }
    
    // Tentar acessar a API do FullCalendar
    try {
      const calendarApi = calendarElement.__vue__?.$refs?.fullCalendar?.getApi();
      if (!calendarApi) {
        return { erro: 'API do FullCalendar não encontrada' };
      }
      
      // Obter configurações atuais
      const view = calendarApi.view;
      const opcoes = {
        visualizacaoAtual: view.type,
        dataInicial: view.activeStart,
        dataFinal: view.activeEnd,
        titulo: calendarApi.view.title,
        eventSources: calendarApi.getEventSources().map(source => ({
          id: source.id,
          url: source.url
        }))
      };
      
      console.log('Configurações do calendário:', opcoes);
      
      return opcoes;
    } catch (error) {
      console.error('Erro ao acessar configurações do calendário:', error);
      return { erro: error.message };
    }
  }
  
  // Executar verificação de configurações
  const configsCalendario = verificarConfiguracoesCalendario();
  console.log('Configurações do calendário:', configsCalendario);
})();
