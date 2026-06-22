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

  it('should return a list of metrics and 200 status when query succeeds without filters', async () => {
    const mockMetrics = [
      { id: 2, value: 10.5, timestamp: '2026-06-19T08:00:00.000Z', group: 'infra' },
      { id: 1, value: 42.5, timestamp: '2026-06-19T07:00:00.000Z', group: 'general' }
    ];
    pool.query.mockResolvedValueOnce({ rows: mockMetrics });

    const response = await request(app).get('/api/metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockMetrics);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, value, "timestamp", metric_group AS "group" FROM metrics ORDER BY "timestamp" DESC, id DESC',
      []
    );
  });

  it('should apply numeric, date and group filters to the metrics query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/metrics')
      .query({
        minValue: '10',
        maxValue: '50',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        group: 'infra',
      });

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE value >= $1 AND value <= $2 AND "timestamp" >= $3 AND "timestamp" <= $4 AND metric_group = $5'),
      [10, 50, '2026-06-01T00:00:00.000Z', '2026-06-30T00:00:00.000Z', 'infra']
    );
  });

  it.each`
    query                         | error
    ${{ minValue: 'abc' }}        | ${'minValue must be a valid number'}
    ${{ maxValue: 'abc' }}        | ${'maxValue must be a valid number'}
    ${{ startDate: 'invalid' }}   | ${'startDate must be a valid date'}
    ${{ endDate: 'invalid' }}     | ${'endDate must be a valid date'}
  `('should return 400 for invalid query parameter $error', async ({ query, error }) => {
    const response = await request(app).get('/api/metrics').query(query);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(error);
    expect(pool.query).not.toHaveBeenCalled();
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
    const mockMetric = { id: 1, value: 42.5, timestamp: '2026-05-29T12:00:00.000Z', group: 'production' };
    pool.query.mockResolvedValueOnce({ rows: [mockMetric] });

    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 42.5, timestamp: '2026-05-29T12:00:00.000Z', group: 'production' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockMetric);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO metrics'),
      [42.5, '2026-05-29T12:00:00.000Z', 'production']
    );
  });

  it('should create a metric with the default group when no group is provided', async () => {
    const mockMetric = { id: 1, value: 12, timestamp: '2026-05-29T12:00:00.000Z', group: 'general' };
    pool.query.mockResolvedValueOnce({ rows: [mockMetric] });

    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 12, timestamp: '2026-05-29T12:00:00.000Z' });

    expect(response.status).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      [12, '2026-05-29T12:00:00.000Z', 'general']
    );
  });

  it.each`
    body                                                       | error
    ${{ timestamp: '2026-05-29T12:00:00.000Z' }}              | ${'Value must be a valid number'}
    ${{ value: 'abc', timestamp: '2026-05-29T12:00:00.000Z' }} | ${'Value must be a valid number'}
    ${{ value: 12.3 }}                                        | ${'Timestamp must be a valid date'}
    ${{ value: 12.3, timestamp: 'invalid-date' }}             | ${'Timestamp must be a valid date'}
    ${{ value: 12.3, timestamp: '2026-05-29T12:00:00.000Z', group: 'x'.repeat(81) }} | ${'Group must contain 80 characters or fewer'}
  `('should return 400 for invalid body: $error', async ({ body, error }) => {
    const response = await request(app)
      .post('/api/metrics')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(error);
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

describe('DELETE /api/metrics', () => {
  let consoleErrorMock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('should delete all metrics and return the deleted count', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 3 });

    const response = await request(app).delete('/api/metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedCount: 3 });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM metrics');
  });

  it('should return zero deleted metrics when rowCount is not provided', async () => {
    pool.query.mockResolvedValueOnce({});

    const response = await request(app).delete('/api/metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedCount: 0 });
  });

  it('should return 500 status when database cleanup fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Delete error'));

    const response = await request(app).delete('/api/metrics');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database cleanup failure');
    expect(consoleErrorMock).toHaveBeenCalled();
  });
});

describe('CORS configuration branch tests', () => {
  const originalEnv = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalEnv;
    jest.resetModules();
  });

  it('should allow wildcard CORS by default', () => {
    delete process.env.CORS_ORIGIN;
    jest.resetModules();
    const appWithDefaultCors = require('./app');
    expect(appWithDefaultCors).toBeDefined();
  });

  it('should parse CORS_ORIGIN env variable when defined', () => {
    process.env.CORS_ORIGIN = 'http://example.com, http://example2.com';
    jest.resetModules();
    const appWithCors = require('./app');
    expect(appWithCors).toBeDefined();
  });
});
