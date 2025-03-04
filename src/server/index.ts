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
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000
        });

        let whereClause = '1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (r.username LIKE ? OR r.callingstationid LIKE ? OR r.framedipaddress LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            if (status === 'up') {
                whereClause += ' AND r.acctstoptime IS NULL';
            } else if (status === 'down') {
                whereClause += ' AND r.acctstoptime IS NOT NULL';
            }
        }

        if (nasip !== 'all') {
            whereClause += ' AND r.nasipaddress = ?';
            params.push(nasip);
        }

        // Query modificada para pegar apenas o último registro de cada username
        const query = `
            WITH RankedConnections AS (
                SELECT 
                    r.*,
                    ROW_NUMBER() OVER (PARTITION BY r.username ORDER BY r.acctstarttime DESC) as rn
                FROM radacct r
                WHERE ${whereClause}
            )
            SELECT * FROM RankedConnections
            WHERE rn = 1
            ORDER BY acctstarttime DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(DISTINCT username) as total
            FROM radacct r
            WHERE ${whereClause}
        `;

        const [rows] = await connection.query(query, [...params, limit, offset]);
        const [countResult] = await connection.query(countQuery, params);
        const total = (countResult as any)[0].total;

        await connection.end();

        res.json({
            connections: rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                recordsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        res.status(500).json({ error: 'Erro ao buscar conexões' });
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

// Configuração do MySQL para o RADIUS
const createRadiusConnection = async () => {
  return await mysql.createConnection({
    host: process.env.VITE_MYSQL_HOST,
    port: Number(process.env.VITE_MYSQL_PORT),
    user: process.env.VITE_MYSQL_USER,
    password: process.env.VITE_MYSQL_PASSWORD,
    database: process.env.VITE_MYSQL_DATABASE
  });
};

// Rota para buscar conexões
app.get('/api/support/connections', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';
    const nasip = req.query.nasip as string || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    const connection = await createRadiusConnection();

    let whereClause = '';
    const queryParams: any[] = [];

    if (search) {
      whereClause += ` AND (ra.username LIKE ? OR ra.framedipaddress LIKE ? OR ra.nasipaddress LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      if (status === 'up') {
        whereClause += ` AND ra.acctstoptime IS NULL`;
      } else {
        whereClause += ` AND ra.acctstoptime IS NOT NULL`;
      }
    }

    if (nasip !== 'all') {
      whereClause += ` AND ra.nasipaddress = ?`;
      queryParams.push(nasip);
    }

    // Count total records
    const countQuery = `
      WITH LastConnection AS (
        SELECT username, MAX(radacctid) as last_id
        FROM radacct
        GROUP BY username
      )
      SELECT COUNT(*) as total 
      FROM LastConnection lc
      JOIN radacct ra ON ra.radacctid = lc.last_id
      WHERE 1=1 ${whereClause}
    `;
    
    const [countResult] = await connection.execute(countQuery, queryParams);
    const total = (countResult as any)[0].total;

    // Get paginated records
    const query = `
      WITH LastConnection AS (
        SELECT username, MAX(radacctid) as last_id
        FROM radacct
        GROUP BY username
      )
      SELECT 
        ra.radacctid, 
        ra.username, 
        ra.nasipaddress, 
        ra.nasportid, 
        ra.acctstarttime, 
        ra.acctstoptime, 
        ra.acctinputoctets, 
        ra.acctoutputoctets, 
        ra.acctterminatecause, 
        ra.framedipaddress, 
        ra.callingstationid
      FROM LastConnection lc
      JOIN radacct ra ON ra.radacctid = lc.last_id
      WHERE 1=1 ${whereClause}
      ORDER BY ra.acctstarttime DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await connection.execute(query, [...queryParams, limit, offset]);
    await connection.end();

    res.json({
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        recordsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conexões:', error);
    res.status(500).json({ error: 'Erro ao buscar conexões' });
  }
});

// Rota para buscar estatísticas dos concentradores
app.get('/api/concentrator-stats', async (req, res) => {
  try {
    const connection = await createRadiusConnection();

    const query = `
      SELECT 
        n.nasname,
        n.shortname,
        n.type,
        n.ports,
        n.description,
        COUNT(DISTINCT r.username) as user_count
      FROM nas n
      LEFT JOIN radacct r ON n.nasname = r.nasipaddress AND r.acctstoptime IS NULL
      GROUP BY n.nasname, n.shortname, n.type, n.ports, n.description
    `;

    const [rows] = await connection.execute(query);
    await connection.end();

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos concentradores:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas dos concentradores' });
  }
});

// Rota para buscar histórico de conexões de um usuário específico
app.get('/api/connections/user/:username/history', async (req, res) => {
    const username = req.params.username;

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000
        });

        // Buscar histórico de conexões do usuário
        const query = `
            SELECT 
                radacctid,
                username,
                nasipaddress,
                nasportid,
                acctstarttime,
                acctstoptime,
                acctinputoctets,
                acctoutputoctets,
                acctterminatecause,
                framedipaddress,
                callingstationid
            FROM radacct 
            WHERE username = ?
            ORDER BY acctstarttime DESC
            LIMIT 10
        `;

        const [rows] = await connection.query(query, [username]);
        await connection.end();

        res.json({
            history: rows
        });
    } catch (error) {
        console.error('Erro ao buscar histórico de conexões do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico de conexões' });
    }
});

// Rota para buscar histórico de conexões de um usuário específico (endpoint alternativo)
app.get('/api/support/connections/user/:username/history', async (req, res) => {
    const username = req.params.username;

    try {
        const connection = await createRadiusConnection();

        // Buscar histórico de conexões do usuário
        const query = `
            SELECT 
                radacctid,
                username,
                nasipaddress,
                nasportid,
                acctstarttime,
                acctstoptime,
                acctinputoctets,
                acctoutputoctets,
                acctterminatecause,
                framedipaddress,
                callingstationid
            FROM radacct 
            WHERE username = ?
            ORDER BY acctstarttime DESC
            LIMIT 10
        `;

        const [rows] = await connection.execute(query, [username]);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Erro ao buscar histórico de conexões do usuário:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar histórico de conexões',
            details: error.message 
        });
    }
});

// Rota para atualizar contrato
app.put('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      client_id,
      plan_id,
      data_instalacao,
      status,
      endereco
    } = req.body;

    const connection = await createRadiusConnection();

    // Atualizar dados do contrato
    await connection.query(
      `UPDATE contratos 
       SET plan_id = ?, 
           data_instalacao = ?, 
           status = ?
       WHERE id = ?`,
      [plan_id, data_instalacao, status, id]
    );

    // Atualizar endereço do cliente
    if (endereco) {
      await connection.query(
        `UPDATE clientes 
         SET logradouro = ?,
             numero = ?,
             complemento = ?,
             bairro = ?,
             cidade = ?,
             uf = ?,
             cep = ?
         WHERE id = ?`,
        [
          endereco.logradouro,
          endereco.numero,
          endereco.complemento,
          endereco.bairro,
          endereco.cidade,
          endereco.uf,
          endereco.cep,
          client_id
        ]
      );
    }

    res.json({ success: true, message: 'Contrato atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar contrato',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para adicionar credenciais de contrato no Radius
app.post('/api/support/add-contract-credentials', async (req, res) => {
  console.log('Recebida requisição POST /api/support/add-contract-credentials');
  try {
    const { username, password, groupname } = req.body;
    
    if (!username || !password || !groupname) {
      return res.status(400).json({ 
        error: 'Parâmetros incompletos', 
        message: 'Username, password e groupname são obrigatórios' 
      });
    }

    console.log('Tentando adicionar credenciais para:', { username, groupname });
    
    const connection = await createRadiusConnection();
    
    // Verificar se o usuário já existe
    const [existingUsers] = await connection.execute(
      'SELECT * FROM radcheck WHERE username = ?',
      [username]
    );
    
    if ((existingUsers as any[]).length > 0) {
      // Atualizar senha se o usuário já existe
      await connection.execute(
        'UPDATE radcheck SET value = ? WHERE username = ? AND attribute = "Cleartext-Password"',
        [password, username]
      );
      
      // Atualizar grupo
      await connection.execute(
        'UPDATE radusergroup SET groupname = ? WHERE username = ?',
        [groupname, username]
      );
      
      console.log('Credenciais atualizadas com sucesso para:', username);
    } else {
      // Inserir novo usuário
      await connection.execute(
        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
        [username, 'Cleartext-Password', ':=', password]
      );
      
      // Inserir grupo do usuário
      await connection.execute(
        'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)',
        [username, groupname, 1]
      );
      
      console.log('Novas credenciais adicionadas com sucesso para:', username);
    }
    
    await connection.end();
    
    res.json({ 
      success: true, 
      message: 'Credenciais adicionadas/atualizadas com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao adicionar credenciais no Radius:', error);
    res.status(500).json({ 
      error: 'Erro ao adicionar credenciais no Radius', 
      details: error.message 
    });
  }
});

const port = 3001;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
