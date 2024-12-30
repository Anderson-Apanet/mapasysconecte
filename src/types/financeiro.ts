// Tipos de lançamento
export const TRANSACTION_TYPES = {
  INCOME: 'RECEITA',
  EXPENSE: 'DESPESA'
} as const;

// Status dos contratos
export const CONTRACT_STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Contratos Ativos' },
  { value: 'Agendado', label: 'Contratos Agendados' },
  { value: 'Bloqueado', label: 'Contratos Bloqueados' },
  { value: 'Liberado48', label: 'Contratos Liberados 48h' },
  { value: 'Cancelado', label: 'Contratos Cancelados' }
] as const;

// Categorias
export const CATEGORIES = {
  EXPENSE: [
    'Aluguel',
    'Água',
    'Energia',
    'Internet',
    'Telefone',
    'Salários',
    'Impostos',
    'Material de Escritório',
    'Manutenção',
    'Outros'
  ]
} as const;

// Interface para anexos
export interface Attachment {
  path: string;
  url: string;
  name: string;
}

// Interface para Cliente
export interface Cliente {
  id: number;
  id_legado: string;
  created_at: string;
  nome: string | null;
  pppoe: string | null;
  logradouro: string | null;
  nrlogradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  rg: string | null;
  cpf_cnpj: string | null;
  fonewhats: string | null;
  status: string | null;
  datanas: string | null;
  email: string | null;
  complemento: string | null;
  ponto_referencia: string | null;
  uf: string | null;
  id_empresa: number | null;
  data_cad_cliente: string | null;
}

// Interface para Contrato
export interface Contrato {
  id: number;
  pppoe: string;
  plano: string;
  status: string;
  created_at: string;
  cliente?: string;
  bairro?: string;
  complemento?: string;
  contratoassinado?: boolean;
  data_instalacao?: string;
  dia_vencimento?: number;
  id_empresa?: number;
  endereco?: string;
}

// Interface para Título
export interface Titulo {
  id: number;
  contrato_id: number;
  valor: number;
  data_vencimento: string;
  status: string;
}

// Interface para Formas de Pagamento
export interface FormaPagamento {
  id: string;
  label: string;
}

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  { id: 'pix', label: 'PIX' },
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
  { id: 'dinheiro', label: 'Dinheiro' }
];

// Gateways de pagamento disponíveis
export const PAYMENT_GATEWAYS = [
  { id: 'sicredi', label: 'Sicredi', logo: '/src/assets/gateways/sicredi.svg' },
  { id: 'bradesco', label: 'Bradesco', logo: '/src/assets/gateways/bradesco.svg' },
  { id: 'asaas', label: 'Asaas', logo: '/src/assets/gateways/asaas.svg' },
  { id: 'cellcash', label: 'Cellcash', logo: '/src/assets/gateways/cellcash.svg' }
] as const;

export type PaymentGateway = typeof PAYMENT_GATEWAYS[number]['id'];

// Status dos títulos
export const TITULO_STATUS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' }
] as const;

// Interface para transação
export interface Transaction {
  id: number;
  tipo: typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string;
  juros: number;
  formas_pagamento: { [key: string]: number };
  status: string;
  cliente_id?: number;
  contrato_id?: number;
  titulo_id?: number;
}

// Interface para lançamento com campos expandidos
export interface Lancamento {
  id: number;
  data_cad_lancamento: string;
  data_pagamento?: string;
  descricao: string;
  total: number;
  tipo: typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
  categoria?: string;
  formas_pagamento?: { [key: string]: number };
  status: string;
  cliente_id?: number;
  contrato_id?: number;
  titulo_id?: number;
  attachments?: Attachment[];
}

// Interface para filtros de lançamento
export interface LancamentoFilters {
  startDate?: string;
  endDate?: string;
  tipo?: typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
  categoria?: string;
  status?: string;
}

// Interface para totalizadores
export interface Totalizadores {
  receitas: number;
  despesas: number;
  saldo: number;
}
