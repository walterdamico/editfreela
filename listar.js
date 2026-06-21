require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listarUsuarios() {
  try {
    console.log("Buscando usuários no banco de dados...\n");
    // Comando SQL para buscar todos os usuários cadastrados
    const resultado = await pool.query('SELECT id, nome, email, tipo_usuario, criado_em FROM usuarios');
    
    // O console.table desenha uma tabela perfeita no terminal!
    console.table(resultado.rows);
    
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
  } finally {
    pool.end(); // Fecha a conexão
  }
}

listarUsuarios();