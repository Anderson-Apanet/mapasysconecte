// Serviço para comunicação com o N8N para operações no MySQL
import axios from 'axios';

// Endpoint do N8N para operações no MySQL
const N8N_ENDPOINT = 'https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e';

export const getGroupNames = async (): Promise<string[]> => {
  try {
    // Valores estáticos para interface
    return ['bloqueado', 'ativo', 'liberado48'];
  } catch (error) {
    console.error('Erro ao obter groupnames:', error);
    throw error;
  }
};

export const updateUserGroupName = async (username: string, acao: string, radius?: string): Promise<boolean> => {
  try {
    // Enviar o PPPoE para o endpoint do N8N
    const payload: {
      pppoe: string;
      acao: string;
      radius?: string;
    } = {
      pppoe: username,
      acao: acao
    };

    // Adicionar o radius apenas se for fornecido
    if (radius) {
      payload.radius = radius;
    }

    const response = await axios.post(N8N_ENDPOINT, payload);
    
    console.log('Solicitação enviada para o N8N:', response.data);
    return true;
  } catch (error) {
    console.error('Erro ao enviar solicitação para o N8N:', error);
    throw error;
  }
};
