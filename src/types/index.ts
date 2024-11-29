export interface User {
  id: string;
  email: string;
  id_empresa: number;
  tipo_usuario: 'diretor' | 'suporte' | 'financeiro';
  nivel: 1 | 2 | 3 | 4;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithEmpresa extends User {
  empresa: Empresa;
}
