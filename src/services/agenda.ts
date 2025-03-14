import { supabase } from '../utils/supabaseClient';
import { AgendaEvent } from '../types/agenda';

export async function fetchEvents(startDate?: Date | string | number, endDate?: Date | string) {
  console.log('Buscando eventos com parâmetros:', { startDate, endDate });
  
  try {
    // Se startDate for um número, assume que é um ID de evento específico
    if (typeof startDate === 'number') {
      console.log('Buscando evento específico por ID:', startDate);
      const { data: eventData, error } = await supabase
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
        .eq('id', startDate)
        .single();

      if (error) {
        console.error('Erro ao buscar evento específico:', error);
        throw error;
      }

      // Como a tabela agenda_responsaveis está vazia, retornamos o evento sem responsáveis
      return { ...eventData, responsaveis: [] };
    }

    // Converte as datas para o formato ISO se necessário
    const startDateISO = startDate instanceof Date ? startDate.toISOString() : startDate;
    const endDateISO = endDate instanceof Date ? endDate.toISOString() : endDate;
    
    console.log('Buscando eventos para o período:', startDateISO, 'até', endDateISO);
    
    // Consulta com filtro de período
    let query = supabase
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
    
    // Descobrimos que todos os eventos têm cancelado = null, então não filtramos por cancelado
    // query = query.eq('cancelado', false);
    
    // Aplicamos filtro de data apenas se ambas as datas forem fornecidas
    if (startDateISO && endDateISO) {
      // Extrair as datas sem tempo para usar na consulta
      const startDateOnly = startDateISO.split('T')[0];
      const endDateOnly = endDateISO.split('T')[0];
      
      console.log('Usando datas para filtro:', startDateOnly, 'até', endDateOnly);
      
      // Buscar eventos que começam dentro do período visualizado
      // Usamos a abordagem mais simples e direta
      query = query
        .gte('datainicio', startDateOnly)
        .lt('datainicio', endDateOnly + 'T23:59:59');
      
      // Limitar o número de resultados para evitar sobrecarga
      query = query.limit(500);
    } else {
      // Se não houver datas, limitar a um número pequeno para evitar sobrecarga
      query = query.limit(100);
    }
    
    const { data: eventData, error: eventError } = await query;

    if (eventError) {
      console.error('Erro ao buscar eventos:', eventError);
      throw eventError;
    }

    // Log para depuração - mostrar todos os eventos antes da filtragem
    console.log('Total de eventos encontrados no banco para o período:', eventData?.length);
    
    // Verificar eventos por mês para depuração
    const eventosPorMes = {};
    eventData?.forEach(event => {
      try {
        const data = new Date(event.datainicio);
        if (!isNaN(data.getTime())) {
          const mes = data.getMonth() + 1;
          const ano = data.getFullYear();
          const chave = `${ano}-${mes}`;
          
          if (!eventosPorMes[chave]) {
            eventosPorMes[chave] = 0;
          }
          
          eventosPorMes[chave]++;
        } else {
          console.log('Data inválida para o evento:', event.id, event.datainicio);
        }
      } catch (error) {
        console.error('Erro ao processar data do evento:', event.id, error);
      }
    });
    
    console.log('Distribuição de eventos por mês:', eventosPorMes);

    // Como a tabela agenda_responsaveis está vazia, adicionamos um array vazio de responsáveis a cada evento
    const eventsWithResponsaveis = eventData.map(event => {
      return {
        ...event,
        responsaveis: []
      };
    });
    
    return eventsWithResponsaveis;
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    throw error;
  }
}

export async function saveEvent(event: Partial<AgendaEvent>, existingEvent?: AgendaEvent | null) {
  try {
    console.log('Salvando evento:', event);
    
    // Se não tem ID, é um novo evento
    if (!event.id) {
      // Obtém o usuário atual do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'sistema';
      
      // Cria a data atual no formato ISO com o timezone local
      // Isso garante que a data seja salva com o horário correto de Brasília (UTC-3)
      const now = new Date();
      // Formata a data manualmente para garantir o fuso horário correto
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // Cria a string no formato ISO 8601 com o timezone de Brasília explícito
      const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
      
      console.log('Usuário atual:', userEmail);
      console.log('Data de criação:', currentDateTime);
      
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
          cor: event.cor,
          criador: userEmail,
          data_cad_evento: currentDateTime
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
          // Não atualiza os campos criador e data_cad_evento para manter o registro original de criação
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

export async function searchContratos(searchTerm: string): Promise<Array<{ id: number; pppoe: string; endereco: string }>> {
  if (!searchTerm) {
    return [];
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('id, pppoe, endereco')
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

export function transformEvents(events) {
  if (!events || events.length === 0) {
    console.log('Nenhum evento para transformar');
    return [];
  }

  console.log('Transformando', events.length, 'eventos');
  
  // Filtrar eventos por data atual para depuração
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  
  const eventosMesAtual = events.filter(event => {
    try {
      const dataInicio = new Date(event.datainicio);
      return dataInicio.getFullYear() === anoAtual && (dataInicio.getMonth() + 1) === mesAtual;
    } catch (e) {
      return false;
    }
  });
  
  console.log(`Eventos do mês atual (${anoAtual}-${mesAtual}):`, eventosMesAtual.length);
  
  const transformedEvents = events
    .map(event => {
      try {
        // Verificar se o evento foi cancelado
        if (event.cancelado === true) {
          console.log(`Evento ${event.id} não será exibido pois está cancelado`);
          return null; // Não exibe eventos cancelados
        }

        // Verificar se a data de início é válida
        if (!event.datainicio) {
          console.log(`Evento ${event.id} não possui data de início válida`);
          return null;
        }

        // Remover o 'Z' do final da string de data para evitar problemas de fuso horário
        let start = event.datainicio;
        let end = event.datafinal || event.datainicio; // Se não tiver data final, usa a data inicial

        // Remover o 'Z' se existir
        if (typeof start === 'string' && start.endsWith('Z')) {
          start = start.slice(0, -1);
        }
        if (typeof end === 'string' && end.endsWith('Z')) {
          end = end.slice(0, -1);
        }

        // Verificar se as datas são válidas após a transformação
        const startDate = new Date(start);
        let endDate = new Date(end);
        
        if (isNaN(startDate.getTime())) {
          console.log(`Evento ${event.id} possui data de início inválida após transformação:`, start);
          return null;
        }
        
        // Se a data final for inválida ou igual à data inicial, define como data inicial + 1 hora
        if (isNaN(endDate.getTime()) || endDate.getTime() === startDate.getTime()) {
          endDate = new Date(startDate.getTime());
          endDate.setHours(endDate.getHours() + 1);
          console.log(`Evento ${event.id} teve sua data final ajustada para data inicial + 1 hora`);
        }
        
        // Adicionar log para depuração de eventos do mês atual
        const eventoMes = startDate.getMonth() + 1;
        const eventoAno = startDate.getFullYear();
        if (eventoAno === anoAtual && eventoMes === mesAtual) {
          console.log(`Evento do mês atual: ID=${event.id}, Título=${event.nome}, Data=${startDate.toISOString()}`);
        }

        // Determinar a cor do evento com base nas regras
        let backgroundColor = event.cor || '#3788d8'; // Cor padrão azul do FullCalendar
        let textColor = '#ffffff'; // Texto branco por padrão
        let borderColor = backgroundColor;

        // Regras de cor baseadas no status do evento
        if (event.realizada === true) {
          backgroundColor = '#28a745'; // Verde para eventos realizados
        } else if (event.parcial === true) {
          backgroundColor = '#ffc107'; // Amarelo para eventos parcialmente realizados
          textColor = '#000000'; // Texto preto para melhor contraste
        } else if (event.prioritario === true) {
          backgroundColor = '#dc3545'; // Vermelho para eventos prioritários
        }

        // Criar o objeto de evento formatado para o FullCalendar
        const formattedEvent = {
          id: event.id,
          title: event.nome,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          description: event.descricao || '',
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: {
            tipo_evento: event.tipo_evento,
            horamarcada: event.horamarcada,
            prioritario: event.prioritario,
            realizada: event.realizada,
            parcial: event.parcial,
            cancelado: event.cancelado,
            pppoe: event.pppoe,
            responsaveis: event.responsaveis || [], // Array vazio se não houver responsáveis
            criador: event.criador
          }
        };

        return formattedEvent;
      } catch (error) {
        console.error(`Erro ao transformar evento ${event.id}:`, error);
        return null;
      }
    })
    .filter(event => event !== null); // Remover eventos nulos (cancelados ou com erros)

  console.log('Total de eventos após transformação:', transformedEvents.length);
  return transformedEvents;
}
