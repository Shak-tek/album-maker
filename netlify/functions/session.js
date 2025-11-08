const { Client } = require('pg');

const MAX_ALBUMS_PER_USER = 10;
const ensureSessionsConstraints = async (client) => {
  const sql = `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'sessions' AND table_schema = 'public'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'sessions_user_id_key'
        ) THEN
          ALTER TABLE sessions DROP CONSTRAINT sessions_user_id_key;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'sessions_user_id_session_id_key'
        ) THEN
          ALTER TABLE sessions
          ADD CONSTRAINT sessions_user_id_session_id_key UNIQUE (user_id, session_id);
        END IF;
      END IF;
    END;
    $$;
  `;
  await client.query(sql);
};

exports.handler = async (event) => {
  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await ensureSessionsConstraints(client);
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const userId = params.userId;
      if (!userId) return { statusCode: 400, body: 'userId required' };
      const sessionId = params.sessionId;

      if (sessionId) {
        const { rows } = await client.query(
          `SELECT session_id, settings, created_at, updated_at
           FROM sessions
           WHERE user_id = $1 AND session_id = $2
           LIMIT 1`,
          [userId, sessionId]
        );
        if (!rows.length) return { statusCode: 404, body: 'Not found' };
        return { statusCode: 200, body: JSON.stringify({ session: rows[0] }) };
      }

      let limit = parseInt(params.limit, 10);
      if (!Number.isFinite(limit) || limit <= 0 || limit > MAX_ALBUMS_PER_USER) {
        limit = MAX_ALBUMS_PER_USER;
      }

      const { rows } = await client.query(
        `SELECT session_id, settings, created_at, updated_at
         FROM sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC, created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return { statusCode: 200, body: JSON.stringify({ sessions: rows }) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (err) {
        return { statusCode: 400, body: 'Invalid JSON' };
      }
      const { userId, sessionId, settings } = body;
      if (!userId || !sessionId) return { statusCode: 400, body: 'Missing fields' };

      const safeSettings = settings && typeof settings === 'object' ? settings : {};
      const serializedSettings = JSON.stringify(safeSettings);
      const existing = await client.query(
        'SELECT 1 FROM sessions WHERE user_id = $1 AND session_id = $2 LIMIT 1',
        [userId, sessionId]
      );
      if (!existing.rowCount) {
        const countRes = await client.query(
          'SELECT COUNT(*)::int AS count FROM sessions WHERE user_id = $1',
          [userId]
        );
        const count = Number(countRes.rows[0]?.count || 0);
        if (count >= MAX_ALBUMS_PER_USER) {
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'MAX_ALBUMS_REACHED',
              max: MAX_ALBUMS_PER_USER,
            }),
          };
        }
      }

      const result = await client.query(
        `INSERT INTO sessions (user_id, session_id, settings)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, session_id)
         DO UPDATE SET
           settings = COALESCE(sessions.settings, '{}'::jsonb) || COALESCE(EXCLUDED.settings, '{}'::jsonb),
           updated_at = NOW()
         RETURNING session_id, settings, created_at, updated_at`,
        [userId, sessionId, serializedSettings]
      );

      return { statusCode: 200, body: JSON.stringify({ session: result.rows[0] }) };
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      const userId = params.userId;
      const sessionId = params.sessionId;
      if (!userId || !sessionId) {
        return { statusCode: 400, body: 'Missing fields' };
      }

      await client.query('DELETE FROM sessions WHERE user_id = $1 AND session_id = $2', [
        userId,
        sessionId,
      ]);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  } finally {
    await client.end();
  }
};
