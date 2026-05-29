const request = require('supertest');
const app = require('./app');
const { pool } = require('./db');

jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('POST /api/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should return 400 if timestamp is missing or not a string', async () => {
    const response = await request(app)
      .post('/api/metrics')
      .send({ value: 12.3 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Timestamp must be a string');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
