export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  DASHBOARD: '/dashboard',
  CLIENTES: '/clientes',
  FINANCEIRO: '/financeiro',
  PLANOS: '/planos',
  AGENDA: '/agenda',
  REDE: '/rede',
  CAIXA: '/caixa',
  ADM: '/adm',
  TECNICOS: '/tecnicos'
} as const;

export type RouteKeys = keyof typeof ROUTES;
export type RouteValues = typeof ROUTES[RouteKeys];
