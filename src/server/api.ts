import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

// Middleware para debug
router.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rota para buscar grupos do Radius
router.get('/radius/groups', async (req, res) => {
  console.log('Acessando rota /radius/groups');
  try {
    const connection = await mysql.createConnection({
      host: process.env.VITE_MYSQL_HOST,
      user: process.env.VITE_MYSQL_USER,
      password: process.env.VITE_MYSQL_PASSWORD,
      database: 'radius'
    });

    console.log('Conexão MySQL estabelecida');
    const [rows] = await connection.execute(
      'SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname'
    );
    console.log('Grupos encontrados:', rows);

    await connection.end();
    res.json((rows as any[]).map(row => row.groupname));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Error fetching group names', details: error });
  }
});

export default router;
