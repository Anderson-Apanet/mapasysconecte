// Script para verificar eventos no calendário
// Salve este arquivo e execute-o no console do navegador quando estiver na página Agenda

(function() {
  // Função para verificar os eventos no calendário
  function verificarEventosCalendario() {
    // Obter a instância do FullCalendar
    const calendarApi = document.querySelector('.fc').classList.contains('fc') 
      ? document.querySelector('.fc').__vue__.$refs.fullCalendar.getApi()
      : null;
    
    if (!calendarApi) {
      console.error('Não foi possível encontrar a instância do FullCalendar');
      return;
    }
    
    // Obter eventos do calendário
    const eventos = calendarApi.getEvents();
    console.log(`Total de eventos carregados no calendário: ${eventos.length}`);
    
    // Verificar eventos de março de 2025
    const dataInicio = new Date('2025-03-01T00:00:00');
    const dataFim = new Date('2025-03-31T23:59:59');
    
    const eventosMar2025 = eventos.filter(evento => {
      const eventoInicio = new Date(evento.start);
      return eventoInicio >= dataInicio && eventoInicio <= dataFim;
    });
    
    console.log(`Eventos em março de 2025 no calendário: ${eventosMar2025.length}`);
    
    if (eventosMar2025.length > 0) {
      console.log('Primeiros 5 eventos de março de 2025:');
      eventosMar2025.slice(0, 5).forEach(evento => {
        console.log({
          id: evento.id,
          title: evento.title,
          start: evento.start,
          end: evento.end,
          allDay: evento.allDay,
          extendedProps: evento.extendedProps
        });
      });
    }
    
    // Verificar o formato das datas nos eventos
    console.log('Verificando formato das datas nos eventos:');
    const eventosComProblema = eventos.filter(evento => {
      const eventoInicio = new Date(evento.start);
      return isNaN(eventoInicio.getTime());
    });
    
    if (eventosComProblema.length > 0) {
      console.log(`Encontrados ${eventosComProblema.length} eventos com problemas nas datas`);
      console.log('Exemplos de eventos com problema:');
      eventosComProblema.slice(0, 3).forEach(evento => {
        console.log({
          id: evento.id,
          title: evento.title,
          start: evento.start,
          end: evento.end
        });
      });
    } else {
      console.log('Não foram encontrados eventos com problemas nas datas');
    }
    
    // Verificar a configuração de visualização atual
    const view = calendarApi.view;
    console.log('Visualização atual:', view.type);
    console.log('Intervalo de datas visível:', {
      inicio: view.activeStart,
      fim: view.activeEnd,
      titulo: calendarApi.view.title
    });
    
    // Verificar se há eventos visíveis na tela
    const eventosVisiveis = eventos.filter(evento => {
      const eventoInicio = new Date(evento.start);
      return eventoInicio >= view.activeStart && eventoInicio <= view.activeEnd;
    });
    
    console.log(`Eventos visíveis no intervalo atual: ${eventosVisiveis.length}`);
    
    return {
      totalEventos: eventos.length,
      eventosMar2025: eventosMar2025.length,
      eventosComProblema: eventosComProblema.length,
      eventosVisiveis: eventosVisiveis.length
    };
  }
  
  // Executar a verificação
  const resultado = verificarEventosCalendario();
  console.log('Resumo da verificação:', resultado);
  
  // Retornar o resultado para uso posterior
  return resultado;
})();
