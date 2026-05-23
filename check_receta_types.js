import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result1 = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Receta';
  `;
  console.log("Receta", result1);
  const result2 = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'DetalleRecetaPrimaria';
  `;
  console.log("DetalleRecetaPrimaria", result2);
}
main().catch(console.error).finally(() => prisma.$disconnect());
