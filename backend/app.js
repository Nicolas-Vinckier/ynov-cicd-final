const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM metrics ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failure' });
  }
});

app.post('/api/metrics', async (req, res) => {
  const { value, timestamp } = req.body;

  if (value === undefined || value === null || isNaN(Number(value))) {
    return res.status(400).json({ error: 'Value must be a valid number' });
  }
  if (!timestamp || typeof timestamp !== 'string') {
    return res.status(400).json({ error: 'Timestamp must be a string' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO metrics (value, timestamp) VALUES ($1, $2) RETURNING *',
      [Number(value), timestamp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insertion failure' });
  }
});

module.exports = app;
