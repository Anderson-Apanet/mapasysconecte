export interface Contrato {
  id: number;
  created_at: string;
  complemento: string | null;
  contratoassinado: boolean | null;
  data_instalacao: string | null;
  dia_vencimento: number | null;
  endereco: string | null;
  liberado48: string | null;
  locallat: string | null;
  locallon: string | null;
  pppoe: string | null;
  senha: string | null;
  status: string | null;
  tipo: string | null;
  ultparcela: string | null;
  vendedor: string | null;
  data_cad_contrato: string | null;
  id_cliente: number | null;
  pendencia: boolean | null;
  id_assinatura_asaas: string | null;
  id_plano: number | null;
  id_bairro: number | null;
}
