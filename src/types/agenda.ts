export interface AgendaEvent {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  cor: string;
  tipo_evento: string;
  responsaveis?: Array<{ id: string; nome: string }>; // Tornando opcional, já que vem de outra tabela
  horamarcada: boolean;
  prioritario: boolean;
  realizada: boolean;
  parcial: boolean;
  cancelado: boolean;
  pppoe: string;
  endereco?: string; // Campo opcional para o endereço do contrato
  cliente_nome?: string; // Campo opcional para o nome do cliente
  novoendereco?: string; // Campo opcional para o novo endereço (usado em Troca de Endereço)
  data_cad_evento: string;
  criador: string;
  // Propriedades usadas pelo FullCalendar
  start?: string | Date;
  end?: string | Date;
  title?: string; // Usado pelo FullCalendar para exibir o título do evento
}
