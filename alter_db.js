import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log("Connected to DB");
    
    // Check if column exists first
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='Nomina' and column_name='total_cuentas';
    `);
    
    if (res.rowCount === 0) {
      console.log("Adding column total_cuentas...");
      await client.query('ALTER TABLE "Nomina" ADD COLUMN total_cuentas DOUBLE PRECISION DEFAULT 0;');
      console.log("Column added.");
    } else {
      console.log("Column already exists.");
    }

    console.log("Reloading schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("Schema cache reloaded.");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
