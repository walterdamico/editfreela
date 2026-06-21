require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000; 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

const path = require('path');

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Erro ao adquirir cliente (Normal se a BD local não existir)', err.stack);
  }
  console.log('Conectado à base de dados com sucesso!');
  release();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  // Envia o arquivo index.html que está dentro da pasta views
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cadastro.html'));
});

app.listen(port, () => {
  console.log(`Servidor funcionando na porta ${port}`);
});