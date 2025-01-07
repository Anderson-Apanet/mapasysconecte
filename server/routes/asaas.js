const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

console.log('Carregando módulo de rotas do Asaas...');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = 'https://api.asaas.com/v3';

if (!ASAAS_API_KEY) {
  console.error('Erro: Token da API do Asaas não configurado!');
  process.exit(1);
}

console.log('Configurando API do Asaas:');
console.log('URL:', ASAAS_API_URL);
console.log('Token:', ASAAS_API_KEY.substring(0, 10) + '...');

const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  }
});

// Rota de teste
router.get('/test', async (req, res) => {
  console.log('Rota de teste chamada');
  try {
    console.log('Testando conexão com a API do Asaas...');
    console.log('Headers:', asaasApi.defaults.headers);
    
    const response = await asaasApi.get('/customers', {
      params: {
        limit: 1
      }
    });
    
    console.log('Teste bem-sucedido!');
    console.log('Resposta:', response.data);
    
    res.json({
      success: true,
      message: 'Conexão com a API do Asaas estabelecida com sucesso',
      data: response.data
    });
  } catch (error) {
    console.error('Erro no teste:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    console.error('URL:', error.config?.url);
    console.error('Método:', error.config?.method);
    console.error('Headers da requisição:', error.config?.headers);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao conectar com a API do Asaas',
      error: error.response?.data || error.message
    });
  }
});

// Middleware para logging
router.use((req, res, next) => {
  console.log(`[Asaas] ${req.method} ${req.url}`);
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  next();
});

// Buscar cliente por CPF/CNPJ
router.get('/customers', async (req, res) => {
  console.log('Rota de busca de clientes chamada');
  try {
    const { cpfCnpj } = req.query;
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ não fornecido' });
    }

    console.log('Buscando cliente com CPF/CNPJ:', cpfCnpj);
    
    const url = `/customers?cpfCnpj=${cpfCnpj}`;
    console.log('URL da requisição:', ASAAS_API_URL + url);
    console.log('Headers:', asaasApi.defaults.headers);
    
    const response = await asaasApi.get(url);
    console.log('Resposta da API Asaas:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar cliente no Asaas:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    console.error('URL:', error.config?.url);
    console.error('Método:', error.config?.method);
    console.error('Headers da requisição:', error.config?.headers);
    
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Buscar cliente por ID
router.get('/customers/:id', async (req, res) => {
  console.log('Rota de busca de clientes por ID chamada');
  try {
    const { id } = req.params;
    console.log('Buscando cliente com ID:', id);
    
    const response = await asaasApi.get(`/customers/${id}`);
    console.log('Resposta da API Asaas:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar cliente no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Buscar pagamentos de um cliente
router.get('/payments', async (req, res) => {
  console.log('Rota de busca de pagamentos chamada');
  try {
    const { customer } = req.query;
    if (!customer) {
      return res.status(400).json({ error: 'ID do cliente não fornecido' });
    }

    console.log('Buscando pagamentos do cliente:', customer);
    
    const url = `/payments?customer=${customer}`;
    console.log('URL da requisição:', ASAAS_API_URL + url);
    
    const response = await asaasApi.get(url);
    console.log('Resposta da API Asaas:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar pagamentos no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

module.exports = router;
