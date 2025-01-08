require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

console.log('Iniciando servidor...');

// Importar rotas do Asaas
const asaasRouter = require('./routes/asaas');
console.log('Rotas do Asaas importadas com sucesso');

const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS
app.use(cors());

// Configurar body-parser antes das rotas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
});

// Registrar as rotas do Asaas
console.log('Registrando rotas do Asaas em /api/asaas');
app.use('/api/asaas', asaasRouter);
console.log('Rotas do Asaas registradas');

// Rota de teste para verificar se o servidor está funcionando
app.get('/api/test', (req, res) => {
    res.json({ message: 'Servidor funcionando!' });
});

// Listar todas as rotas registradas
console.log('\nRotas registradas:');
function printRoutes(stack, basePath = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            console.log(`${methods} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            const newBasePath = basePath + (layer.regexp.toString().replace('/^\\', '').replace('\\/?(?=\\/|$)/i', ''));
            printRoutes(layer.handle.stack, newBasePath);
        }
    });
}

printRoutes(app._router.stack);

// Função para criar conexão com o MySQL
const createConnection = async () => {
    const config = {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    };
    return await mysql.createConnection(config);
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

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log('Ambiente:', process.env.NODE_ENV);
    console.log('Variáveis de ambiente carregadas:');
    console.log('- MYSQL_HOST:', process.env.MYSQL_HOST);
    console.log('- MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
    console.log('- ASAAS_API_KEY:', process.env.ASAAS_API_KEY ? 'Configurado' : 'Não configurado');
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message 
    });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
    console.log('Rota não encontrada:', req.method, req.url);
    res.status(404).json({ 
        error: 'Rota não encontrada',
        method: req.method,
        url: req.url
    });
});
