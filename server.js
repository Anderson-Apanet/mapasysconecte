import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const app = express();

// Enable CORS for all origins during development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection configuration
const dbConfig = {
  host: '187.103.249.49',
  port: 3306,
  user: 'root',
  password: 'bk134',
  database: 'radius',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Attempting to connect to MySQL at:', dbConfig.host + ':' + dbConfig.port);

const pool = mysql.createPool(dbConfig);

// Test database connection on startup
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database at', dbConfig.host + ':' + dbConfig.port);
    connection.release();
  })
  .catch(err => {
    console.error('Failed to connect to MySQL:', err);
    process.exit(1); // Exit if we can't connect to the database
  });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase configurado com sucesso');

// Função para validar e formatar data
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('Erro ao formatar data:', dateStr, error);
    return null;
  }
}

app.get('/api/connections', async (req, res) => {
  try {
    console.log('Received request for connections');
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status || 'all';
    const nasIpFilter = req.query.nasip || 'all';

    console.log('Request parameters:', {
      page,
      limit,
      offset,
      searchTerm,
      statusFilter,
      nasIpFilter
    });

    // Build the WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (searchTerm) {
      whereConditions.push('username LIKE ?');
      queryParams.push(`%${searchTerm}%`);
    }

    // Add status filter conditions
    if (statusFilter === 'up') {
      whereConditions.push('acctstoptime IS NULL');
    } else if (statusFilter === 'down') {
      whereConditions.push('acctstoptime IS NOT NULL');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count of matching records
    const countQuery = `
      WITH LatestRecords AS (
        SELECT username, MAX(acctstarttime) as latest_start
        FROM radacct
        WHERE 1=1
        ${searchTerm ? 'AND username LIKE ?' : ''}
        ${nasIpFilter !== 'all' ? 'AND nasipaddress = ?' : ''}
        GROUP BY username
      )
      SELECT COUNT(*) as total
      FROM radacct r1
      INNER JOIN LatestRecords lr ON r1.username = lr.username 
        AND r1.acctstarttime = lr.latest_start
      WHERE 1=1
        ${statusFilter !== 'all' 
          ? `AND ${statusFilter === 'up' ? 'r1.acctstoptime IS NULL' : 'r1.acctstoptime IS NOT NULL'}`
          : ''}
    `;
    
    // Build count query params
    const countParams = [];
    if (searchTerm) countParams.push(`%${searchTerm}%`);
    if (nasIpFilter !== 'all') countParams.push(nasIpFilter);
    
    console.log('Count query:', countQuery, 'with params:', countParams);
    const [countResult] = await pool.execute(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Get records with all conditions
    const query = `
      WITH LatestRecords AS (
        SELECT username, MAX(acctstarttime) as latest_start
        FROM radacct
        WHERE 1=1
        ${searchTerm ? 'AND username LIKE ?' : ''}
        ${nasIpFilter !== 'all' ? 'AND nasipaddress = ?' : ''}
        GROUP BY username
      )
      SELECT r1.*
      FROM radacct r1
      INNER JOIN LatestRecords lr ON r1.username = lr.username 
        AND r1.acctstarttime = lr.latest_start
      WHERE 1=1
        ${statusFilter !== 'all' 
          ? `AND ${statusFilter === 'up' ? 'r1.acctstoptime IS NULL' : 'r1.acctstoptime IS NOT NULL'}`
          : ''}
      ORDER BY r1.username ASC
      LIMIT ? OFFSET ?
    `;

    // Build params array based on filters
    const finalParams = [];
    if (searchTerm) finalParams.push(`%${searchTerm}%`);
    if (nasIpFilter !== 'all') finalParams.push(nasIpFilter);
    finalParams.push(limit, offset);

    console.log('Main query:', query, 'with params:', finalParams);
    const [rows] = await pool.execute(query, finalParams);
    console.log('Records fetched:', rows.length);

    // Get user counts for each concentrator
    const userCountQuery = `
      WITH LatestRecords AS (
        SELECT username, MAX(acctstarttime) as latest_start
        FROM radacct
        WHERE 1=1
        ${searchTerm ? 'AND username LIKE ?' : ''}
        ${nasIpFilter !== 'all' ? 'AND nasipaddress = ?' : ''}
        GROUP BY username
      )
      SELECT 
        r.nasipaddress,
        COUNT(DISTINCT r.username) as user_count
      FROM radacct r
      INNER JOIN LatestRecords lr 
        ON r.username = lr.username 
        AND r.acctstarttime = lr.latest_start
      GROUP BY r.nasipaddress
      ORDER BY r.nasipaddress;
    `;

    // Build params array based on filters
    const userCountParams = [];
    if (searchTerm) userCountParams.push(`%${searchTerm}%`);
    if (nasIpFilter !== 'all') userCountParams.push(nasIpFilter);

    console.log('User count query:', userCountQuery, 'with params:', userCountParams);
    const [userCountRows] = await pool.execute(userCountQuery, userCountParams);

    const response = {
      data: rows.map(row => ({
        ...row,
        acctstarttime: row.acctstarttime ? new Date(row.acctstarttime).toISOString() : null,
        acctstoptime: row.acctstoptime ? new Date(row.acctstoptime).toISOString() : null
      })),
      userCounts: userCountRows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: limit
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch connections',
      details: error.message 
    });
  }
});

// Add endpoint for concentrator stats
app.get('/api/concentrator-stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        t1.nasipaddress,
        COUNT(t1.username) as user_count
      FROM radacct t1
      INNER JOIN (
        SELECT username, MAX(radacctid) as last_id
        FROM radacct
        GROUP BY username
      ) t2 ON t1.username = t2.username AND t1.radacctid = t2.last_id
      GROUP BY t1.nasipaddress
      ORDER BY t1.nasipaddress;
    `;

    const [rows] = await pool.execute(query);
    console.log('Concentrator stats query result:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching concentrator stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch concentrator stats',
      details: error.message 
    });
  }
});

// Debug endpoint to check specific username
app.get('/api/debug/user/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const query = `
      SELECT 
        radacctid,
        username,
        nasipaddress,
        nasportid,
        DATE_FORMAT(acctstarttime, '%Y-%m-%d %H:%i:%s') as acctstarttime,
        DATE_FORMAT(acctstoptime, '%Y-%m-%d %H:%i:%s') as acctstoptime,
        acctinputoctets,
        acctoutputoctets,
        acctterminatecause,
        framedipaddress,
        callingstationid
      FROM radacct
      WHERE username = ?
      ORDER BY acctstarttime DESC
    `;

    const [rows] = await pool.execute(query, [username]);
    res.json({
      username,
      totalRecords: rows.length,
      records: rows
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user records',
      details: error.message 
    });
  }
});

// Add endpoint for user consumption data
app.get('/api/user-consumption/:username', async (req, res) => {
  try {
    const username = req.params.username;
    console.log('Fetching consumption data for user:', username);

    const query = `
      WITH RankedData AS (
        SELECT 
          DATE(acctstarttime) as date,
          ROUND(COALESCE(SUM(acctinputoctets)/1024/1024/1024, 0), 2) as upload_gb,
          ROUND(COALESCE(SUM(acctoutputoctets)/1024/1024/1024, 0), 2) as download_gb
        FROM radacct 
        WHERE username = ?
          AND acctstarttime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(acctstarttime)
        ORDER BY date ASC
      )
      SELECT * FROM RankedData ORDER BY date ASC;
    `;

    const [rows] = await pool.execute(query, [username]);
    console.log('Raw user consumption data:', rows);
    
    // Garantir que os valores são números e encontrar o máximo
    const formattedRows = rows.map(row => ({
      date: row.date,
      upload_gb: Number(row.upload_gb) || 0,
      download_gb: Number(row.download_gb) || 0
    }));

    // Log dos valores máximos para debug
    const maxUpload = Math.max(...formattedRows.map(row => row.upload_gb));
    const maxDownload = Math.max(...formattedRows.map(row => row.download_gb));
    console.log('Max values:', { maxUpload, maxDownload });
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching user consumption:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user consumption data',
      details: error.message 
    });
  }
});

// Endpoint para buscar estatísticas de usuários
app.get('/api/user-stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(DISTINCT username) FROM radacct) as total_users,
        (SELECT COUNT(DISTINCT username) FROM radacct WHERE acctstoptime IS NULL) as active_connections
    `;

    const [rows] = await pool.query(query);
    
    res.json({
      total_users: parseInt(rows[0].total_users) || 0,
      active_connections: parseInt(rows[0].active_connections) || 0
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user stats',
      details: err.message
    });
  }
});

// Endpoint para buscar eventos da agenda
app.get('/api/agenda', async (req, res) => {
  console.log('Recebendo requisição GET /api/agenda');
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString();

    const { data, error } = await supabase
      .from('agenda')
      .select('*')
      .order('datainicio', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar eventos do Supabase:', error);
      throw error;
    }

    // Formatando e validando as datas
    const formattedData = data
      .map(event => {
        const datainicio = formatDate(event.datainicio);
        const datafinal = formatDate(event.datafinal);
        
        // Pular eventos com datas inválidas
        if (!datainicio || !datafinal) {
          console.warn('Evento com data inválida:', event);
          return null;
        }

        return {
          ...event,
          datainicio,
          datafinal,
          data_finalizacao: formatDate(event.data_finalizacao),
          creation_date: formatDate(event.creation_date)
        };
      })
      .filter(event => event !== null) // Remover eventos com datas inválidas
      .filter(event => {
        // Filtrar apenas eventos dos últimos 3 meses ou futuros
        return new Date(event.datainicio) >= threeMonthsAgo || 
               new Date(event.datafinal) >= threeMonthsAgo;
      });

    console.log('Número de eventos encontrados:', formattedData.length);
    if (formattedData.length > 0) {
      console.log('Exemplo de evento formatado:', formattedData[0]);
    }

    res.json(formattedData);
  } catch (error) {
    console.error('Erro detalhado ao buscar eventos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar eventos',
      details: error.message 
    });
  }
});

// Endpoint para criar evento na agenda
app.post('/api/agenda', async (req, res) => {
  try {
    const eventData = req.body;

    // Validação dos campos obrigatórios
    if (!eventData.nome?.trim()) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios faltando',
        details: 'O nome do evento é obrigatório'
      });
    }

    // Validar datas
    const datainicio = formatDate(eventData.datainicio);
    const datafinal = formatDate(eventData.datafinal);

    if (!datainicio || !datafinal) {
      return res.status(400).json({ 
        error: 'Datas inválidas',
        details: 'Data inicial e/ou final são inválidas'
      });
    }

    // Garantir que todos os campos booleanos estejam presentes
    const normalizedEventData = {
      ...eventData,
      datainicio,
      datafinal,
      data_finalizacao: formatDate(eventData.data_finalizacao),
      creation_date: formatDate(eventData.creation_date) || new Date().toISOString(),
      horamarcada: !!eventData.horamarcada,
      prioritario: !!eventData.prioritario,
      privado: !!eventData.privado,
      realizada: !!eventData.realizada,
      parcial: !!eventData.parcial,
      cancelado: !!eventData.cancelado,
      tipo_evento: eventData.tipo_evento || 'Padrão',
      usuario_resp: eventData.usuario_resp || 'Sistema'
    };
    
    const { data, error } = await supabase
      .from('agenda')
      .insert([normalizedEventData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar evento no Supabase:', error);
      throw error;
    }

    console.log('Evento criado com sucesso:', data);
    res.json(data);
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ 
      error: 'Erro ao criar evento',
      details: error.message 
    });
  }
});

// Endpoint para atualizar evento na agenda
app.put('/api/agenda/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;

    // Validação dos campos obrigatórios
    if (!eventData.nome?.trim()) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios faltando',
        details: 'O nome do evento é obrigatório'
      });
    }

    // Validar datas
    const datainicio = formatDate(eventData.datainicio);
    const datafinal = formatDate(eventData.datafinal);

    if (!datainicio || !datafinal) {
      return res.status(400).json({ 
        error: 'Datas inválidas',
        details: 'Data inicial e/ou final são inválidas'
      });
    }

    // Garantir que todos os campos booleanos estejam presentes
    const normalizedEventData = {
      ...eventData,
      datainicio,
      datafinal,
      data_finalizacao: formatDate(eventData.data_finalizacao),
      horamarcada: !!eventData.horamarcada,
      prioritario: !!eventData.prioritario,
      privado: !!eventData.privado,
      realizada: !!eventData.realizada,
      parcial: !!eventData.parcial,
      cancelado: !!eventData.cancelado,
      tipo_evento: eventData.tipo_evento || 'Padrão',
      usuario_resp: eventData.usuario_resp || 'Sistema'
    };
    
    const { data, error } = await supabase
      .from('agenda')
      .update(normalizedEventData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar evento no Supabase:', error);
      throw error;
    }

    console.log('Evento atualizado com sucesso:', data);
    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar evento',
      details: error.message 
    });
  }
});

// Endpoint para excluir evento da agenda
app.delete('/api/agenda/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o evento existe antes de tentar excluir
    const { data: existingEvent, error: checkError } = await supabase
      .from('agenda')
      .select()
      .eq('id', id)
      .single();

    if (checkError || !existingEvent) {
      return res.status(404).json({ 
        error: 'Evento não encontrado',
        details: 'O evento solicitado não existe ou já foi excluído'
      });
    }
    
    const { error } = await supabase
      .from('agenda')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir evento no Supabase:', error);
      throw error;
    }

    console.log('Evento excluído com sucesso:', id);
    res.json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    res.status(500).json({ 
      error: 'Erro ao excluir evento',
      details: error.message 
    });
  }
});

// Add endpoint for last 10 connections of a specific user
app.get('/api/connections/user/:username/history', async (req, res) => {
  try {
    const { username } = req.params;
    const query = `
      SELECT 
        radacctid,
        username,
        nasipaddress,
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

    const [rows] = await pool.query(query, [username]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user connection history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
