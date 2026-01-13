
const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM public.teams');
        console.log('Teams:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
