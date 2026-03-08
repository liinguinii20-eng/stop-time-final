import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main(){
  const platos = await prisma.plato.findMany();
  console.log('Platos en DB:', platos.length);
  platos.forEach(p => console.log(p.id, p.nombre));
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
