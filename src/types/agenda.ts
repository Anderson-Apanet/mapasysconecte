export interface AgendaEvent {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  cor: string;
  tipo_evento: string;
  usuario_resp: string;
  horamarcada: boolean;
  prioritario: boolean;
  realizada: boolean;
  parcial: boolean;
  cancelado: boolean;
  pppoe: string;
  data_cad_evento: string;
  criador: string;
}
