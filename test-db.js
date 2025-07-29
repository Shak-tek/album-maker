require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.NEON_DB_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to Neon DB!");
        const res = await client.query('SELECT NOW()');
        console.log(res.rows);
    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        await client.end();
    }
})();
