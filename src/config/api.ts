// Environment variables
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_URL = import.meta.env.VITE_API_URL || '';

// Base URL for API requests - in development, use the full URL, in production use the relative path
const getBaseUrl = () => isDevelopment ? API_BASE_URL : '';

// API endpoints
export const API_ENDPOINTS = {
  // Connections
  connections: `${getBaseUrl()}/api/connections`,
  concentratorStats: `${getBaseUrl()}/api/concentrator-stats`,
  
  // Radius
  radius: `${getBaseUrl()}/api/radius`,
  
  // MySQL
  mysql: `${getBaseUrl()}/api/mysql`,
  
  // Router
  router: `${getBaseUrl()}/api/router`,
  
  // Other endpoints
  agenda: `${getBaseUrl()}/api/agenda`,
  users: `${getBaseUrl()}/api/users`,
  clients: `${getBaseUrl()}/api/clients`,
  contracts: `${getBaseUrl()}/api/contracts`,
  financial: `${getBaseUrl()}/api/financial`,
  support: `${getBaseUrl()}/api/support`
};

export default API_ENDPOINTS;
