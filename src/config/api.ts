// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// API endpoints
export const API_ENDPOINTS = {
  // Connections
  connections: `${API_BASE_URL}/api/connections`,
  concentratorStats: `${API_BASE_URL}/api/concentrator-stats`,
  
  // Radius
  radius: `${API_BASE_URL}/api/radius`,
  
  // MySQL
  mysql: `${API_BASE_URL}/api/mysql`,
  
  // Router
  router: `${API_BASE_URL}/api/router`,
  
  // Other endpoints
  agenda: `${API_BASE_URL}/api/agenda`,
  users: `${API_BASE_URL}/api/users`,
  clients: `${API_BASE_URL}/api/clients`,
  contracts: `${API_BASE_URL}/api/contracts`,
  financial: `${API_BASE_URL}/api/financial`,
  support: `${API_BASE_URL}/api/support`
};

export default API_ENDPOINTS;
