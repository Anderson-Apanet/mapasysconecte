require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

console.log('Iniciando servidor...');

// Importar rotas do Asaas
const asaasRoutePath = path.join(__dirname, 'routes', 'asaas.js');
console.log('Tentando importar rotas do Asaas de:', asaasRoutePath);
const asaasRouter = require(asaasRoutePath);
console.log('Rotas do Asaas importadas com sucesso');

const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS
app.use(cors());
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Registrar as rotas do Asaas
console.log('Registrando rotas do Asaas em /api/asaas');
app.use('/api/asaas', asaasRouter);
console.log('Rotas do Asaas registradas');

// Função para criar conexão com o MySQL
const createConnection = async () => {
    const config = {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    };

    console.log('Tentando conectar ao MySQL com config:', {
        host: config.host,
        user: config.user,
        database: config.database
    });

    try {
        const connection = await mysql.createConnection(config);
        console.log('Conexão MySQL estabelecida com sucesso');
        return connection;
    } catch (error) {
        console.error('Erro ao conectar ao MySQL:', error);
        throw error;
    }
};

// Rota para buscar estatísticas dos concentradores
app.get('/api/concentrator-stats', async (req, res) => {
    try {
        const connection = await createConnection();

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
            ORDER BY n.nasname;
        `;

        console.log('Executando query de estatísticas dos concentradores');
        const [rows] = await connection.execute(query);
        
        // Log para debug
        console.log('Resultados:', rows);

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas dos concentradores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

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

// Rota para buscar consumo do usuário
app.get('/api/user-consumption/:username', async (req, res) => {
    try {
        const connection = await createConnection();
        const username = req.params.username;

        // Query para buscar o consumo do usuário nos últimos 7 dias
        const query = `
            SELECT 
                DATE(acctstarttime) as date,
                ROUND(SUM(acctinputoctets) / (1024 * 1024 * 1024), 2) as download_gb,
                ROUND(SUM(acctoutputoctets) / (1024 * 1024 * 1024), 2) as upload_gb
            FROM radacct 
            WHERE username = ?
            AND acctstarttime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(acctstarttime)
            ORDER BY date;
        `;

        console.log('Executando query de consumo do usuário:', username);
        const [rows] = await connection.execute(query, [username]);
        
        // Log para debug
        console.log('Resultados:', rows);

        // Formatar as datas para DD/MM
        const formattedData = rows.map(row => ({
            ...row,
            date: new Date(row.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));

        await connection.end();
        res.json(formattedData);
    } catch (error) {
        console.error('Erro ao buscar consumo do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para buscar histórico de conexões do usuário
app.get('/api/connections/user/:username/history', async (req, res) => {
    try {
        const connection = await createConnection();
        const username = req.params.username;

        // Query para buscar o histórico de conexões do usuário
        const query = `
            SELECT 
                radacctid,
                acctstarttime,
                acctstoptime,
                acctsessiontime,
                acctinputoctets,
                acctoutputoctets,
                callingstationid,
                framedipaddress,
                nasipaddress
            FROM radacct 
            WHERE username = ?
            ORDER BY acctstarttime DESC
            LIMIT 10;
        `;

        console.log('Executando query de histórico do usuário:', username);
        const [rows] = await connection.execute(query, [username]);
        
        // Log para debug
        console.log('Resultados:', rows);

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar histórico do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log('Variáveis de ambiente carregadas:', {
        MYSQL_HOST: process.env.MYSQL_HOST,
        MYSQL_DATABASE: process.env.MYSQL_DATABASE,
        PORT: process.env.PORT
    });
});
