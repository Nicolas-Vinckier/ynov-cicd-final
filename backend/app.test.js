const request = require('supertest');
const app = require('./app');
const { pool } = require('./db');

jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('metrics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('GET /api/health', () => {
    it('should expose a lightweight health endpoint', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('metrics-api');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return metrics ordered by the database query', async () => {
      const mockRows = [
        { id: 2, value: 13, timestamp: '2026-06-15T12:01:00.000Z' },
        { id: 1, value: 8, timestamp: '2026-06-15T12:00:00.000Z' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const response = await request(app).get('/api/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRows);
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM metrics ORDER BY id DESC');
    });

    it('should return 500 when the database query fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('database unavailable'));

      const response = await request(app).get('/api/metrics');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database query failure');
    });
  });

  describe('POST /api/metrics', () => {
    it('should create a metric and return 201 when valid data is provided', async () => {
      const mockMetric = { id: 1, value: 42.5, timestamp: '2026-05-29T12:00:00.000Z' };
      pool.query.mockResolvedValueOnce({ rows: [mockMetric] });

      const response = await request(app)
        .post('/api/metrics')
        .send({ value: '42.5', timestamp: ' 2026-05-29T12:00:00.000Z ' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMetric);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO metrics'),
        [42.5, '2026-05-29T12:00:00.000Z']
      );
    });

    it.each([
      { timestamp: '2026-05-29T12:00:00.000Z' },
      { value: Number.POSITIVE_INFINITY, timestamp: '2026-05-29T12:00:00.000Z' },
      { value: 'abc', timestamp: '2026-05-29T12:00:00.000Z' },
    ])('should return 400 if value is missing or invalid: %p', async (payload) => {
      const response = await request(app)
        .post('/api/metrics')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Value must be a finite number');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it.each([
      { value: 12.3 },
      { value: 12.3, timestamp: '' },
      { value: 12.3, timestamp: ' '.repeat(81) },
    ])('should return 400 if timestamp is missing or invalid: %p', async (payload) => {
      const response = await request(app)
        .post('/api/metrics')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Timestamp must be a non-empty string');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 500 when the database insert fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('insert failed'));

      const response = await request(app)
        .post('/api/metrics')
        .send({ value: 12.3, timestamp: '2026-05-29T12:00:00.000Z' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database insertion failure');
    });
  });
});
