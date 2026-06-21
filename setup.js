require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function atualizarBanco() {
  try {
    console.log("Atualizando estrutura do banco no Render...");
    
    // 1. Adiciona as colunas de perfil na tabela de usuários se elas não existirem
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);`);
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS youtube VARCHAR(255);`);
    console.log("Campos de perfil (whatsapp/youtube) verificados.");

    // 2. Cria a tabela de Solicitações de Interesse (Vaga <-> Editor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitacoes (
        id SERIAL PRIMARY KEY,
        vaga_id INTEGER REFERENCES vagas(id) ON DELETE CASCADE,
        editor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pendente',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vaga_id, editor_id)
      );
    `);
    console.log("Tabela 'solicitacoes' pronta!");

  } catch (error) {
    console.error("Erro ao atualizar banco:", error);
  } finally {
    pool.end();
  }
}

atualizarBanco();