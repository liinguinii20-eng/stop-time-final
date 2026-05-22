import supabase from './server/config/supabase.js';

async function run() {
  // Let's get a plate
  const { data: platos } = await supabase.from('Plato').select('*').limit(1);
  if (!platos || platos.length === 0) return console.log("No plates");
  const plato = platos[0];

  console.log("Plate before:", plato.permitir_merma, plato.id);

  // Instead of HTTP, I'll just check if the code in server/routes/platos.js is literally correct
  // Let's simulate what pick does
  const pick = (obj, ...keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  const body = {
    ...plato,
    permitir_merma: true
  };

  const permitir_merma = pick(body, 'permitir_merma', 'permitirMerma') || false;
  console.log("Picked permitir_merma:", permitir_merma);

}
run();
