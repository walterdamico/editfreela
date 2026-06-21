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
});

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
  res.send('O servidor do EditFreela está a correr perfeitamente!');
});

app.listen(port, () => {
  console.log(`Servidor a correr na porta ${port}`);
});