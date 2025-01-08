export interface UserType {
  id_user_tipo: number;
  tipo: string;
  created_at: string;
}

export interface UserTypePermission {
  id_user_tipo_permissao: number;
  id_user_tipo: number;
  modulo: string;
  permissao: boolean;
  created_at: string;
}

export const DEFAULT_MODULES = [
  'usuarios',
  'mensagens',
  'financeiro',
  'agenda',
  'planos',
  'rede',
  'suporte',
  'adm',
  'caixa',
  'tecnicos',
  'estoque',
  'bairros'
];
