import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: '187.103.249.49',
      port: 3306,
      user: 'root',
      password: 'bk134',
      database: 'radius'
    });

    console.log('Successfully connected to the database');

    // Test query to check table structure
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\nAvailable tables:', tables);

    // Test query to check radacct table
    const [columns] = await connection.execute('SHOW COLUMNS FROM radacct');
    console.log('\nradacct table structure:', columns);

    // Test query to get a sample record
    const [records] = await connection.execute('SELECT * FROM radacct LIMIT 1');
    console.log('\nSample record:', records);

    // Get total count
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM radacct');
    console.log('\nTotal records in radacct:', count[0].total);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
