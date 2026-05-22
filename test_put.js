async function run() {
  const res1 = await fetch("http://localhost:4000/api/platos", {
    headers: { "Authorization": "Bearer fake_token" }
  });
  if (!res1.ok) {
    console.log("Get failed:", res1.status, await res1.text());
    return;
  }
  const platos = await res1.json();
  const plato = platos[0];
  console.log("Before:", plato.permitir_merma, plato.id);

  const res2 = await fetch("http://localhost:4000/api/platos/" + plato.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer fake_token" },
    body: JSON.stringify({
      ...plato,
      permitir_merma: true
    })
  });
  
  if(!res2.ok) {
    const txt = await res2.text();
    console.log("Error from put:", res2.status, txt);
    return;
  }
  
  const updated = await res2.json();
  console.log("After put:", updated.permitir_merma);
}
run();
