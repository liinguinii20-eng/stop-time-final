import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  
  await client.query('DROP TABLE IF EXISTS "Compra";');
  
  await client.query(`
    CREATE TABLE "Compra" (
      id TEXT PRIMARY KEY,
      ingrediente_id TEXT,
      ingrediente_nombre TEXT,
      cantidad DOUBLE PRECISION,
      unidad_medida TEXT,
      costo_unitario DOUBLE PRECISION,
      costo_total DOUBLE PRECISION,
      proveedor TEXT,
      numero_factura TEXT,
      fecha_compra TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_entrega_estimada TIMESTAMP WITHOUT TIME ZONE,
      tipo_compra TEXT,
      estado TEXT,
      empleado_nombre TEXT,
      notas TEXT,
      created_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('Tabla Compra recreada con éxito.');
  await client.end();
}
run();
