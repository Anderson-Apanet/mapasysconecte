import { supabase } from '../utils/supabaseClient';
import { AgendaEvent } from '../types/agenda';

export async function fetchEvents(start?: Date | number | string, end?: Date | number | string) {
  try {
    let query = supabase.from('agenda').select('*');

    // Se for um ID, busca apenas o evento específico
    if (typeof start === 'number') {
      console.log('Buscando evento por ID:', start);
      const { data: eventData, error: eventError } = await query.eq('id', start).single();
      
      if (eventError) {
        console.error('Erro ao buscar evento por ID:', eventError);
        throw eventError;
      }

      if (eventData) {
        // Busca os responsáveis
        const { data: respData, error: respError } = await supabase
          .from('agenda_responsaveis')
          .select('user_id')
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
            console.error('Erro ao buscar usuários:', userError);
            throw userError;
          }

          // Monta o array de responsáveis
          eventData.responsaveis = userData?.map(user => ({
            id: user.id_user,
            nome: user.nome || ''
          })) || [];
        } else {
          eventData.responsaveis = [];
        }
      }
      
      console.log('Evento encontrado:', eventData);
      return eventData;
    }

    // Se for uma data, busca eventos no período
    if (start instanceof Date) {
      query = query.gte('datainicio', start.toISOString());
    }

    if (end instanceof Date) {
      query = query.lte('datafinal', end.toISOString());
    }

    const { data: eventsData, error: eventsError } = await query.order('datainicio', { ascending: true });

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      throw eventsError;
    }

    // Para cada evento, busca seus responsáveis
    const formattedData = await Promise.all((eventsData || []).map(async (event) => {
      // Busca os responsáveis do evento
      const { data: respData, error: respError } = await supabase
        .from('agenda_responsaveis')
        .select('user_id')
        .eq('agenda_id', event.id);

      if (respError) {
        console.error('Erro ao buscar responsáveis do evento:', event.id, respError);
        return { ...event, responsaveis: [] };
      }

      // Se encontrou responsáveis, busca os dados dos usuários
      if (respData && respData.length > 0) {
        const userIds = respData.map(r => r.user_id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id_user, nome')
          .in('id_user', userIds);

        if (userError) {
          console.error('Erro ao buscar usuários dos responsáveis:', userError);
          return { ...event, responsaveis: [] };
        }

        // Monta o array de responsáveis
        return {
          ...event,
          responsaveis: userData?.map(user => ({
            id: user.id_user,
            nome: user.nome || ''
          })) || []
        };
      }

      return { ...event, responsaveis: [] };
    }));

    return formattedData;
  } catch (error) {
    console.error('Erro ao carregar eventos:', error);
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
        const responsaveisData = event.responsaveis.map(resp => ({
          agenda_id: newEvent.id,
          user_id: resp.id
        }));

        const { error: respError } = await supabase
          .from('agenda_responsaveis')
          .insert(responsaveisData);

        if (respError) {
          console.error('Erro ao inserir responsáveis:', respError);
          throw respError;
        }
      }

      return newEvent;
    } else {
      // Atualiza o evento existente
      const { data: updatedEvent, error: eventError } = await supabase
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

      if (eventError) {
        console.error('Erro ao atualizar evento:', eventError);
        throw eventError;
      }

      // Remove todos os responsáveis antigos
      const { error: deleteError } = await supabase
        .from('agenda_responsaveis')
        .delete()
        .eq('agenda_id', event.id);

      if (deleteError) {
        console.error('Erro ao remover responsáveis antigos:', deleteError);
        throw deleteError;
      }

      // Se tem novos responsáveis, insere
      if (event.responsaveis && event.responsaveis.length > 0) {
        const responsaveisData = event.responsaveis.map(resp => ({
          agenda_id: event.id,
          user_id: resp.id
        }));

        const { error: respError } = await supabase
          .from('agenda_responsaveis')
          .insert(responsaveisData);

        if (respError) {
          console.error('Erro ao inserir novos responsáveis:', respError);
          throw respError;
        }
      }

      return updatedEvent;
    }
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
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
