const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || '*';
const corsOptions = {
  origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map((origin) => origin.trim()),
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

const isValidMetricValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue);
};

const isValidTimestamp = (timestamp) => (
  typeof timestamp === 'string' && timestamp.trim().length > 0 && timestamp.length <= 80
);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'metrics-api',
    uptime: Math.round(process.uptime()),
  });
});

app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM metrics ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Unable to fetch metrics:', err);
    res.status(500).json({ error: 'Database query failure' });
  }
});

app.post('/api/metrics', async (req, res) => {
  const { value, timestamp } = req.body;

  if (!isValidMetricValue(value)) {
    return res.status(400).json({ error: 'Value must be a finite number' });
  }

  if (!isValidTimestamp(timestamp)) {
    return res.status(400).json({ error: 'Timestamp must be a non-empty string' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO metrics (value, timestamp) VALUES ($1, $2) RETURNING *',
      [Number(value), timestamp.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Unable to insert metric:', err);
    res.status(500).json({ error: 'Database insertion failure' });
  }
});

module.exports = app;
