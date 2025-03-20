import { supabase } from '../lib/supabase';

export interface TipoMensagem {
  id?: number;
  nome: string;
  dias: number; // Positivo para dias antes do vencimento, negativo para dias após o vencimento
  mensagem_template: string;
  ativo?: boolean; // Esta propriedade é usada apenas na interface, não existe no banco de dados
}

export interface MensagemEnviada {
  id?: number;
  id_contrato: number;
  id_tipo_mensagem: number;
  data_envio?: string;
  telefone: string;
  nome_cliente: string;
  mensagem_enviada: string;
  tipos_mensagem?: {
    nome: string;
  };
}

// Buscar todos os tipos de mensagem
export const fetchTiposMensagem = async (): Promise<TipoMensagem[]> => {
  const { data, error } = await supabase
    .from('tipos_mensagem')
    .select('*');

  if (error) {
    console.error('Erro ao buscar tipos de mensagem:', error);
    throw error;
  }

  // Adiciona a propriedade ativo (não está na tabela, mas usada na interface)
  return data.map(tipo => ({
    ...tipo,
    ativo: true // Por padrão, consideramos todos os tipos como ativos
  }));
};

// Criar ou atualizar um tipo de mensagem
export const upsertTipoMensagem = async (tipoMensagem: TipoMensagem): Promise<TipoMensagem> => {
  const { id, ativo, ...dadosBanco } = tipoMensagem;
  
  if (id) {
    // Atualizar tipo existente
    const { data, error } = await supabase
      .from('tipos_mensagem')
      .update(dadosBanco)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar tipo de mensagem:', error);
      throw error;
    }

    return { ...data, ativo: true };
  } else {
    // Criar novo tipo
    const { data, error } = await supabase
      .from('tipos_mensagem')
      .insert(dadosBanco)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tipo de mensagem:', error);
      throw error;
    }

    return { ...data, ativo: true };
  }
};

// Excluir um tipo de mensagem
export const deleteTipoMensagem = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('tipos_mensagem')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir tipo de mensagem:', error);
    throw error;
  }
};

// Registrar uma mensagem enviada
export const registrarMensagemEnviada = async (mensagem: MensagemEnviada): Promise<MensagemEnviada> => {
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .insert(mensagem)
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar mensagem enviada:', error);
    throw error;
  }

  return data;
};

// Buscar histórico de mensagens enviadas para um contrato pelo ID
export const fetchMensagensEnviadasPorContrato = async (idContrato: number): Promise<MensagemEnviada[]> => {
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .select('*, tipos_mensagem(nome)')
    .eq('id_contrato', idContrato)
    .order('data_envio', { ascending: false });

  if (error) {
    console.error('Erro ao buscar mensagens enviadas por ID:', error);
    throw error;
  }

  return data;
};

// Buscar histórico de mensagens enviadas para um contrato pelo PPPoE
export const fetchMensagensEnviadasPorPPPoE = async (pppoe: string): Promise<MensagemEnviada[]> => {
  // Primeiro, buscar o ID do contrato pelo PPPoE
  const { data: contratos, error: contratoError } = await supabase
    .from('contratos')
    .select('id')
    .eq('pppoe', pppoe)
    .maybeSingle();

  if (contratoError) {
    console.error('Erro ao buscar contrato por PPPoE:', contratoError);
    throw contratoError;
  }

  if (!contratos) {
    // Contrato não encontrado
    return [];
  }

  // Agora buscar as mensagens enviadas para este contrato
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .select('*, tipos_mensagem(nome)')
    .eq('id_contrato', contratos.id)
    .order('data_envio', { ascending: false });

  if (error) {
    console.error('Erro ao buscar mensagens enviadas por PPPoE:', error);
    throw error;
  }

  return data;
};

// Buscar todas as mensagens enviadas com paginação e filtros
export const fetchTodasMensagensEnviadas = async (
  page: number = 1, 
  pageSize: number = 10,
  filtros: {
    tipoMensagem?: number;
    nomeCliente?: string;
  } = {}
): Promise<{ mensagens: MensagemEnviada[], total: number }> => {
  let query = supabase
    .from('mensagens_enviadas')
    .select('*, tipos_mensagem(nome)', { count: 'exact' });
  
  // Aplicar filtro por tipo de mensagem
  if (filtros.tipoMensagem) {
    query = query.eq('id_tipo_mensagem', filtros.tipoMensagem);
  }
  
  // Aplicar filtro por nome do cliente (busca parcial, case insensitive)
  if (filtros.nomeCliente && filtros.nomeCliente.trim() !== '') {
    query = query.ilike('nome_cliente', `%${filtros.nomeCliente.trim()}%`);
  }
  
  // Aplicar paginação
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await query
    .order('data_envio', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Erro ao buscar todas as mensagens enviadas:', error);
    throw error;
  }

  return {
    mensagens: data || [],
    total: count || 0
  };
};
