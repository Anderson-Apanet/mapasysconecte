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
    try {
      const [rows] = await connection.query(`
        SELECT n.*, COUNT(DISTINCT r.username) as user_count 
        FROM nas n 
        LEFT JOIN radacct r ON n.nasname = r.nasipaddress 
        WHERE n.nasname NOT IN ('localhost', '127.0.0.1')
        GROUP BY n.id, n.nasname
      `);
      
      res.json({ 
        success: true, 
        data: rows 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao buscar concentradores:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar concentradores',
      details: error.message 
    });
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
