export interface Lancamento {
  id: number;
  id_caixa: number;
  total: number;
  tipopag: 'RECEITA' | 'DESPESA';
  data_cad_lancamento: string;
  descricao: string;
  forma_pagamento: string;
  id_cliente?: number;
  cliente?: {
    nome: string;
  };
}
