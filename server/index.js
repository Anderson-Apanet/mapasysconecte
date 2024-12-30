const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.get('/api/router/traffic', (req, res) => {
    console.log('Recebida requisição para /api/router/traffic');
    
    // Dados fictícios da interface
    const mockData = [{
        name: 'sfp-sfpplus1-WAN-Adylnet',
        "rx-bits-per-second": Math.floor(Math.random() * 1000000000),
        "tx-bits-per-second": Math.floor(Math.random() * 1000000000),
        "rx-packets-per-second": Math.floor(Math.random() * 1000),
        "tx-packets-per-second": Math.floor(Math.random() * 1000)
    }];

    console.log('Enviando dados:', mockData);
    res.json(mockData);
});

// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
