const { Client } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  // now also pull address, postcode, phone
  const { email, password, name, address, postcode, phone } = JSON.parse(event.body || '{}');

  if (!email || !password) {
    return { statusCode: 400, body: 'Email and password are required' };
  }

  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = await client.query(
      `INSERT INTO users
         (email, password_hash, name, address, postcode, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, address, postcode, phone_number, role, created_at`,
      [email, password_hash, name || null, address || null, postcode || null, phone || null]
    );

    return {
      statusCode: 201,
      body: JSON.stringify(result.rows[0]),
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
