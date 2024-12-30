export interface Cliente {
  id: number;
  nome: string;
  email: string | null;
  fonewhats: string | null;
  logradouro: string | null;
  nrlogradouro: string | null;
  complemento: string | null;
  id_bairro: number | null;
  uf: string | null;
  cep: string | null;
  rg: string | null;
  cpf_cnpj: string | null;
  datanas: string | null;
  created_at?: string;
  status: 'Ativo' | 'Inativo' | 'Pendente' | null;
}
