// Script simples para iniciar o servidor na porta 3001
const { exec } = require('child_process');
const path = require('path');

console.log('Iniciando servidor na porta 3001...');

const serverProcess = exec('npx tsx src/server/index.ts', {
  cwd: __dirname
});

serverProcess.stdout.on('data', (data) => {
  console.log(data);
});

serverProcess.stderr.on('data', (data) => {
  console.error(data);
});

serverProcess.on('close', (code) => {
  console.log(`Servidor encerrado com código ${code}`);
});
