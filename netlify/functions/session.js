const { Client } = require('pg');

exports.handler = async (event) => {
  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters && event.queryStringParameters.userId;
      if (!userId) return { statusCode: 400, body: 'userId required' };
      const { rows } = await client.query('SELECT session_id, settings FROM sessions WHERE user_id = $1', [userId]);
      if (!rows.length) return { statusCode: 404, body: 'Not found' };
      return { statusCode: 200, body: JSON.stringify(rows[0]) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { userId, sessionId, settings } = body;
      if (!userId || !sessionId) return { statusCode: 400, body: 'Missing fields' };
      await client.query(
        `INSERT INTO sessions (user_id, session_id, settings)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET session_id = EXCLUDED.session_id,
                       settings = COALESCE(sessions.settings, '{}'::jsonb) || EXCLUDED.settings,
                       updated_at = NOW()`,
        [userId, sessionId, settings || {}]
      );
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  } finally {
    await client.end();
  }
};
