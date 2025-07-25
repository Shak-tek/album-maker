const { MongoClient } = require('mongodb');
let client;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

async function sendOtp(email, otp) {
  console.log(`OTP for ${email}: ${otp}`);
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const db = await getDb();
    const users = db.collection('users');

    if (event.httpMethod === 'POST' && event.path.endsWith('/signup')) {
      const { name, email, phone, address, password } = body;
      if (!name || !email || !phone || !address || !password) {
        return { statusCode: 400, body: 'Missing fields' };
      }
      const existing = await users.findOne({ email });
      if (existing) {
        return { statusCode: 400, body: 'User already exists' };
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await users.insertOne({ name, email, phone, address, password, otp, verified: false });
      await sendOtp(email, otp);
      return { statusCode: 200, body: JSON.stringify({ pending: true }) };
    }

    if (event.httpMethod === 'POST' && event.path.endsWith('/verify')) {
      const { email, otp } = body;
      const user = await users.findOne({ email });
      if (!user || user.otp !== otp) {
        return { statusCode: 400, body: 'Invalid OTP' };
      }
      await users.updateOne({ email }, { $set: { verified: true }, $unset: { otp: '' } });
      const { name, phone, address } = user;
      return { statusCode: 200, body: JSON.stringify({ user: { name, email, phone, address } }) };
    }

    if (event.httpMethod === 'POST' && event.path.endsWith('/login')) {
      const { email, password } = body;
      const user = await users.findOne({ email });
      if (!user || user.password !== password || !user.verified) {
        return { statusCode: 401, body: 'Invalid credentials' };
      }
      const { name, phone, address } = user;
      return { statusCode: 200, body: JSON.stringify({ user: { name, email, phone, address } }) };
    }

    return { statusCode: 400, body: 'Bad request' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
