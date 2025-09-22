const { Client } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!process.env.NEON_DB_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing NEON_DB_URL env var' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: 'Invalid request body' };
  }

  const email = payload?.email?.trim();
  const password = payload?.password || '';

  if (!email || !password) {
    return { statusCode: 400, body: 'Email and password are required' };
  }

  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const result = await client.query(
      `SELECT id, email, name, role, password_hash
         FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1`,
      [email]
    );

    if (!result.rowCount) {
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    const admin = result.rows[0];

    if (admin.role !== 'admin') {
      return { statusCode: 403, body: 'Not authorized for admin access' };
    }

    const matches = await bcrypt.compare(password, admin.password_hash);
    if (!matches) {
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    const { password_hash, ...adminData } = admin;

    try {
      await client.query(
        'UPDATE users SET admin_last_login_at = NOW() WHERE id = $1',
        [admin.id]
      );
    } catch (updateErr) {
      // ignore missing column until migration runs
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ admin: adminData }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    await client.end();
  }
};
