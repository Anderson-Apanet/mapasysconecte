export interface Cliente {
  id: number;
  nome: string;
  email?: string;
  cpf_cnpj?: string;
  bairro?: string;
  id_empresa: number;
  created_at?: string;
}
