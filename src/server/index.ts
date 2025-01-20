import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração da API do Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_API_URL = 'https://api.asaas.com/v3';

if (!ASAAS_API_KEY) {
  console.error('Erro: Token da API do Asaas não configurado!');
  process.exit(1);
}

console.log('Configurando API do Asaas:');
console.log('URL:', ASAAS_API_URL);
console.log('Token:', ASAAS_API_KEY);

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rota de teste do Asaas
app.get('/api/asaas/test', async (req, res) => {
  console.log('Rota de teste do Asaas chamada');
  try {
    console.log('Testando conexão com a API do Asaas...');
    
    // Headers exatamente como no curl
    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };
    
    console.log('Headers:', {
      ...headers,
      'access_token': ASAAS_API_KEY.substring(0, 10) + '...' // Ocultando o token completo no log
    });
    
    // Testando com uma requisição GET para listar clientes
    const response = await axios.get(`${ASAAS_API_URL}/customers`, { headers });
    
    console.log('Teste bem-sucedido!');
    console.log('Status:', response.status);
    console.log('Headers da resposta:', response.headers);
    console.log('Dados:', response.data);
    
    res.json({
      success: true,
      message: 'Conexão com a API do Asaas estabelecida com sucesso',
      data: response.data
    });
  } catch (error: any) {
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
      error: error.response?.data || error.message,
      details: {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers
      }
    });
  }
});

// Buscar cliente por CPF/CNPJ
app.get('/api/asaas/customers', async (req, res) => {
  console.log('Rota de busca de clientes chamada');
  try {
    const { cpfCnpj } = req.query;
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ não fornecido' });
    }

    console.log('Buscando cliente com CPF/CNPJ:', cpfCnpj);
    
    const url = `/customers?cpfCnpj=${cpfCnpj}`;
    console.log('URL da requisição:', ASAAS_API_URL + url);
    
    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };
    
    const response = await axios.get(ASAAS_API_URL + url, { headers });
    
    console.log('Resposta da API Asaas:', response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error('Erro ao buscar cliente no Asaas:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    console.error('URL:', error.config?.url);
    console.error('Método:', error.config?.method);
    
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Buscar pagamentos de um cliente
app.get('/api/asaas/payments', async (req, res) => {
  console.log('Rota de busca de pagamentos chamada');
  try {
    const { customer } = req.query;
    if (!customer) {
      return res.status(400).json({ error: 'ID do cliente não fornecido' });
    }

    console.log('Buscando pagamentos do cliente:', customer);
    
    const url = `/payments?customer=${customer}`;
    console.log('URL da requisição:', ASAAS_API_URL + url);
    
    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };
    
    const response = await axios.get(ASAAS_API_URL + url, { headers });
    
    console.log('Resposta da API Asaas:', response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error('Erro ao buscar pagamentos no Asaas:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Rota para buscar conexões com paginação e filtros
app.get('/api/connections', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';
    const nasip = req.query.nasip as string || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        console.log('Tentando conectar ao MySQL com:', {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE
        });
        
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000 // 10 segundos
        });

        let whereClause = '1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (username LIKE ? OR callingstationid LIKE ? OR framedipaddress LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            if (status === 'up') {
                whereClause += ' AND acctstoptime IS NULL';
            } else {
                whereClause += ' AND acctstoptime IS NOT NULL';
            }
        }

        if (nasip !== 'all') {
            whereClause += ' AND nasipaddress = ?';
            params.push(nasip);
        }

        // Consulta para contar total de registros
        const [countResult] = await connection.execute(
            `SELECT COUNT(*) as total FROM radacct WHERE ${whereClause}`,
            params
        );
        const totalRecords = (countResult as any[])[0].total;

        // Consulta principal com paginação
        const [rows] = await connection.execute(
            `SELECT * FROM radacct 
             WHERE ${whereClause}
             ORDER BY acctstarttime DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        await connection.end();

        res.json({
            data: rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords,
                recordsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Rota para estatísticas dos concentradores
app.get('/api/concentrator-stats', async (req, res) => {
    try {
        console.log('Tentando conectar ao MySQL com:', {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE
        });
        
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000 // 10 segundos
        });

        const [rows] = await connection.execute(
            `SELECT nasipaddress, COUNT(*) as user_count 
             FROM radacct 
             WHERE acctstoptime IS NULL 
             GROUP BY nasipaddress`
        );

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Rota para consumo do usuário
app.get('/api/user-consumption/:username', async (req, res) => {
    try {
        console.log('Tentando conectar ao MySQL com:', {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE
        });
        
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000 // 10 segundos
        });

        const [rows] = await connection.execute(
            `SELECT 
                DATE(acctstarttime) as date,
                SUM(acctinputoctets)/(1024*1024*1024) as upload_gb,
                SUM(acctoutputoctets)/(1024*1024*1024) as download_gb
             FROM radacct 
             WHERE username = ?
             GROUP BY DATE(acctstarttime)
             ORDER BY date DESC
             LIMIT 30`,
            [req.params.username]
        );

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar consumo:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Rota única para grupos do radius
app.get('/radius/groups', async (req, res) => {
    console.log('Recebida requisição GET /radius/groups');
    
    try {
        console.log('Tentando conectar ao MySQL com:', {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE
        });
        
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000 // 10 segundos
        });

        console.log('Conexão MySQL estabelecida');

        const [rows] = await connection.execute('SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname');
        console.log('Grupos encontrados:', rows);

        await connection.end();
        res.json((rows as any[]).map(row => row.groupname));
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ error: String(error) });
    }
});

const port = 3001;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
