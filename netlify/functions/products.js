const { Client } = require('pg');

exports.handler = async (event) => {
  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (id) {
        const { rows } = await client.query('SELECT * FROM products WHERE id = $1', [id]);
        if (rows.length === 0) {
          return { statusCode: 404, body: 'Not found' };
        }
        return { statusCode: 200, body: JSON.stringify(rows[0]) };
      }
      const { rows } = await client.query('SELECT * FROM products ORDER BY id');
      return { statusCode: 200, body: JSON.stringify(rows) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  } finally {
    await client.end();
  }
};
