export const ROUTES = {
  // Rotas principais
  LOGIN: '/login',
  HOME: '/',
  DASHBOARD: '/dashboard',
  CLIENTES: '/clientes',
  CLIENTES_DETALHES: '/clientes/:id',
  FINANCEIRO: '/financeiro',
  PLANOS: '/planos',
  AGENDA: '/agenda',
  REDE: '/rede',
  CAIXA: '/caixa',
  ADM: '/adm',
  TECNICOS: '/tecnicos',
  ESTOQUE: '/estoque',
  SUPORTE: '/suporte',
  RESET_PASSWORD: '/reset-password',
  RESETPW: '/resetpw',

  // Rotas administrativas
  ADM_BAIRROS: '/adm/bairros',
  ADM_VEICULOS: '/adm/veiculos',
  ADM_USERS: '/adm/usuarios',
  ADM_MESSAGES: '/adm/mensagens',
  ADM_MESSAGE_HISTORY: '/adm/historico-mensagens',
  ADM_USER_TYPES: '/adm/tipos-usuarios',
  ADM_SETTINGS: '/adm/configuracoes'
} as const;

export type RouteKeys = keyof typeof ROUTES;
export type RouteValues = typeof ROUTES[RouteKeys];
