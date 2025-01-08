import { supabase } from '../utils/supabaseClient';
import { AgendaEvent } from '../types/agenda';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function fetchEvents(start: Date, end: Date) {
  try {
    console.log('Buscando eventos para o período:', { start, end });
    
    const { data, error } = await supabase
      .from('agenda')
      .select('*')
      .gte('datainicio', start.toISOString())
      .lte('datafinal', end.toISOString())
      .order('datainicio', { ascending: true });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao carregar eventos:', error);
    throw error;
  }
}

export async function saveEvent(event: Partial<AgendaEvent>, selectedEvent: AgendaEvent | null) {
  const url = selectedEvent 
    ? `${API_BASE_URL}/api/agenda/${selectedEvent.id}`
    : `${API_BASE_URL}/api/agenda`;
  
  const method = selectedEvent ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || 'Falha ao salvar evento');
  }

  return response.json();
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

export function transformEvents(events: AgendaEvent[]) {
  console.log('Transformando eventos - Total:', events.length);
  return events.map(event => {
    try {
      const startDate = new Date(event.datainicio);
      const endDate = new Date(event.datafinal);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log('Data inválida para o evento:', event);
        return null;
      }

      // Define a cor de fundo com base no status e na cor do evento
      const isRealizada = event.realizada === true;
      const eventColor = isRealizada ? '#E2E8F0' : event.cor;
      const textColor = isRealizada ? '#1F2937' : '#ffffff';

      return {
        id: event.id.toString(),
        title: `[${event.tipo_evento}] ${event.nome || 'Sem título'}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: textColor,
        allDay: !event.horamarcada,
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
    } catch (error) {
      console.error('Erro ao transformar evento:', event, error);
      return null;
    }
  }).filter(event => event !== null);
}
