import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.get('/groups', async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.VITE_MYSQL_HOST,
            user: process.env.VITE_MYSQL_USER,
            password: process.env.VITE_MYSQL_PASSWORD,
            database: 'radius'
        });

        const [rows] = await connection.execute(
            'SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname'
        );

        await connection.end();
        res.json((rows as any[]).map(row => row.groupname));
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ error: 'Erro ao buscar grupos' });
    }
});

export default router;
