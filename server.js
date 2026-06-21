require('dotenv').config();

const bcrypt = require('bcrypt');
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 

// Configuração da Sessão (deve vir ANTES das rotas)
app.use(session({
  secret: 'chave_secreta_do_editfreela', // Uma senha interna do servidor para proteger os cookies
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // O cookie dura 24 horas (em milissegundos)
}));

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

// Rota para processar o formulário de Login
app.post('/login', async (req, res) => {
  // Pega os dados que o utilizador digitou no formulário
  const { email, senha } = req.body;

  try {
    // 1. Ir à base de dados procurar se este e-mail existe
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const resultado = await pool.query(query, [email]);

    // Se não encontrou nenhuma linha, o e-mail não existe
    if (resultado.rows.length === 0) {
      return res.send("Erro: E-mail ou senha incorretos. <a href='/login'>Tentar novamente</a>");
    }

    // Pega os dados do utilizador encontrado
    const usuario = resultado.rows[0];

    // 2. Usar o bcrypt para comparar a senha digitada com a senha "embaralhada" do banco
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.send("Erro: E-mail ou senha incorretos. <a href='/login'>Tentar novamente</a>");
    }

    // 3. SUCESSO! A senha está certa. Vamos criar a sessão:
    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo_usuario
    };

    console.log(`Login com sucesso: ${usuario.nome}`);
    
    // Redireciona o utilizador diretamente para o Mural de Vagas!
    res.redirect('/mural'); 

  } catch (erro) {
    console.error("Erro no login:", erro);
    res.send("Ocorreu um erro no servidor. <a href='/login'>Voltar</a>");
  }
});

app.get('/api/usuario', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
  // Envia os dados do usuário logado (nome, tipo, etc.) em formato JSON
  res.json(req.session.usuario);
});

// 2. Rota do Mural de Vagas (Protegida!)
app.get('/mural', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login'); 
  }
  // Agora envia o ficheiro HTML de verdade!
  res.sendFile(path.join(__dirname, 'views', 'mural.html'));
});

// Rota para Sair da conta
app.get('/logout', (req, res) => {
  req.session.destroy(); // Destrói o "crachá"
  res.redirect('/login');
});

app.listen(port, () => {
  console.log(`Servidor funcionando na porta ${port}`);
});