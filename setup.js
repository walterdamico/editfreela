require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarTabelas() {
  try {
    console.log("Conectando ao banco de dados no Render...");
    
    // Comando SQL para criar a tabela de Usuários
    const query = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        tipo_usuario VARCHAR(50) NOT NULL,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(query);
    console.log("Tabela 'usuarios' criada com sucesso no Render!");
  } catch (error) {
    console.error("Erro ao criar tabela:", error);
  } finally {
    pool.end(); // Fecha a conexão
  }
}

criarTabelas();