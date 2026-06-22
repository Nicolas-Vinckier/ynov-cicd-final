const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();

const normalizeCorsOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  return corsOrigin === '*'
    ? '*'
    : corsOrigin.split(',').map(origin => origin.trim());
};

app.use(cors({ origin: normalizeCorsOrigins() }));
app.use(express.json());

const isInvalidNumber = value => value === undefined || value === null || value === '' || Number.isNaN(Number(value));

const isInvalidDate = value => !value || Number.isNaN(Date.parse(value));

const normalizeGroup = group => {
  if (group === undefined || group === null || String(group).trim() === '') {
    return 'general';
  }
  return String(group).trim();
};

const buildMetricsQuery = ({ minValue, maxValue, startDate, endDate, group }) => {
  const filters = [];
  const values = [];

  if (minValue !== undefined) {
    if (isInvalidNumber(minValue)) {
      return { error: 'minValue must be a valid number' };
    }
    values.push(Number(minValue));
    filters.push(`value >= $${values.length}`);
  }

  if (maxValue !== undefined) {
    if (isInvalidNumber(maxValue)) {
      return { error: 'maxValue must be a valid number' };
    }
    values.push(Number(maxValue));
    filters.push(`value <= $${values.length}`);
  }

  if (startDate !== undefined) {
    if (isInvalidDate(startDate)) {
      return { error: 'startDate must be a valid date' };
    }
    values.push(new Date(startDate).toISOString());
    filters.push(`"timestamp" >= $${values.length}`);
  }

  if (endDate !== undefined) {
    if (isInvalidDate(endDate)) {
      return { error: 'endDate must be a valid date' };
    }
    values.push(new Date(endDate).toISOString());
    filters.push(`"timestamp" <= $${values.length}`);
  }

  if (group !== undefined && String(group).trim() !== '') {
    values.push(String(group).trim());
    filters.push(`metric_group = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';
  return {
    text: `SELECT id, value, "timestamp", metric_group AS "group" FROM metrics${whereClause} ORDER BY "timestamp" DESC, id DESC`,
    values,
  };
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/metrics', async (req, res) => {
  const query = buildMetricsQuery(req.query);

  if (query.error) {
    return res.status(400).json({ error: query.error });
  }

  try {
    const result = await pool.query(query.text, query.values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failure' });
  }
});

app.post('/api/metrics', async (req, res) => {
  const { value, timestamp, group } = req.body;
  const metricGroup = normalizeGroup(group);

  if (isInvalidNumber(value)) {
    return res.status(400).json({ error: 'Value must be a valid number' });
  }
  if (isInvalidDate(timestamp)) {
    return res.status(400).json({ error: 'Timestamp must be a valid date' });
  }
  if (metricGroup.length > 80) {
    return res.status(400).json({ error: 'Group must contain 80 characters or fewer' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO metrics (value, "timestamp", metric_group) VALUES ($1, $2, $3) RETURNING id, value, "timestamp", metric_group AS "group"',
      [Number(value), new Date(timestamp).toISOString(), metricGroup]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insertion failure' });
  }
});

app.delete('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM metrics');
    res.json({ deletedCount: result.rowCount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database cleanup failure' });
  }
});

module.exports = app;
