import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const i = await prisma.ingrediente.findMany();
  console.log(i);
}
main().catch(console.error).finally(() => prisma.$disconnect());
