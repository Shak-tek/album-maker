const path = require('path');
const fs = require('fs').promises;
let db;
let Low;
let JSONFile;

async function getDb() {
  if (!db) {
    if (!Low || !JSONFile) {
      const lowdb = await import('lowdb');
      const lowdbNode = await import('lowdb/node');
      Low = lowdb.Low;
      JSONFile = lowdbNode.JSONFile;
    }

    // where we want to write the JSON file
    const dbPath = process.env.NETLIFY_DB_PATH
      || path.join(__dirname, '../db/db.json');
    const file = path.resolve(dbPath);
    const dir = path.dirname(file);

    // ensure the directory exists
    await fs.mkdir(dir, { recursive: true });

    // give Low the default data here
    db = new Low(new JSONFile(file), { users: [] });

    // read or initialize
    await db.read();
    await db.write();
  }
  return db;
}


async function sendOtp(email, otp) {
  console.log(`OTP for ${email}: ${otp}`);
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const db = await getDb();
    const users = db.data.users;

    // SIGNUP
    if (event.httpMethod === 'POST' && event.path.endsWith('/signup')) {
      const { name, email, phone, address, postcode, password } = body;
      if (!name || !email || !phone || !address || !postcode || !password) {
        return { statusCode: 400, body: 'Missing fields' };
      }
      if (users.find(u => u.email === email)) {
        return { statusCode: 400, body: 'User already exists' };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      users.push({
        name,
        email,
        phone,
        address,
        postcode,
        password,
        otp,
        verified: false
      });
      await db.write();
      await sendOtp(email, otp);

      return {
        statusCode: 200,
        body: JSON.stringify({ pending: true })
      };
    }

    // VERIFY OTP
    if (event.httpMethod === 'POST' && event.path.endsWith('/verify')) {
      const { email, otp } = body;
      const user = users.find(u => u.email === email);

      if (!user || user.otp !== otp) {
        return { statusCode: 400, body: 'Invalid OTP' };
      }

      user.verified = true;
      delete user.otp;
      await db.write();

      const { name, phone, address, postcode } = user;
      return {
        statusCode: 200,
        body: JSON.stringify({ user: { name, email, phone, address, postcode } })
      };
    }

    // LOGIN
    if (event.httpMethod === 'POST' && event.path.endsWith('/login')) {
      const { email, password } = body;
      const user = users.find(u => u.email === email);

      if (!user || user.password !== password || !user.verified) {
        return { statusCode: 401, body: 'Invalid credentials' };
      }

      const { name, phone, address, postcode } = user;
      return {
        statusCode: 200,
        body: JSON.stringify({ user: { name, email, phone, address, postcode } })
      };
    }

    return { statusCode: 400, body: 'Bad request' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
