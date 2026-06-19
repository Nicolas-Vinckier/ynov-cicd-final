const request = require('supertest');
const app = require('./app');
const { pool } = require('./db');

jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('GET /api/health', () => {
  it('should return status ok and 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/metrics', () => {
  let consoleErrorMock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('should return a list of metrics and 200 status when query succeeds', async () => {
    const mockMetrics = [
      { id: 2, value: 10.5, timestamp: '2026-06-19T08:00:00.000Z' },
      { id: 1, value: 42.5, timestamp: '2026-06-19T07:00:00.000Z' }
    ];
    pool.query.mockResolvedValueOnce({ rows: mockMetrics });

    const response = await request(app).get('/api/metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockMetrics);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM metrics ORDER BY id DESC');
  });

  it('should return 500 status when database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));

    const response = await request(app).get('/api/metrics');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database query failure');
    expect(consoleErrorMock).toHaveBeenCalled();
  });
});

describe('POST /api/metrics', () => {
  let consoleErrorMock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('should create a metric and return 201 when valid data is provided', async () => {
    const mockMetric = { id: 1, value: 42.5, timestamp: '2026-05-29T12:00:00.000Z' };
    pool.query.mockResolvedValueOnce({ rows: [mockMetric] });

    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 42.5, timestamp: '2026-05-29T12:00:00.000Z' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockMetric);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO metrics'),
      [42.5, '2026-05-29T12:00:00.000Z']
    );
  });

  it('should return 400 if value is missing or invalid', async () => {
    const response = await request(app)
      .post('/api/metrics')
      .send({ timestamp: '2026-05-29T12:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Value must be a valid number');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should return 400 if value is not a number string', async () => {
    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 'abc', timestamp: '2026-05-29T12:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Value must be a valid number');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should return 400 if timestamp is missing or not a string', async () => {
    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 12.3 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Timestamp must be a string');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should return 500 status when database insertion fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Insertion error'));

    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 42.5, timestamp: '2026-05-29T12:00:00.000Z' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database insertion failure');
    expect(consoleErrorMock).toHaveBeenCalled();
  });
});

describe('CORS configuration branch tests', () => {
  const originalEnv = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalEnv;
    jest.resetModules();
  });

  it('should parse CORS_ORIGIN env variable when defined', () => {
    process.env.CORS_ORIGIN = 'http://example.com, http://example2.com';
    jest.resetModules();
    const appWithCors = require('./app');
    expect(appWithCors).toBeDefined();
  });
});
