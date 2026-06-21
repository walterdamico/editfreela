require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarTabelas() {
  try {
    console.log("Conectando ao banco de dados no Render...");
    
    // 1. Tabela de Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        tipo_usuario VARCHAR(50) NOT NULL,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabela 'usuarios' verificada/criada.");

    // 2. Tabela de Vagas (Nova!)
    // O campo 'cliente_id' conecta a vaga diretamente ao usuário que a criou
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vagas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(150) NOT NULL,
        descricao TEXT NOT NULL,
        orcamento NUMERIC(10, 2) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabela 'vagas' criada com sucesso no Render!");

  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
  } finally {
    pool.end();
  }
}

criarTabelas();