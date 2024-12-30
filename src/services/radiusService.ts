import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

export const getRadiusGroups = async () => {
    try {
        const response = await axios.get(`${API_ENDPOINTS.radius}/groups`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        throw error;
    }
};
