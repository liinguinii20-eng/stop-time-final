import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main(){
  let ingrediente = await prisma.ingrediente.findFirst();
  if (!ingrediente) {
    ingrediente = await prisma.ingrediente.create({ data: { nombre: 'Ingrediente fallback', cantidad_disponible: 1000, cantidad_minima: 10, unidad_medida: 'unidad', unidad_receta: 'unidad', factor_conversion: 1, costo_por_unidad: 0 } });
    console.log('Creado ingrediente fallback:', ingrediente.id);
  }

  const plato = await prisma.plato.create({ data: { nombre: 'hola', precio: 1.0, activo: true } });
  console.log('Creado plato:', plato.id, plato.nombre);

  const receta = await prisma.receta.create({ data: { platoId: plato.id, ingredienteId: ingrediente.id, ingredienteNombre: ingrediente.nombre, cantidad_requerida: 1 } });
  console.log('Creada receta para plato hola:', receta.id);
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
