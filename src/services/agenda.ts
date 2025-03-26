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
          criador,
          novoendereco
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
        criador,
        novoendereco
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
      
      // Busca o ID da empresa do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('empresa_id')
        .eq('email', userEmail)
        .single();
        
      if (userError) {
        console.error('Erro ao buscar empresa do usuário:', userError);
        throw userError;
      }
      
      const empresaId = userData?.empresa_id;
      console.log('ID da empresa do usuário:', empresaId);
      
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
          data_cad_evento: currentDateTime,
          empresa_id: empresaId, // Adiciona o ID da empresa do usuário
          novoendereco: event.novoendereco // Adiciona o novo endereço para eventos de Troca de Endereço
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
            user_id: resp.id,
            empresa_id: empresaId // Adiciona o ID da empresa do usuário
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
          cor: event.cor,
          novoendereco: event.novoendereco // Adiciona o campo novoendereco ao atualizar um evento existente
          // Não atualiza os campos criador, data_cad_evento e empresa_id para manter o registro original
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

        // Obtém o usuário atual do Supabase para buscar a empresa
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || 'sistema';
        
        // Busca o ID da empresa do usuário
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('empresa_id')
          .eq('email', userEmail)
          .single();
          
        if (userError) {
          console.error('Erro ao buscar empresa do usuário na atualização:', userError);
          throw userError;
        }
        
        const empresaId = userData?.empresa_id;
        console.log('ID da empresa do usuário na atualização:', empresaId);

        // Se tem novos responsáveis, insere
        if (event.responsaveis.length > 0) {
          // Filtra apenas responsáveis válidos (com id)
          const responsaveisValidos = event.responsaveis.filter(resp => resp && resp.id);
          
          if (responsaveisValidos.length > 0) {
            const responsaveisInsert = responsaveisValidos.map(resp => ({
              agenda_id: event.id,
              user_id: resp.id,
              empresa_id: empresaId // Adiciona o ID da empresa do usuário
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

export async function searchContratos(searchTerm: string): Promise<Array<{ id: number; pppoe: string; endereco: string; cliente_nome?: string }>> {
  if (!searchTerm) {
    return [];
  }

  const { data, error } = await supabase
    .from('contratos')
    .select('id, pppoe, endereco, clientes(nome)')
    .ilike('pppoe', `%${searchTerm}%`)
    .limit(10);

  if (error) throw error;
  
  // Formatar os dados para incluir o nome do cliente
  return data?.map(contrato => ({
    id: contrato.id,
    pppoe: contrato.pppoe,
    endereco: contrato.endereco,
    cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado'
  })) || [];
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
    console.log('updateEventDates - Parâmetros recebidos:', { eventId, start, end });
    console.log('updateEventDates - Tipo do ID:', typeof eventId);
    
    if (!eventId || isNaN(eventId)) {
      console.error('updateEventDates - ID de evento inválido:', eventId);
      return { data: null, error: new Error('ID de evento inválido') };
    }
    
    if (!start || !end) {
      console.error('updateEventDates - Datas inválidas:', { start, end });
      return { data: null, error: new Error('Datas inválidas') };
    }
    
    // Garantir que o ID seja um número
    const numericId = Number(eventId);
    
    console.log('updateEventDates - Enviando requisição para o Supabase com ID:', numericId);
    
    const { data, error } = await supabase
      .from('agenda')
      .update({
        datainicio: start,
        datafinal: end,
      })
      .eq('id', numericId)
      .select();
    
    if (error) {
      console.error('updateEventDates - Erro Supabase ao atualizar datas do evento:', error);
      return { data: null, error };
    }
    
    console.log('updateEventDates - Resposta do Supabase:', data);
    
    return { data, error: null };
  } catch (error) {
    console.error('updateEventDates - Erro ao atualizar evento:', error);
    if (error instanceof Error) {
      console.error('updateEventDates - Mensagem de erro:', error.message);
      console.error('updateEventDates - Stack trace:', error.stack);
    }
    return { data: null, error: error instanceof Error ? error : new Error('Erro desconhecido') };
  }
}

export async function updateContratoStatus(pppoe: string, status: string) {
  try {
    const { error } = await supabase
      .from('contratos')
      .update({ status })
      .eq('pppoe', pppoe);

    if (error) {
      console.error('Erro ao atualizar status do contrato:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do contrato:', error);
    throw error;
  }
}

export async function deleteEvent(eventId: number): Promise<boolean> {
  try {
    console.log(`Iniciando processo de exclusão do evento ID: ${eventId}`);
    console.log('Tipo do ID recebido:', typeof eventId);
    
    // Garantir que o ID seja um número
    const numericId = Number(eventId);
    
    if (isNaN(numericId) || numericId <= 0) {
      console.error('ID de evento inválido ou não numérico:', eventId);
      return false;
    }
    
    // Verificar se o evento existe antes de tentar excluir
    console.log(`Verificando existência do evento ID: ${numericId}`);
    const { data: existingEvent, error: checkError } = await supabase
      .from('agenda')
      .select('id, nome')
      .eq('id', numericId)
      .single();
      
    if (checkError) {
      console.error('Erro ao verificar existência do evento:', checkError);
      return false;
    }
    
    if (!existingEvent) {
      console.error(`Evento com ID ${numericId} não encontrado`);
      return false;
    }
    
    console.log(`Evento encontrado: ${JSON.stringify(existingEvent)}`);
    console.log(`Prosseguindo com a exclusão do evento ID: ${numericId}`);
    
    // Executar a exclusão
    const { error } = await supabase
      .from('agenda')
      .delete()
      .eq('id', numericId);
    
    if (error) {
      console.error('Erro ao excluir evento:', error);
      return false;
    }
    
    console.log(`Evento ID ${numericId} excluído com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    return false;
  }
}

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
            criador: event.criador,
            novoendereco: event.novoendereco, // Adicionando o campo novoendereco às propriedades estendidas
            endereco: event.endereco // Incluindo também o endereço original
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
