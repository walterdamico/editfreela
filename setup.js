require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function atualizarBanco() {
  try {
    console.log("Conectando ao banco de dados no Render...");
    
    // Adiciona o campo de descrição se ele não existir
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS descricao TEXT;`);
    console.log("Nova coluna 'descricao' adicionada com sucesso à tabela 'usuarios'!");

  } catch (error) {
    console.error("Erro ao atualizar banco:", error);
  } finally {
    pool.end();
  }
}

atualizarBanco();