const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = 'https://api.asaas.com/v3';

if (!ASAAS_API_KEY) {
  console.error('ASAAS_API_KEY não configurada');
  process.exit(1);
}

console.log('Configurando API do Asaas...');

// Configuração do axios exatamente como no curl
const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  }
});

// Middleware para logging
router.use((req, res, next) => {
  console.log(`[Asaas] ${req.method} ${req.url}`);
  console.log('Headers da requisição:', {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  });
  next();
});

// Rota de teste
router.get('/test', async (req, res) => {
  try {
    console.log('Testando conexão com Asaas...');
    console.log('URL:', ASAAS_API_URL + '/customers');
    console.log('Token:', ASAAS_API_KEY);
    
    const response = await asaasApi.get('/customers', { 
      params: { limit: 1 },
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      }
    });
    
    console.log('Resposta do teste:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro no teste:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers enviados:', error.config?.headers);
    res.status(500).json({ error: error.message });
  }
});

// Buscar cliente por CPF/CNPJ
router.get('/customers', async (req, res) => {
  try {
    const { cpfCnpj } = req.query;
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ não fornecido' });
    }
    const response = await asaasApi.get(`/customers?cpfCnpj=${cpfCnpj}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Buscar pagamentos do cliente
router.get('/payments/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('Buscando pagamentos para cliente:', customerId);
    
    const response = await asaasApi.get('/payments', {
      params: { customer: customerId },
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      }
    });
    
    console.log('Resposta dos pagamentos:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

module.exports = router;
