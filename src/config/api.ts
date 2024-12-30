// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// API endpoints
export const API_ENDPOINTS = {
  connections: `${API_BASE_URL}/api/connections`,
  agenda: `${API_BASE_URL}/api/agenda`,
  concentratorStats: `${API_BASE_URL}/api/concentrator-stats`,
  // Add other endpoints as needed
};

export default API_ENDPOINTS;
