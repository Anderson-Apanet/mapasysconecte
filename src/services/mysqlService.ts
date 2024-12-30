import mysql from 'mysql2/promise';

const createConnection = async () => {
  return await mysql.createConnection({
    host: import.meta.env.VITE_MYSQL_HOST,
    user: import.meta.env.VITE_MYSQL_USER,
    password: import.meta.env.VITE_MYSQL_PASSWORD,
    database: 'radius'
  });
};

export const getGroupNames = async (): Promise<string[]> => {
  try {
    const connection = await createConnection();
    const [rows] = await connection.execute(
      'SELECT DISTINCT groupname FROM radusergroup ORDER BY groupname'
    );
    await connection.end();
    return (rows as any[]).map(row => row.groupname);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};
