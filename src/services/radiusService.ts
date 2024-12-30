import axios from 'axios';

export const getRadiusGroups = async () => {
    try {
        const response = await axios.get('http://localhost:3001/radius/groups');
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        throw error;
    }
};
