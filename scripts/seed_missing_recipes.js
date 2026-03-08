import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const platos = await prisma.plato.findMany();
  const ingredienteFallback = await prisma.ingrediente.findFirst();

  let ingrediente = ingredienteFallback;
  if (!ingrediente) {
    ingrediente = await prisma.ingrediente.create({
      data: {
        nombre: 'Ingrediente fallback',
        cantidad_disponible: 1000,
        cantidad_minima: 10,
        unidad_medida: 'unidad',
        unidad_receta: 'unidad',
        factor_conversion: 1,
        costo_por_unidad: 0
      }
    });
    console.log('Se creó un ingrediente fallback:', ingrediente.id);
  }

  for (const plato of platos) {
    const recetas = await prisma.receta.findMany({ where: { platoId: plato.id } });
    if (recetas.length === 0) {
      const nueva = await prisma.receta.create({
        data: {
          platoId: plato.id,
          ingredienteId: ingrediente.id,
          ingredienteNombre: ingrediente.nombre,
          cantidad_requerida: 1
        }
      });
      console.log(`Creada receta mínima para plato ${plato.nombre} (id: ${plato.id}) -> recetaId: ${nueva.id}`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
