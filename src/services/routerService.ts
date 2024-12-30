import axios from 'axios';

export interface RouterTrafficData {
  name: string;
  'rx-bits-per-second': number;
  'tx-bits-per-second': number;
  'rx-packets-per-second': number;
  'tx-packets-per-second': number;
}

export const getRouterTraffic = async (interfaceName: string): Promise<RouterTrafficData[]> => {
  console.log('Fetching traffic data for interface:', interfaceName);
  try {
    const response = await axios.get('http://localhost:3001/api/router/traffic');
    return response.data;
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    console.log('Response:', error.response?.data);
    console.log('Status:', error.response?.status);
    throw error;
  }
};
