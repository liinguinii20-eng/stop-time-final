import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected");
  
  const queries = [
    `ALTER TABLE "Plato" ADD COLUMN "permitir_merma" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "Plato" ADD COLUMN "permitir_credito_empleado" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "Comanda" ADD COLUMN "tipo_movimiento" TEXT DEFAULT 'VENTA';`,
    `ALTER TABLE "Comanda" ADD COLUMN "empleado_id" TEXT;`,
    `ALTER TABLE "Comanda" ADD COLUMN "motivo_merma" TEXT;`,
    `ALTER TABLE "CuentaPorCobrar" ADD COLUMN "empleadoId" TEXT;`
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log("Executed:", q);
    } catch (e) {
      console.log("Error or already exists:", e.message);
    }
  }
  
  await client.end();
}
run();
