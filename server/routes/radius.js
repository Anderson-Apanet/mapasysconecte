const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { mysqlHost, mysqlUser, mysqlPassword, mysqlDatabase } = require('../config');

// Configuração do pool de conexões MySQL
const pool = mysql.createPool({
  host: mysqlHost,
  user: mysqlUser,
  password: mysqlPassword,
  database: mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Rota para adicionar credenciais no banco radius
router.post('/add-contract-credentials', async (req, res) => {
  try {
    const { username, password, groupname } = req.body;

    if (!username || !password || !groupname) {
      return res.status(400).json({ 
        error: 'Username, password e groupname são obrigatórios' 
      });
    }

    // Cria a conexão com o banco
    const connection = await pool.getConnection();

    try {
      // Inicia a transação
      await connection.beginTransaction();

      try {
        // Verifica se já existe um registro na radcheck para este username
        const [existingRadcheck] = await connection.query(
          'SELECT * FROM radcheck WHERE username = ? AND attribute = ?',
          [username, 'Cleartext-Password']
        );

        // Insere ou atualiza na radcheck
        if (existingRadcheck.length > 0) {
          await connection.query(
            'UPDATE radcheck SET value = ? WHERE username = ? AND attribute = ?',
            [password, username, 'Cleartext-Password']
          );
        } else {
          await connection.query(
            'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
            [username, 'Cleartext-Password', ':=', password]
          );
        }

        // Verifica se já existe um registro na radusergroup para este username
        const [existingUserGroup] = await connection.query(
          'SELECT * FROM radusergroup WHERE username = ?',
          [username]
        );

        // Insere ou atualiza na radusergroup
        if (existingUserGroup.length > 0) {
          await connection.query(
            'UPDATE radusergroup SET groupname = ? WHERE username = ?',
            [groupname, username]
          );
        } else {
          await connection.query(
            'INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, ?)',
            [username, groupname, 1]
          );
        }

        // Commit da transação
        await connection.commit();

        res.json({ 
          success: true, 
          message: 'Credenciais adicionadas com sucesso' 
        });
      } catch (error) {
        // Rollback em caso de erro
        await connection.rollback();
        throw error;
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao adicionar credenciais:', error);
    res.status(500).json({ 
      error: 'Erro ao adicionar credenciais no banco radius',
      details: error.message 
    });
  }
});

// Rota para buscar os concentradores
router.get('/support/concentrators', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT 
        n.nasname,
        n.shortname,
        n.type,
        n.ports,
        n.description,
        COUNT(DISTINCT CASE 
          WHEN r.acctstoptime IS NULL THEN 
            CASE 
              WHEN n.nasname = '172.16.0.25' AND r.nasipaddress = '172.16.255.13' THEN r.username
              WHEN n.nasname = r.nasipaddress THEN r.username
              ELSE NULL
            END
          ELSE NULL 
        END) as user_count
      FROM nas n
      LEFT JOIN radacct r ON 
        CASE 
          WHEN n.nasname = '172.16.0.25' THEN r.nasipaddress = '172.16.255.13'
          ELSE n.nasname = r.nasipaddress
        END
      GROUP BY n.nasname, n.shortname, n.type, n.ports, n.description
      ORDER BY n.nasname
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar concentradores:', error);
    res.status(500).json({ error: 'Erro ao buscar concentradores', details: error.message });
  }
});

// Rota para buscar conexões com paginação e filtros
router.get('/connections', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const nasip = req.query.nasip || 'all';

    console.log('Buscando conexões com parâmetros:', { page, limit, search, status, nasip });

    // Construir a consulta base
    let query = `
      SELECT * FROM radacct
      WHERE 1=1
    `;
    
    // Adicionar filtros
    const params = [];
    
    if (search) {
      query += ` AND (username LIKE ? OR callingstationid LIKE ? OR framedipaddress LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status === 'up') {
      query += ` AND acctstoptime IS NULL`;
    } else if (status === 'down') {
      query += ` AND acctstoptime IS NOT NULL`;
    }
    
    if (nasip !== 'all') {
      query += ` AND nasipaddress = ?`;
      params.push(nasip);
    }
    
    // Adicionar ordenação
    query += ` ORDER BY acctstarttime DESC`;
    
    // Consulta para contar total de registros
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
    
    // Adicionar paginação à consulta principal
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const connection = await pool.getConnection();
    
    // Executar consulta principal
    const [rows] = await connection.query(query, params);
    
    // Executar consulta de contagem
    const [countResult] = await connection.query(countQuery, params.slice(0, params.length - 2));
    const totalRecords = countResult[0].total;
    
    connection.release();
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(totalRecords / limit);
    
    res.json({
      data: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conexões:', error);
    res.status(500).json({ error: 'Erro ao buscar conexões', details: error.message });
  }
});

// Rota para estatísticas de concentradores
router.get('/concentrator-stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Query para buscar os concentradores da tabela nas e contar usuários ativos por concentrador
    const query = `
      SELECT 
        n.nasname,
        n.shortname,
        n.type,
        n.ports,
        n.description,
        COUNT(DISTINCT CASE 
          WHEN r.acctstoptime IS NULL THEN 
            CASE 
              WHEN n.nasname = '172.16.0.25' AND r.nasipaddress = '172.16.255.13' THEN r.username
              WHEN n.nasname = r.nasipaddress THEN r.username
              ELSE NULL
            END
          ELSE NULL 
        END) as user_count
      FROM nas n
      LEFT JOIN radacct r ON 
        CASE 
          WHEN n.nasname = '172.16.0.25' THEN r.nasipaddress = '172.16.255.13'
          ELSE n.nasname = r.nasipaddress
        END
      GROUP BY n.nasname, n.shortname, n.type, n.ports, n.description
      ORDER BY n.nasname`;

    const [rows] = await connection.query(query);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de concentradores:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de concentradores', details: error.message });
  }
});

// Rota para buscar o histórico de conexões de um usuário
router.get('/support/connections/user/:username/history', async (req, res) => {
  try {
    const { username } = req.params;
    const connection = await pool.getConnection();
    
    try {
      // Busca as últimas 10 conexões do usuário
      const [rows] = await connection.query(`
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
      `, [username]);
      
      res.json({ 
        success: true, 
        data: rows 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao buscar histórico de conexões:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar histórico de conexões',
      details: error.message 
    });
  }
});

module.exports = router;
