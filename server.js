require('dotenv').config();

const bcrypt = require('bcrypt');

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

app.post('/cadastro', async (req, res) => {
  // Pega os dados que vieram do formulário HTML
  const { tipo_usuario, nome, email, senha } = req.body;

  try {
    // 1. Criptografar a senha (RNF03)
    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

    // 2. Salvar no banco de dados
    const query = `
      INSERT INTO usuarios (tipo_usuario, nome, email, senha) 
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const values = [tipo_usuario, nome, email, senhaCriptografada];
    
    await pool.query(query, values);

    // 3. Deu certo? Redireciona para o login com sucesso!
    console.log(`Novo usuário cadastrado: ${nome} (${tipo_usuario})`);
    res.redirect('/login'); 

  } catch (erro) {
    console.error(erro);
    // Se o erro for código 23505, significa que o e-mail já existe no banco
    if (erro.code === '23505') {
        res.send("Erro: Este e-mail já está cadastrado. <a href='/cadastro'>Voltar</a>");
    } else {
        res.send("Ocorreu um erro no servidor. <a href='/cadastro'>Voltar</a>");
    }
  }
});

app.listen(port, () => {
  console.log(`Servidor funcionando na porta ${port}`);
});