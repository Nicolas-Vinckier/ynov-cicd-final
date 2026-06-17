const { Pool } = require('pg');

const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const pool = new Pool({
  host: getRequiredEnv('POSTGRES_HOST') || 'localhost',
  user: getRequiredEnv('POSTGRES_USER') || 'postgres',
  password: getRequiredEnv('POSTGRES_PASSWORD'),
  database: getRequiredEnv('POSTGRES_DB') || 'metrics',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const initDb = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        value DOUBLE PRECISION NOT NULL,
        timestamp VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
