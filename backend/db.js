const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'metrics',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      }
);

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        value DOUBLE PRECISION NOT NULL,
        timestamp VARCHAR(50) NOT NULL
      );
    `);
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initDb,
};
