import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: 'radius'
    });

    const [rows] = await connection.execute(
      'SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname'
    );

    await connection.end();

    // Extrair apenas os groupnames do resultado
    const groupNames = (rows as any[]).map(row => row.groupname);

    res.status(200).json(groupNames);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Error fetching group names' });
  }
}
