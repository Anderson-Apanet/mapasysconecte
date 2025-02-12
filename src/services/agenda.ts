import { supabase } from '../utils/supabaseClient';
import { AgendaEvent } from '../types/agenda';

export async function fetchEvents(start?: Date | number | string, end?: Date | number | string) {
  try {
    // Se start for um número, assume que é um ID de evento
    if (typeof start === 'number') {
      const { data: eventData, error: eventError } = await supabase
        .from('agenda')
        .select(`
          id,
          nome,
          descricao,
          datainicio,
          datafinal,
          tipo_evento,
          horamarcada,
          prioritario,
          realizada,
          parcial,
          cancelado,
          pppoe,
          cor,
          data_cad_evento,
          criador
        `)
        .eq('id', start)
        .single();

      if (eventError) {
        console.error('Erro ao buscar evento:', eventError);
        throw eventError;
      }

      if (!eventData) {
        return null;
      }

      // Busca os responsáveis para o evento
      const { data: respData, error: respError } = await supabase
        .from('agenda_responsaveis')
        .select(`user_id`)
        .eq('agenda_id', eventData.id);

      if (respError) {
        console.error('Erro ao buscar responsáveis:', respError);
        throw respError;
      }

      // Se encontrou responsáveis, busca os dados dos usuários
      if (respData && respData.length > 0) {
        const userIds = respData.map(r => r.user_id);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id_user, nome')
          .in('id_user', userIds);

        if (userError) {
          console.error('Erro ao buscar dados dos usuários:', userError);
          throw userError;
        }

        // Mapeia os dados dos usuários para o formato esperado
        const responsaveis = userData.map(user => ({
          id: user.id_user,
          nome: user.nome
        }));

        return {
          ...eventData,
          responsaveis
        };
      }

      return {
        ...eventData,
        responsaveis: []
      };
    }

    // Caso contrário, continua com a lógica de buscar eventos por período
    const startDate = start instanceof Date ? start.toISOString() : start;
    const endDate = end instanceof Date ? end.toISOString() : end;

    console.log('Buscando eventos entre:', startDate, 'e', endDate);

    // Busca os eventos
    const { data: eventData, error: eventError } = await supabase
      .from('agenda')
      .select(`
        id,
        nome,
        descricao,
        datainicio,
        datafinal,
        tipo_evento,
        horamarcada,
        prioritario,
        realizada,
        parcial,
        cancelado,
        pppoe,
        cor,
        data_cad_evento,
        criador
      `);

    if (eventError) {
      console.error('Erro ao buscar eventos:', eventError);
      throw eventError;
    }

    // Filtra os eventos pelo período
    const filteredEvents = eventData.filter(event => {
      const eventStart = new Date(event.datainicio);
      const eventEnd = new Date(event.datafinal);
      const filterStart = startDate ? new Date(startDate) : null;
      const filterEnd = endDate ? new Date(endDate) : null;

      return (!filterStart || eventStart >= filterStart) && 
             (!filterEnd || eventEnd <= filterEnd);
    });

    // Para cada evento, busca os responsáveis
    const eventsWithResponsaveis = await Promise.all(filteredEvents.map(async (eventData) => {
      try {
        // Busca os responsáveis
        const { data: respData, error: respError } = await supabase
          .from('agenda_responsaveis')
          .select(`user_id`)
          .eq('agenda_id', eventData.id);

        if (respError) {
          console.error('Erro ao buscar responsáveis:', respError);
          throw respError;
        }

        // Se encontrou responsáveis, busca os dados dos usuários
        if (respData && respData.length > 0) {
          const userIds = respData.map(r => r.user_id);
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id_user, nome')
            .in('id_user', userIds);

          if (userError) {
            console.error('Erro ao buscar dados dos usuários:', userError);
            throw userError;
          }

          // Mapeia os dados dos usuários para o formato esperado
          const responsaveis = userData.map(user => ({
            id: user.id_user,
            nome: user.nome
          }));

          return {
            ...eventData,
            responsaveis
          };
        }

        // Se não encontrou responsáveis, retorna o evento sem responsáveis
        return {
          ...eventData,
          responsaveis: []
        };
      } catch (error) {
        console.error('Erro ao processar responsáveis do evento:', error);
        return {
          ...eventData,
          responsaveis: []
        };
      }
    }));

    return eventsWithResponsaveis;
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    throw error;
  }
}

export async function saveEvent(event: Partial<AgendaEvent>) {
  try {
    console.log('Salvando evento:', event);
    
    // Se não tem ID, é um novo evento
    if (!event.id) {
      // Insere o evento
      const { data: newEvent, error: eventError } = await supabase
        .from('agenda')
        .insert({
          nome: event.nome,
          descricao: event.descricao,
          datainicio: event.datainicio,
          datafinal: event.datafinal,
          tipo_evento: event.tipo_evento,
          horamarcada: event.horamarcada,
          prioritario: event.prioritario,
          realizada: event.realizada,
          parcial: event.parcial,
          cancelado: event.cancelado,
          pppoe: event.pppoe,
          cor: event.cor
        })
        .select()
        .single();

      if (eventError) {
        console.error('Erro ao inserir evento:', eventError);
        throw eventError;
      }

      // Se tem responsáveis, insere na tabela de relacionamento
      if (event.responsaveis && event.responsaveis.length > 0) {
        console.log('Responsáveis a serem inseridos:', event.responsaveis);
        
        // Filtra apenas responsáveis válidos (com id)
        const responsaveisValidos = event.responsaveis.filter(resp => resp && resp.id);
        
        if (responsaveisValidos.length > 0) {
          const responsaveisInsert = responsaveisValidos.map(resp => ({
            agenda_id: newEvent.id,
            user_id: resp.id
          }));

          console.log('Dados preparados para inserção:', responsaveisInsert);

          const { error: responsaveisError } = await supabase
            .from('agenda_responsaveis')
            .insert(responsaveisInsert);

          if (responsaveisError) {
            console.error('Erro ao inserir responsáveis. Detalhes:', responsaveisError);
            throw new Error(`Erro ao inserir responsáveis: ${JSON.stringify(responsaveisError)}`);
          }
        }
      }

      return newEvent;
    } else {
      // Atualiza o evento existente
      const { data: updatedEvent, error: updateError } = await supabase
        .from('agenda')
        .update({
          nome: event.nome,
          descricao: event.descricao,
          datainicio: event.datainicio,
          datafinal: event.datafinal,
          tipo_evento: event.tipo_evento,
          horamarcada: event.horamarcada,
          prioritario: event.prioritario,
          realizada: event.realizada,
          parcial: event.parcial,
          cancelado: event.cancelado,
          pppoe: event.pppoe,
          cor: event.cor
        })
        .eq('id', event.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar evento:', updateError);
        throw updateError;
      }

      // Atualiza os responsáveis
      if (event.responsaveis) {
        console.log('Atualizando responsáveis para o evento:', event.id);
        
        // Primeiro remove todos os responsáveis antigos
        const { error: deleteError } = await supabase
          .from('agenda_responsaveis')
          .delete()
          .eq('agenda_id', event.id);

        if (deleteError) {
          console.error('Erro ao remover responsáveis antigos:', deleteError);
          throw new Error(`Erro ao remover responsáveis antigos: ${JSON.stringify(deleteError)}`);
        }

        // Se tem novos responsáveis, insere
        if (event.responsaveis.length > 0) {
          // Filtra apenas responsáveis válidos (com id)
          const responsaveisValidos = event.responsaveis.filter(resp => resp && resp.id);
          
          if (responsaveisValidos.length > 0) {
            const responsaveisInsert = responsaveisValidos.map(resp => ({
              agenda_id: event.id,
              user_id: resp.id
            }));

            console.log('Dados preparados para inserção:', responsaveisInsert);

            const { error: responsaveisError } = await supabase
              .from('agenda_responsaveis')
              .insert(responsaveisInsert);

            if (responsaveisError) {
              console.error('Erro ao inserir novos responsáveis. Detalhes:', responsaveisError);
              throw new Error(`Erro ao inserir novos responsáveis: ${JSON.stringify(responsaveisError)}`);
            }
          }
        }
      }

      return updatedEvent;
    }
  } catch (error) {
    console.error('Erro ao salvar evento. Detalhes completos:', error);
    throw error;
  }
}

export async function searchContratos(searchTerm: string) {
  if (!searchTerm) {
    return [];
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('id, pppoe')
    .ilike('pppoe', `%${searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id_user, nome');

  if (error) {
    console.error('Erro Supabase:', error);
    throw error;
  }
  
  return data?.map(user => ({
    id: user.id_user,
    nome: user.nome
  })) || [];
}

export async function updateEventDates(eventId: number, start: string, end: string) {
  try {
    const { data, error } = await supabase
      .from('agenda')
      .update({
        datainicio: start,
        datafinal: end,
      })
      .eq('id', eventId)
      .select();

    if (error) {
      console.error('Erro ao atualizar datas do evento:', error);
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    throw error;
  }
}

export const updateContratoStatus = async (pppoe: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('contratos')
      .update({ status })
      .eq('pppoe', pppoe);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status do contrato:', error);
    throw error;
  }
};

export function transformEvents(events: AgendaEvent[]) {
  console.log('Transformando eventos - Total:', events.length);
  return events.map(event => {
    try {
      // Garantir que as datas sejam tratadas como UTC para evitar problemas de fuso horário
      const startDate = new Date(event.datainicio + 'Z');
      const endDate = new Date(event.datafinal + 'Z');

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log('Data inválida para o evento:', event);
        return null;
      }

      // Define a cor de fundo com base no tipo de evento e status
      const isRealizada = event.realizada === true;
      let eventColor;
      
      if (isRealizada) {
        eventColor = '#E2E8F0'; // Cinza para eventos realizados
      } else {
        // Define a cor com base no tipo de evento
        switch (event.tipo_evento?.toLowerCase()) {
          case 'instalação':
            eventColor = '#3788d8'; // Azul para instalações
            break;
          case 'visita':
            eventColor = '#10B981'; // Verde para visitas
            break;
          default:
            eventColor = '#6B7280'; // Cinza escuro para outros tipos
        }
      }

      const textColor = isRealizada ? '#1F2937' : '#ffffff';

      // Verifica se o evento é para o dia todo
      const isAllDay = !event.horamarcada;

      // Formata a hora para exibição
      const startTime = new Date(event.datainicio).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Formata o título do evento para mostrar apenas informações essenciais
      const title = event.horamarcada
        ? `${startTime}\n${event.tipo_evento}\n${event.usuario_resp || 'Sem responsável'}`
        : `${event.tipo_evento}\n${event.usuario_resp || 'Sem responsável'}`;

      const transformedEvent = {
        id: event.id.toString(),
        title: title,
        start: event.datainicio,
        end: event.datafinal,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: textColor,
        allDay: isAllDay,
        display: 'block',
        classNames: [
          isRealizada ? 'event-realizada' : '',
          event.cancelado ? 'event-cancelada' : '',
          event.parcial ? 'event-parcial' : '',
          event.prioritario ? 'event-prioritaria' : '',
          isAllDay ? 'event-all-day' : 'event-timed',
          'custom-calendar-event',
          `event-type-${event.tipo_evento?.toLowerCase().replace(/\s+/g, '-') || 'outros'}` // Nova classe baseada no tipo
        ].filter(Boolean),
        extendedProps: {
          descricao: event.descricao,
          tipo_evento: event.tipo_evento,
          usuario_resp: event.usuario_resp,
          horamarcada: event.horamarcada,
          prioritario: event.prioritario,
          realizada: event.realizada,
          parcial: event.parcial,
          cancelado: event.cancelado,
          pppoe: event.pppoe
        }
      };

      return transformedEvent;
    } catch (error) {
      console.error('Erro ao transformar evento:', event, error);
      return null;
    }
  }).filter(event => event !== null);
}
