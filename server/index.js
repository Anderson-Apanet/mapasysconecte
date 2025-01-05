require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Função para criar conexão com o MySQL
const createConnection = async () => {
    return await mysql.createConnection({
        host: process.env.MYSQL_HOST || '187.103.249.60',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'bk134',
        database: process.env.MYSQL_DATABASE || 'radius'
    });
};

// Rota para buscar conexões
app.get('/api/support/connections', async (req, res) => {
    try {
        const connection = await createConnection();
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const nasip = req.query.nasip || 'all';

        // Consulta para obter apenas o último registro de cada username
        const query = `
            WITH LastRecords AS (
                SELECT username, MAX(radacctid) as max_id
                FROM radacct
                GROUP BY username
            )
            SELECT r.*
            FROM radacct r
            INNER JOIN LastRecords lr ON r.username = lr.username AND r.radacctid = lr.max_id
            WHERE CASE 
                WHEN ? = 'up' THEN r.acctstoptime IS NULL
                WHEN ? = 'down' THEN r.acctstoptime IS NOT NULL
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != 'all' THEN r.nasipaddress = ?
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != '' THEN 
                    r.username LIKE CONCAT('%', ?, '%')
                    OR r.framedipaddress LIKE CONCAT('%', ?, '%')
                    OR r.callingstationid LIKE CONCAT('%', ?, '%')
                ELSE TRUE
            END
            ORDER BY r.radacctid DESC
            LIMIT ? OFFSET ?;
        `;

        // Consulta para contar o total de usernames únicos
        const countQuery = `
            SELECT COUNT(DISTINCT username) as total
            FROM radacct r
            WHERE CASE 
                WHEN ? = 'up' THEN r.acctstoptime IS NULL
                WHEN ? = 'down' THEN r.acctstoptime IS NOT NULL
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != 'all' THEN r.nasipaddress = ?
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != '' THEN 
                    r.username LIKE CONCAT('%', ?, '%')
                    OR r.framedipaddress LIKE CONCAT('%', ?, '%')
                    OR r.callingstationid LIKE CONCAT('%', ?, '%')
                ELSE TRUE
            END;
        `;

        // Log para debug
        console.log('Executing support query with params:', {
            status, nasip, search,
            limit, offset
        });

        // Executar as consultas
        const [rows] = await connection.execute(query, [
            status, status,
            nasip, nasip,
            search, search, search, search,
            limit, offset
        ]);

        const [countResult] = await connection.execute(countQuery, [
            status, status,
            nasip, nasip,
            search, search, search, search
        ]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            data: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: total,
                recordsPerPage: limit
            }
        });

        await connection.end();
    } catch (error) {
        console.error('Error fetching support connections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rota antiga para compatibilidade
app.get('/api/connections', async (req, res) => {
    try {
        const connection = await createConnection();
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const nasip = req.query.nasip || 'all';

        // Consulta para obter apenas o último registro de cada username
        const query = `
            SELECT r.*
            FROM radacct r
            INNER JOIN (
                SELECT username, MAX(radacctid) as max_id
                FROM radacct
                GROUP BY username
            ) latest ON r.username = latest.username AND r.radacctid = latest.max_id
            WHERE CASE 
                WHEN ? = 'up' THEN r.acctstoptime IS NULL
                WHEN ? = 'down' THEN r.acctstoptime IS NOT NULL
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != 'all' THEN r.nasipaddress = ?
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != '' THEN 
                    r.username LIKE CONCAT('%', ?, '%')
                    OR r.framedipaddress LIKE CONCAT('%', ?, '%')
                    OR r.callingstationid LIKE CONCAT('%', ?, '%')
                ELSE TRUE
            END
            ORDER BY r.radacctid DESC
            LIMIT ? OFFSET ?;
        `;

        // Consulta para contar o total de usernames únicos
        const countQuery = `
            SELECT COUNT(*) as total
            FROM (
                SELECT username
                FROM radacct
                GROUP BY username
                HAVING MAX(radacctid)
            ) unique_users
            WHERE EXISTS (
                SELECT 1
                FROM radacct r
                WHERE r.username = unique_users.username
                AND CASE 
                    WHEN ? = 'up' THEN r.acctstoptime IS NULL
                    WHEN ? = 'down' THEN r.acctstoptime IS NOT NULL
                    ELSE TRUE
                END
                AND CASE 
                    WHEN ? != 'all' THEN r.nasipaddress = ?
                    ELSE TRUE
                END
                AND CASE 
                    WHEN ? != '' THEN 
                        r.username LIKE CONCAT('%', ?, '%')
                        OR r.framedipaddress LIKE CONCAT('%', ?, '%')
                        OR r.callingstationid LIKE CONCAT('%', ?, '%')
                    ELSE TRUE
                END
            );
        `;

        // Log para debug
        console.log('Executing query with params:', {
            status, nasip, search,
            limit, offset
        });

        // Executar as consultas
        const [rows] = await connection.execute(query, [
            status, status,
            nasip, nasip,
            search, search, search, search,
            limit, offset
        ]);

        const [countRows] = await connection.execute(countQuery, [
            status, status,
            nasip, nasip,
            search, search, search, search
        ]);

        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limit);

        await connection.end();

        res.json({
            data: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: total,
                recordsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/router/traffic', (req, res) => {
    console.log('Recebida requisição para /api/router/traffic');
    
    // Dados fictícios da interface
    const mockData = [{
        name: 'sfp-sfpplus1-WAN-Adylnet',
        "rx-bits-per-second": Math.floor(Math.random() * 1000000000),
        "tx-bits-per-second": Math.floor(Math.random() * 1000000000),
        "rx-packets-per-second": Math.floor(Math.random() * 1000),
        "tx-packets-per-second": Math.floor(Math.random() * 1000)
    }];

    console.log('Enviando dados:', mockData);
    res.json(mockData);
});

// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
