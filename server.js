require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 

app.use(session({
  secret: 'chave_secreta_do_editfreela',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Habilita o servidor a ler requisições JSON via fetch

// --- ROTAS DE PÁGINAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'views', 'cadastro.html')));
app.get('/perfil', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});
app.get('/mural', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'views', 'mural.html'));
});

// --- OPERAÇÕES DE AUTENTICAÇÃO ---
app.post('/cadastro', async (req, res) => {
  const { tipo_usuario, nome, email, senha } = req.body;
  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    await pool.query(
      'INSERT INTO usuarios (tipo_usuario, nome, email, senha) VALUES ($1, $2, $3, $4)',
      [tipo_usuario, nome, email, senhaCriptografada]
    );
    res.redirect('/login'); 
  } catch (erro) {
    if (erro.code === '23505') return res.send("Erro: E-mail já cadastrado. <a href='/cadastro'>Voltar</a>");
    res.send("Erro no servidor.");
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) return res.send("Erro: Credenciais incorretas. <a href='/login'>Voltar</a>");
    
    const usuario = resultado.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.send("Erro: Credenciais incorretas. <a href='/login'>Voltar</a>");

    req.session.usuario = { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo_usuario };
    res.redirect('/mural'); 
  } catch (erro) {
    res.send("Erro no servidor.");
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// --- API DO USUÁRIO E PERFIL ---
app.get('/api/usuario', async (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  const dados = await pool.query('SELECT id, nome, tipo_usuario AS tipo, whatsapp, youtube FROM usuarios WHERE id = $1', [req.session.usuario.id]);
  res.json(dados.rows[0]);
});

app.post('/api/perfil', async (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  const { whatsapp, youtube } = req.body;
  await pool.query('UPDATE usuarios SET whatsapp = $1, youtube = $2 WHERE id = $3', [whatsapp, youtube, req.session.usuario.id]);
  res.json({ sucesso: true });
});

// --- INTERAÇÕES DO MURAL E VAGAS (CRUD + SOLICITAÇÕES) ---

// Listar vagas estruturadas inteligentes
app.get('/api/vagas', async (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  const userId = req.session.usuario.id;

  try {
    if (req.session.usuario.tipo === 'editor') {
      // Traz as vagas e diz se ESSE editor logado já enviou solicitação e qual o status
      const query = `
        SELECT v.*, u.nome AS contratante, s.status AS meu_status
        FROM vagas v
        JOIN usuarios u ON v.cliente_id = u.id
        LEFT JOIN solicitacoes s ON v.id = s.vaga_id AND s.editor_id = $1
        ORDER BY v.criado_em DESC`;
      const resultado = await pool.query(query, [userId]);
      return res.json(resultado.rows);
    } else {
      // Traz as vagas criadas pelo cliente + a contagem de solicitações pendentes nelas
      const query = `
        SELECT v.*, u.nome AS contratante,
          (SELECT COUNT(*) FROM solicitacoes WHERE vaga_id = v.id) AS total_solicitacoes
        FROM vagas v
        JOIN usuarios u ON v.cliente_id = u.id
        ORDER BY v.criado_em DESC`;
      const resultado = await pool.query(query);
      return res.json(resultado.rows);
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao listar" });
  }
});

// Criar nova vaga
app.post('/api/vagas', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'cliente') return res.status(403).json({ erro: 'Negado' });
  const { titulo, descricao, orcamento } = req.body;
  await pool.query('INSERT INTO vagas (cliente_id, titulo, descricao, orcamento) VALUES ($1, $2, $3, $4)', [req.session.usuario.id, titulo, descricao, orcamento]);
  res.json({ sucesso: true });
});

// Atualizar vaga existente (U do CRUD - Edição)
app.put('/api/vagas/:id', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'cliente') return res.status(403).json({ erro: 'Negado' });
  const { titulo, descricao, orcamento } = req.body;
  const resultado = await pool.query(
    'UPDATE vagas SET titulo = $1, descricao = $2, orcamento = $3 WHERE id = $4 AND cliente_id = $5',
    [titulo, descricao, orcamento, req.params.id, req.session.usuario.id]
  );
  if (resultado.rowCount === 0) return res.status(404).json({ erro: "Vaga não encontrada ou não autorizada." });
  res.json({ sucesso: true });
});

// Deletar Vaga
app.delete('/api/vagas/:id', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'cliente') return res.status(403).json({ erro: 'Negado' });
  await pool.query('DELETE FROM vagas WHERE id = $1 AND cliente_id = $2', [req.params.id, req.session.usuario.id]);
  res.json({ sucesso: true });
});

// Editor envia solicitação de interesse
app.post('/api/vagas/:id/candidatar', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'editor') return res.status(403).json({ erro: 'Apenas editores' });
  try {
    await pool.query('INSERT INTO solicitacoes (vaga_id, editor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.session.usuario.id]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao enviar interesse" });
  }
});

// Cliente visualiza candidatos da sua vaga
app.get('/api/vagas/:id/solicitacoes', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'cliente') return res.status(403).json({ erro: 'Negado' });
  const query = `
    SELECT s.id, s.status, u.nome AS editor_nome, u.whatsapp, u.youtube 
    FROM solicitacoes s
    JOIN usuarios u ON s.editor_id = u.id
    JOIN vagas v ON s.vaga_id = v.id
    WHERE s.vaga_id = $1 AND v.cliente_id = $2`;
  const resultado = await pool.query(query, [req.params.id, req.session.usuario.id]);
  res.json(resultado.rows);
});

// Cliente aprova/recusa a solicitação
app.put('/api/solicitacoes/:id', async (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'cliente') return res.status(403).json({ erro: 'Negado' });
  const { status } = req.body; // 'aprovada' ou 'recusada'
  await pool.query('UPDATE solicitacoes SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ sucesso: true });
});

app.listen(port, () => console.log(`Servidor na porta ${port}`));