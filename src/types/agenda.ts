export interface AgendaEvent {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  cor: string;
  tipo_evento: string;
  responsaveis: Array<{ id: string; nome: string }>;
  horamarcada: boolean;
  prioritario: boolean;
  realizada: boolean;
  parcial: boolean;
  cancelado: boolean;
  pppoe: string;
  endereco?: string; // Campo opcional para o endereço do contrato
  data_cad_evento: string;
  criador: string;
}
