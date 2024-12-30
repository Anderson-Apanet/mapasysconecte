export interface Caixa {
  id: number;
  id_usuario: string;
  horario_abertura: string;
  horario_fechamento: string | null;
}

export interface CaixaStatus {
  isOpen: boolean;
  caixaAtual: Caixa | null;
}
 
