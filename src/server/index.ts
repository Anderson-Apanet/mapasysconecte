import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota para buscar conexões com paginação e filtros
app.get('/api/connections', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';
    const nasip = req.query.nasip as string || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const connection = await mysql.createConnection({
            host: process.env.VITE_MYSQL_HOST || '187.103.249.49',
            user: process.env.VITE_MYSQL_USER || 'root',
            password: process.env.VITE_MYSQL_PASSWORD || 'bk134',
            database: 'radius'
        });

        let whereClause = '1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (username LIKE ? OR callingstationid LIKE ? OR framedipaddress LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            if (status === 'up') {
                whereClause += ' AND acctstoptime IS NULL';
            } else {
                whereClause += ' AND acctstoptime IS NOT NULL';
            }
        }

        if (nasip !== 'all') {
            whereClause += ' AND nasipaddress = ?';
            params.push(nasip);
        }

        // Consulta para contar total de registros
        const [countResult] = await connection.execute(
            `SELECT COUNT(*) as total FROM radacct WHERE ${whereClause}`,
            params
        );
        const totalRecords = (countResult as any[])[0].total;

        // Consulta principal com paginação
        const [rows] = await connection.execute(
            `SELECT * FROM radacct 
             WHERE ${whereClause}
             ORDER BY acctstarttime DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

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

// Rota para estatísticas dos concentradores
app.get('/api/concentrator-stats', async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.VITE_MYSQL_HOST || '187.103.249.49',
            user: process.env.VITE_MYSQL_USER || 'root',
            password: process.env.VITE_MYSQL_PASSWORD || 'bk134',
            database: 'radius'
        });

        const [rows] = await connection.execute(
            `SELECT nasipaddress, COUNT(*) as user_count 
             FROM radacct 
             WHERE acctstoptime IS NULL 
             GROUP BY nasipaddress`
        );

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Rota para consumo do usuário
app.get('/api/user-consumption/:username', async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.VITE_MYSQL_HOST || '187.103.249.49',
            user: process.env.VITE_MYSQL_USER || 'root',
            password: process.env.VITE_MYSQL_PASSWORD || 'bk134',
            database: 'radius'
        });

        const [rows] = await connection.execute(
            `SELECT 
                DATE(acctstarttime) as date,
                SUM(acctinputoctets)/(1024*1024*1024) as upload_gb,
                SUM(acctoutputoctets)/(1024*1024*1024) as download_gb
             FROM radacct 
             WHERE username = ?
             GROUP BY DATE(acctstarttime)
             ORDER BY date DESC
             LIMIT 30`,
            [req.params.username]
        );

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar consumo:', error);
        res.status(500).json({ error: String(error) });
    }
});

// Rota única para grupos do radius
app.get('/radius/groups', async (req, res) => {
    console.log('Recebida requisição GET /radius/groups');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.VITE_MYSQL_HOST || '187.103.249.49',
            user: process.env.VITE_MYSQL_USER || 'root',
            password: process.env.VITE_MYSQL_PASSWORD || 'bk134',
            database: 'radius'
        });

        console.log('Conexão MySQL estabelecida');

        const [rows] = await connection.execute('SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname');
        console.log('Grupos encontrados:', rows);

        await connection.end();
        res.json((rows as any[]).map(row => row.groupname));
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ error: String(error) });
    }
});

const port = 3001;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
