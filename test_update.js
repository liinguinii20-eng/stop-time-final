import { api } from "./src/api/apiAdapter.js";

async function test() {
  const platos = await api.entities.Plato.list();
  if(platos.length === 0) return console.log("No platos");
  const p = platos[0];
  console.log("Before:", p.permitir_merma);
  const updated = await api.entities.Plato.update(p.id, { ...p, permitir_merma: true });
  console.log("After update returned:", updated.permitir_merma);
  const platos2 = await api.entities.Plato.list();
  const p2 = platos2.find(x => x.id === p.id);
  console.log("After fetch:", p2.permitir_merma);
}
test();
