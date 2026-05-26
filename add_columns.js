import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding columns to Adelanto...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Adelanto" ADD COLUMN IF NOT EXISTS "monto_pendiente" DOUBLE PRECISION;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Adelanto" ADD COLUMN IF NOT EXISTS "monto_descontado" DOUBLE PRECISION DEFAULT 0;`);
    
    console.log("Adding columns to CuentaPorCobrar...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "CuentaPorCobrar" ADD COLUMN IF NOT EXISTS "monto_descontado" DOUBLE PRECISION DEFAULT 0;`);
    
    console.log("Triggering schema cache reload...");
    await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema';`);
    
    console.log("✅ Success");
  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
