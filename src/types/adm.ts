export interface User {
  id_user: string;
  nome: string;
  email: string;
  id_user_tipo: number;
  created_at: string;
}

export interface UserTipo {
  id_user_tipo: number;
  tipo: string;
  created_at?: string;
}

export interface Empresa {
  id_empresa: number;
  nome: string;
  cnpj: string;
  created_at: string;
}

export interface WhatsAppTemplate {
  id: number;
  type: 'payment_reminder' | 'overdue_payment' | 'welcome';
  message: string;
  active: boolean;
}

export interface UserType {
  id: number;
  name: string;
  permissions: string[];
}

export interface Bairro {
  id: number;
  nome: string;
  cidade: string;
  created_at?: string;
}

export type TabType = 'usuarios' | 'mensagens' | 'configuracoes' | 'tipos_usuarios' | 'bairros';
