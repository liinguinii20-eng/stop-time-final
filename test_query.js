import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const detalles = await prisma.detalleRecetaPrimaria.findMany();
  console.log(detalles);
}
main().catch(console.error).finally(() => prisma.$disconnect());
