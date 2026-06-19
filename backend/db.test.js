const { initDb } = require('./db');
const { Pool } = require('pg');

jest.mock('pg', () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({}),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn().mockResolvedValue(mClient),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize the database and create tables', async () => {
    const poolInstance = new Pool();
    await initDb();
    expect(poolInstance.connect).toHaveBeenCalled();
    const client = await poolInstance.connect();
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS metrics'));
    expect(client.release).toHaveBeenCalled();
  });

  it('should construct Pool correctly based on environment variables', () => {
    const originalEnv = { ...process.env };
    
    // Test case 1: DATABASE_URL is set (production)
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { Pool: PoolProd } = require('pg');
    require('./db');
    expect(PoolProd).toHaveBeenCalledWith(expect.objectContaining({
      connectionString: 'postgres://user:pass@host:5432/db',
      ssl: { rejectUnauthorized: false }
    }));

    // Test case 2: DATABASE_URL is set (development)
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { Pool: PoolDev } = require('pg');
    require('./db');
    expect(PoolDev).toHaveBeenCalledWith(expect.objectContaining({
      connectionString: 'postgres://user:pass@host:5432/db',
      ssl: false
    }));

    // Test case 3: fallback standard config (explicit env variables)
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_HOST = 'test-host';
    process.env.POSTGRES_USER = 'test-user';
    process.env.POSTGRES_PASSWORD = 'test-password';
    process.env.POSTGRES_DB = 'test-db';
    process.env.POSTGRES_PORT = '5432';
    jest.resetModules();
    const { Pool: PoolFallback } = require('pg');
    require('./db');
    expect(PoolFallback).toHaveBeenCalledWith(expect.objectContaining({
      host: 'test-host',
      user: 'test-user',
      password: 'test-password',
      database: 'test-db',
      port: 5432
    }));

    // Test case 4: fallback default values (no env variables defined)
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_DB;
    delete process.env.POSTGRES_PORT;
    jest.resetModules();
    const { Pool: PoolDefaults } = require('pg');
    require('./db');
    expect(PoolDefaults).toHaveBeenCalledWith(expect.objectContaining({
      host: 'localhost',
      user: 'postgres',
      password: 'postgres',
      database: 'metrics',
      port: 5432
    }));

    // Reset env
    process.env = originalEnv;
  });
});
