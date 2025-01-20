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
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 3306,
        connectTimeout: 10000 // 10 segundos
    };

    // Log das configurações (ocultando a senha)
    console.log('Tentando conectar ao MySQL com:', {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port
    });

    // Verificar se as variáveis de ambiente estão definidas
    if (!config.host || !config.user || !config.password || !config.database) {
        console.error('Erro: Variáveis de ambiente do MySQL não configuradas corretamente:', {
            MYSQL_HOST: process.env.MYSQL_HOST,
            MYSQL_USER: process.env.MYSQL_USER,
            MYSQL_DATABASE: process.env.MYSQL_DATABASE,
            MYSQL_PORT: process.env.MYSQL_PORT
        });
        throw new Error('Configuração do MySQL incompleta');
    }

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
            ORDER BY n.nasname`;

        const [rows] = await connection.execute(query);
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: String(error) });
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

        let whereClause = '';
        const params = [];

        if (search) {
            whereClause += ' AND username LIKE ?';
            params.push(`%${search}%`);
        }

        if (status === 'up') {
            whereClause += ' AND acctstoptime IS NULL';
        } else if (status === 'down') {
            whereClause += ' AND acctstoptime IS NOT NULL';
        }

        if (nasip !== 'all') {
            whereClause += ' AND nasipaddress = ?';
            params.push(nasip);
        }

        // Count total records
        const [countRows] = await connection.execute(
            `SELECT COUNT(*) as total FROM radacct WHERE 1=1${whereClause}`,
            params
        );
        const totalRecords = countRows[0].total;

        // Get paginated records
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
            WHERE 1=1${whereClause}
            ORDER BY acctstarttime DESC 
            LIMIT ? OFFSET ?`;

        const [rows] = await connection.execute(query, [...params, limit, offset]);

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

// Rota para buscar histórico de conexões de um usuário
app.get('/api/connections/user/:username/history', async (req, res) => {
    try {
        const connection = await createConnection();
        const username = req.params.username;

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
            LIMIT 10`;

        const [rows] = await connection.execute(query, [username]);
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar histórico de conexões:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Middleware para tratar rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
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
