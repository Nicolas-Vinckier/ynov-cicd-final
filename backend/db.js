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
        "timestamp" TIMESTAMPTZ NOT NULL,
        metric_group VARCHAR(80) NOT NULL DEFAULT 'general'
      );
    `);

    await client.query(`
      ALTER TABLE metrics
      ADD COLUMN IF NOT EXISTS metric_group VARCHAR(80) NOT NULL DEFAULT 'general';
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'metrics'
            AND column_name = 'timestamp'
            AND data_type <> 'timestamp with time zone'
        ) THEN
          ALTER TABLE metrics
          ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ
          USING CASE
            WHEN "timestamp" ~ '^\\d{4}-\\d{2}-\\d{2}' THEN "timestamp"::timestamptz
            ELSE NOW()
          END;
        END IF;
      END $$;
    `);
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initDb,
};
