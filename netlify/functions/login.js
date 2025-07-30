const { Client } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  const { email, password } = JSON.parse(event.body || '{}');
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
      'SELECT id, email, name, address, postcode, phone_number, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (!process.env.NEON_DB_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing NEON_DB_URL env var' }),
      };
    }

    if (result.rowCount === 0) {
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return { statusCode: 401, body: 'Invalid credentials' };
    }

    const { password_hash, ...userData } = user;
    return {
      statusCode: 200,
      body: JSON.stringify({ user: userData }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  } finally {
    await client.end();
  }
};
