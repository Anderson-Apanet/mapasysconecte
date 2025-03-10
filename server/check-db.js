const mysql = require('mysql2/promise');
const { mysqlHost, mysqlUser, mysqlPassword, mysqlDatabase } = require('./config');

async function checkDatabase() {
  try {
    console.log('Conectando ao banco de dados MySQL...');
    console.log('Configuração:', {
      host: mysqlHost,
      user: mysqlUser,
      database: mysqlDatabase
    });

    const connection = await mysql.createConnection({
      host: mysqlHost,
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase
    });

    console.log('Conexão estabelecida com sucesso!');

    // Verificar se a tabela radacct existe
    const [tables] = await connection.query('SHOW TABLES LIKE "radacct"');
    if (tables.length === 0) {
      console.error('A tabela radacct não existe no banco de dados!');
      connection.end();
      return;
    }

    console.log('A tabela radacct existe no banco de dados.');

    // Verificar a estrutura da tabela
    const [columns] = await connection.query('DESCRIBE radacct');
    console.log('Estrutura da tabela radacct:');
    columns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });

    // Verificar se há dados na tabela
    const [count] = await connection.query('SELECT COUNT(*) as total FROM radacct');
    console.log(`Total de registros na tabela radacct: ${count[0].total}`);

    // Buscar um exemplo de registro
    if (count[0].total > 0) {
      const [sample] = await connection.query('SELECT * FROM radacct LIMIT 1');
      console.log('Exemplo de registro:');
      console.log(JSON.stringify(sample[0], null, 2));
    }

    connection.end();
  } catch (error) {
    console.error('Erro ao verificar o banco de dados:', error);
  }
}

checkDatabase();
