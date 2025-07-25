const { MongoClient } = require('mongodb');
let client;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const db = await getDb();
    const users = db.collection('users');
    if (event.httpMethod === 'POST' && event.path.endsWith('/signup')) {
      const existing = await users.findOne({ email: body.email });
      if (existing) {
        return { statusCode: 400, body: 'User already exists' };
      }
      await users.insertOne({ email: body.email, password: body.password });
      return { statusCode: 200, body: JSON.stringify({ signedUp: true }) };
    }
    if (event.httpMethod === 'POST' && event.path.endsWith('/login')) {
      const user = await users.findOne({ email: body.email });
      if (!user || user.password !== body.password) {
        return { statusCode: 401, body: 'Invalid credentials' };
      }
      return { statusCode: 200, body: JSON.stringify({ loggedIn: true }) };
    }
    return { statusCode: 400, body: 'Bad request' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
