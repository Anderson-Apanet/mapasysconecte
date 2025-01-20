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
        host: process.env.MYSQL_HOST || '201.76.1.124',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'bk134',
        database: process.env.MYSQL_DATABASE || 'radius',
        connectTimeout: 10000 // 10 segundos
    };
    console.log('Conectando ao MySQL com:', {
        host: config.host,
        user: config.user,
        database: config.database
    });
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

        // Consulta para obter todos os usuários da radcheck e suas últimas conexões (se houverem)
        const query = `
            WITH LastRecords AS (
                SELECT username, MAX(radacctid) as max_id
                FROM radacct
                GROUP BY username
            )
            SELECT 
                rc.username,
                ra.radacctid,
                ra.nasipaddress,
                ra.nasportid,
                ra.acctstarttime,
                ra.acctstoptime,
                ra.acctinputoctets,
                ra.acctoutputoctets,
                ra.acctterminatecause,
                ra.framedipaddress,
                ra.callingstationid
            FROM radcheck rc
            LEFT JOIN LastRecords lr ON rc.username = lr.username
            LEFT JOIN radacct ra ON lr.max_id = ra.radacctid
            WHERE (
                rc.username LIKE ? OR
                ra.callingstationid LIKE ? OR
                ra.framedipaddress LIKE ?
            )
            AND CASE 
                WHEN ? = 'up' THEN ra.acctstoptime IS NULL
                WHEN ? = 'down' THEN ra.acctstoptime IS NOT NULL
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != 'all' THEN ra.nasipaddress = ?
                ELSE TRUE
            END
            ORDER BY ra.acctstarttime DESC
            LIMIT ? OFFSET ?
        `;

        // Consulta para contar o total de registros
        const countQuery = `
            SELECT COUNT(DISTINCT rc.username) as total
            FROM radcheck rc
            LEFT JOIN radacct ra ON rc.username = ra.username
            WHERE (
                rc.username LIKE ? OR
                ra.callingstationid LIKE ? OR
                ra.framedipaddress LIKE ?
            )
            AND CASE 
                WHEN ? = 'up' THEN ra.acctstoptime IS NULL
                WHEN ? = 'down' THEN ra.acctstoptime IS NOT NULL
                ELSE TRUE
            END
            AND CASE 
                WHEN ? != 'all' THEN ra.nasipaddress = ?
                ELSE TRUE
            END
        `;

        const searchPattern = `%${search}%`;
        const [rows] = await connection.execute(query, [
            searchPattern, searchPattern, searchPattern,
            status, status,
            nasip, nasip,
            limit, offset
        ]);

        const [countRows] = await connection.execute(countQuery, [
            searchPattern, searchPattern, searchPattern,
            status, status,
            nasip, nasip
        ]);

        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limit);

        await connection.end();

        res.json({
            data: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: total,
                recordsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error in /api/support/connections:', error);
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
