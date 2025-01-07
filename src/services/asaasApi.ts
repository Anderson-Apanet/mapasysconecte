import axios from 'axios';
import { supabase } from '../utils/supabaseClient';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/asaas',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string;
}

export interface AsaasPayment {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  originalValue: number;
  description?: string;
}

export const findCustomerByCpfCnpj = async (cpfCnpj: string): Promise<AsaasCustomer | null> => {
  try {
    if (!cpfCnpj) {
      console.error('CPF/CNPJ não fornecido');
      return null;
    }

    // Remove caracteres especiais do CPF/CNPJ
    const cleanCpfCnpj = cpfCnpj.replace(/[^\d]/g, '');
    console.log('Buscando cliente com CPF/CNPJ limpo:', cleanCpfCnpj);
    
    const response = await api.get('/customers', {
      params: { cpfCnpj: cleanCpfCnpj }
    });

    console.log('Resposta da API Asaas:', response.data);
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error: any) {
    console.error('Erro ao buscar cliente no Asaas:', error);
    throw error;
  }
};

export const getCustomerById = async (customerId: string): Promise<AsaasCustomer | null> => {
  try {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar cliente por ID no Asaas:', error);
    throw error;
  }
};

export const getCustomerPayments = async (customerId: string): Promise<AsaasPayment[]> => {
  try {
    const response = await api.get('/payments', {
      params: { customer: customerId }
    });
    return response.data.data || [];
  } catch (error: any) {
    console.error('Erro ao buscar pagamentos do cliente no Asaas:', error);
    throw error;
  }
};

export const updateClienteAsaasId = async (clienteId: number, asaasId: string) => {
  try {
    const { error } = await supabase
      .from('clientes')
      .update({ asaas_id: asaasId })
      .eq('id', clienteId);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Erro ao atualizar ID do Asaas no cliente:', error);
    throw error;
  }
};
