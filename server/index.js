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

// Importar rotas de Mensagens
const messagesRouter = require('./routes/messages');
console.log('Rotas de Mensagens importadas com sucesso');

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

// Função para inicializar o servidor
async function startServer() {
    const app = express();
    const port = process.env.PORT || 3001;

    app.use(cors());
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
    }

    // Registrar rotas
    app.use('/api/asaas', asaasRouter);
    app.use('/api/support', radiusRouter);
    app.use('/api/messages', messagesRouter);

    // Rota de teste para verificar se o servidor está funcionando
    app.get('/api/test', (req, res) => {
        res.json({ 
            message: 'API está funcionando!',
            timestamp: new Date().toISOString()
        });
    });

    // Rota para buscar histórico de conexões de um usuário (endpoint alternativo)
    app.get('/api/connection-history/:username', async (req, res) => {
        try {
            const connection = await createConnection();
            const username = req.params.username;

            console.log(`Buscando histórico de conexões para o usuário: ${username}`);

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
            
            console.log(`Encontradas ${rows.length} conexões para o usuário ${username}`);
            
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

    // Rota para buscar histórico de conexões de um usuário (endpoint de desenvolvimento)
    app.get('/api/support/connections/user/:username/history', async (req, res) => {
        try {
            const connection = await createConnection();
            const username = req.params.username;

            console.log(`Buscando histórico de conexões para o usuário (endpoint dev): ${username}`);

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
            
            console.log(`Encontradas ${rows.length} conexões para o usuário ${username}`);
            
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

    // Importante: Adicionar rota catch-all para o frontend (SPA)
    app.get('*', (req, res) => {
        // Excluir rotas de API
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // Servir o index.html para todas as outras rotas (SPA)
        if (process.env.NODE_ENV === 'production') {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        } else {
            res.sendFile(path.join(__dirname, '../public/index.html'));
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

    // Iniciar o servidor na porta especificada
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
}

startServer();
