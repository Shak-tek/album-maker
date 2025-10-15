const { Client } = require('pg');

const ensureEnv = () => {
  if (!process.env.NEON_DB_URL) {
    throw new Error('Missing NEON_DB_URL env var');
  }
};

const createClient = () =>
  new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

const respond = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(bodyObj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  try {
    ensureEnv();
  } catch (err) {
    return respond(500, { error: err.message });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const errors = [];
  if (!payload.sessionId) errors.push('sessionId is required');
  if (!payload.userId) errors.push('userId is required');
  if (!payload.albumSize || typeof payload.albumSize.width !== 'number' || typeof payload.albumSize.height !== 'number') {
    errors.push('albumSize with numeric width/height is required');
  }
  if (!Array.isArray(payload.pages) || payload.pages.length === 0) {
    errors.push('pages must be a non-empty array');
  }

  if (errors.length) {
    return respond(400, { error: errors.join('; ') });
  }

  const client = createClient();
  await client.connect();

  try {
    const insert = await client.query(
      `INSERT INTO album_jobs (
        user_id,
        session_id,
        customer_name,
        album_title,
        album_subtitle,
        payload,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending') RETURNING id`,
      [
        payload.userId || null,
        payload.sessionId,
        payload.customerName || null,
        payload.title || null,
        payload.subtitle || null,
        JSON.stringify(payload),
      ],
    );

    return respond(202, { jobId: insert.rows[0].id });
  } catch (err) {
    console.error('Failed to enqueue album job', err);
    return respond(500, { error: 'Failed to enqueue album job' });
  } finally {
    await client.end();
  }
};

