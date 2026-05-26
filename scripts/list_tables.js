import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace('pgbouncer=true', ''),
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables in database:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error connecting to postgres:', err);
  } finally {
    await client.end();
  }
}

run();
