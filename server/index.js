// Carregar variáveis de ambiente
const dotenv = require('dotenv');
const path = require('path');

// Em produção, usar .env.production
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
} else {
    dotenv.config();
}

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { mysqlHost, mysqlUser, mysqlPassword, mysqlDatabase } = require('./config');

console.log('Iniciando servidor com configuração:', {
    nodeEnv: process.env.NODE_ENV,
    mysqlHost: mysqlHost,
    port: process.env.PORT
});

// Importar rotas do Asaas
const asaasRouter = require('./routes/asaas');
console.log('Rotas do Asaas importadas com sucesso');

// Importar rotas do Radius
const radiusRouter = require('./routes/radius');
console.log('Rotas do Radius importadas com sucesso');

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

// Servir arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
    console.log('Configurando arquivos estáticos do frontend...');
    const distPath = path.resolve(__dirname, '../dist');
    console.log('Caminho do dist:', distPath);
    app.use(express.static(distPath));

    // Registrar rotas
    app.use('/api/asaas', asaasRouter);
    app.use('/api/support', radiusRouter);  
    console.log('Rotas do Asaas e Radius registradas');

    // Rota de teste para verificar se o servidor está funcionando
    app.get('/api/test', (req, res) => {
        res.json({ 
            message: 'API está funcionando!',
            timestamp: new Date().toISOString()
        });
    });

    // Importante: Adicionar rota catch-all para o frontend (SPA)
    app.get('*', (req, res) => {
        // Excluir rotas de API
        if (!req.path.startsWith('/api')) {
            console.log(`Redirecionando rota SPA: ${req.path} para index.html`);
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            // Para rotas de API não encontradas
            res.status(404).json({ error: 'API endpoint não encontrado', path: req.path });
        }
    });
} else {
    // Registrar rotas
    app.use('/api/asaas', asaasRouter);
    app.use('/api/support', radiusRouter);  
    console.log('Rotas do Asaas e Radius registradas');

    // Rota de teste para verificar se o servidor está funcionando
    app.get('/api/test', (req, res) => {
        res.json({ 
            message: 'API está funcionando!',
            timestamp: new Date().toISOString()
        });
    });
}

// Função para criar conexão com o banco MySQL
const createConnection = async () => {
    try {
        const connection = await mysql.createConnection({
            host: mysqlHost,
            user: mysqlUser,
            password: mysqlPassword,
            database: mysqlDatabase
        });
        return connection;
    } catch (error) {
        console.error('Erro ao criar conexão:', error);
        throw error;
    }
};

// Mover esta rota para o arquivo de rotas do radius
// app.get('/api/concentrator-stats', async (req, res) => {
//     try {
//         const connection = await createConnection();

//         // Query para buscar os concentradores da tabela nas e contar usuários ativos por concentrador
//         const query = `
//             SELECT 
//                 n.nasname,
//                 n.shortname,
//                 n.type,
//                 n.ports,
//                 n.description,
//                 COUNT(DISTINCT CASE 
//                     WHEN r.acctstoptime IS NULL THEN 
//                         CASE 
//                             WHEN n.nasname = '172.16.0.25' AND r.nasipaddress = '172.16.255.13' THEN r.username
//                             WHEN n.nasname = r.nasipaddress THEN r.username
//                             ELSE NULL
//                         END
//                     ELSE NULL 
//                 END) as user_count
//             FROM nas n
//             LEFT JOIN radacct r ON 
//                 CASE 
//                     WHEN n.nasname = '172.16.0.25' THEN r.nasipaddress = '172.16.255.13'
//                     ELSE n.nasname = r.nasipaddress
//                 END
//             GROUP BY n.nasname, n.shortname, n.type, n.ports, n.description
//             ORDER BY n.nasname`;

//         const [rows] = await connection.execute(query);
//         await connection.end();
//         res.json(rows);
//     } catch (error) {
//         console.error('Erro ao buscar estatísticas:', error);
//         res.status(500).json({ error: String(error) });
//     }
// });

// Rota para buscar conexões
// app.get('/api/support/connections', async (req, res) => {
//     try {
//         const connection = await createConnection();
//         const page = parseInt(req.query.page) || 1;
//         const limit = 10;
//         const offset = (page - 1) * limit;
//         const search = req.query.search || '';
//         const status = req.query.status || 'all';
//         const nasip = req.query.nasip || 'all';

//         let whereClause = '';
//         const params = [];

//         if (search) {
//             whereClause += ' AND ra.username LIKE ?';
//             params.push(`%${search}%`);
//         }

//         if (status === 'up') {
//             whereClause += ' AND ra.acctstoptime IS NULL';
//         } else if (status === 'down') {
//             whereClause += ' AND ra.acctstoptime IS NOT NULL';
//         }

//         if (nasip !== 'all') {
//             whereClause += ' AND ra.nasipaddress = ?';
//             params.push(nasip);
//         }

//         // Count total records
//         const [countRows] = await connection.execute(
//             `WITH LastConnection AS (
//                 SELECT username, MAX(radacctid) as last_id
//                 FROM radacct
//                 GROUP BY username
//             )
//             SELECT COUNT(*) as total 
//             FROM LastConnection lc
//             JOIN radacct ra ON ra.radacctid = lc.last_id
//             WHERE 1=1 ${whereClause}`,
//             params
//         );
//         const totalRecords = countRows[0].total;

//         // Get paginated records
//         const query = `
//             WITH LastConnection AS (
//                 SELECT username, MAX(radacctid) as last_id
//                 FROM radacct
//                 GROUP BY username
//             )
//             SELECT 
//                 ra.radacctid,
//                 ra.username,
//                 ra.nasipaddress,
//                 ra.nasportid,
//                 ra.acctstarttime,
//                 ra.acctstoptime,
//                 ra.acctinputoctets,
//                 ra.acctoutputoctets,
//                 ra.acctterminatecause,
//                 ra.framedipaddress,
//                 ra.callingstationid
//             FROM LastConnection lc
//             JOIN radacct ra ON ra.radacctid = lc.last_id
//             WHERE 1=1 ${whereClause}
//             ORDER BY ra.acctstarttime DESC 
//             LIMIT ? OFFSET ?`;

//         const [rows] = await connection.execute(query, [...params, limit, offset]);

//         await connection.end();

//         res.json({
//             data: rows,
//             pagination: {
//                 currentPage: page,
//                 totalPages: Math.ceil(totalRecords / limit),
//                 totalRecords,
//                 recordsPerPage: limit
//             }
//         });
//     } catch (error) {
//         console.error('Erro ao buscar conexões:', error);
//         res.status(500).json({ error: String(error) });
//     }
// });

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
app.get('/api/support/connections/user/:username/history', async (req, res) => {
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

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Erro ao buscar histórico de conexões:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar histórico de conexões',
            details: error.message 
        });
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
    console.log('- MYSQL_HOST:', mysqlHost);
    console.log('- MYSQL_DATABASE:', mysqlDatabase);
    console.log('- ASAAS_API_KEY:', process.env.ASAAS_API_KEY ? 'Configurado' : 'Não configurado');
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
