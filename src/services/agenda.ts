import { supabase } from '../utils/supabaseClient';
import { AgendaEvent } from '../types/agenda';

export async function fetchEvents(start?: Date | number | string, end?: Date | number | string) {
  try {
    let query = supabase.from('agenda').select('*');

    // Se for um ID, busca apenas o evento específico
    if (typeof start === 'number') {
      console.log('Buscando evento por ID:', start);
      const { data, error } = await query.eq('id', start).single();
      
      if (error) {
        console.error('Erro ao buscar evento por ID:', error);
        throw error;
      }
      
      console.log('Evento encontrado:', data);
      return data;
    }

    // Se for uma data, busca eventos no período
    if (start instanceof Date) {
      query = query.gte('datainicio', start.toISOString());
    }

    if (end instanceof Date) {
      query = query.lte('datafinal', end.toISOString());
    }

    const { data, error } = await query.order('datainicio', { ascending: true });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao carregar eventos:', error);
    throw error;
  }
}

export async function saveEvent(event: Partial<AgendaEvent>, selectedEvent: AgendaEvent | null) {
  try {
    if (selectedEvent?.id) {
      // Atualiza evento existente
      const { data, error } = await supabase
        .from('agenda')
        .update(event)
        .eq('id', selectedEvent.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Cria novo evento
      const { data, error } = await supabase
        .from('agenda')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
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
    .select('id_user, nome')
    .order('nome');

  if (error) {
    console.error('Erro Supabase:', error);
    throw error;
  }
  
  return data?.map(user => ({
    id: user.id_user,
    nome: user.nome || ''
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

      // Define a cor de fundo com base no status e na cor do evento
      const isRealizada = event.realizada === true;
      const eventColor = isRealizada ? '#E2E8F0' : event.cor;
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
          'custom-calendar-event' // Nova classe para estilização personalizada
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
