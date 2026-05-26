import dotenv from 'dotenv';
import supabase from './server/config/supabase.js';
import crypto from 'crypto';

dotenv.config();

async function pagarNominaEmulada(payload) {
  const { adelantos_a_descontar } = payload;
  const now = new Date().toISOString();
  
  for (const ad of adelantos_a_descontar) {
    const monto_descontado_ahora = ad.monto_a_descontar || 0;
    const monto_pendiente_anterior = ad.monto_pendiente_original || 0;
    
    let nuevo_estado;
    let nuevo_monto_pendiente = monto_pendiente_anterior - monto_descontado_ahora;
    
    const { data: currentAd } = await supabase.from('Adelanto').select('monto_descontado').eq('id', ad.id).single();
    const monto_descontado_previo = currentAd?.monto_descontado || 0;
    const nuevo_monto_descontado_total = monto_descontado_previo + monto_descontado_ahora;

    if (monto_descontado_ahora === 0) {
      nuevo_estado = 'POSPUESTO';
      nuevo_monto_pendiente = monto_pendiente_anterior;
    } else if (nuevo_monto_pendiente <= 0) {
      nuevo_estado = 'DESCONTADO';
      nuevo_monto_pendiente = 0;
    } else {
      nuevo_estado = 'PARCIAL';
    }

    const { error } = await supabase
      .from('Adelanto')
      .update({
        estado: nuevo_estado,
        monto_pendiente: nuevo_monto_pendiente,
        monto_descontado: nuevo_monto_descontado_total,
        fecha_descuento: now,
      })
      .eq('id', ad.id);
    if (error) console.error("Error updating adelanto:", error);
  }
}

async function runTest() {
  const { data: empleados } = await supabase.from('Empleado').select('*').limit(1);
  const empleado = empleados[0];
  const adelantoId = crypto.randomUUID();
  const montoTotal = 100;

  const { error: insErr } = await supabase.from('Adelanto').insert({
    id: adelantoId,
    empleadoId: empleado.id,
    empleado: empleado.nombre,
    monto: montoTotal,
    monto_pendiente: montoTotal,
    monto_descontado: 0,
    descripcion: `Test Pago Parcial`,
    estado: 'PENDIENTE',
  });
  if (insErr) {
    console.error("Insert error:", insErr);
    return;
  }
  console.log(`✅ Creado Adelanto inicial por $${montoTotal}`);

  await pagarNominaEmulada({
    adelantos_a_descontar: [{
      id: adelantoId,
      monto_a_descontar: 40,
      monto_pendiente_original: 100
    }]
  });

  let { data: adl, error: selErr } = await supabase.from('Adelanto').select('*').eq('id', adelantoId).single();
  if (selErr) console.error("Select error:", selErr);
  
  if (adl) {
    console.log(`Estado: ${adl.estado}, Pendiente: ${adl.monto_pendiente}, Descontado: ${adl.monto_descontado}`);
  }

  await pagarNominaEmulada({
    adelantos_a_descontar: [{
      id: adelantoId,
      monto_a_descontar: 0,
      monto_pendiente_original: 60
    }]
  });

  adl = (await supabase.from('Adelanto').select('*').eq('id', adelantoId).single()).data;
  if (adl) {
    console.log(`Estado: ${adl.estado}, Pendiente: ${adl.monto_pendiente}, Descontado: ${adl.monto_descontado}`);
  }

  await pagarNominaEmulada({
    adelantos_a_descontar: [{
      id: adelantoId,
      monto_a_descontar: 60,
      monto_pendiente_original: 60
    }]
  });

  adl = (await supabase.from('Adelanto').select('*').eq('id', adelantoId).single()).data;
  if (adl) {
    console.log(`Estado: ${adl.estado}, Pendiente: ${adl.monto_pendiente}, Descontado: ${adl.monto_descontado}`);
  }

  await supabase.from('Adelanto').delete().eq('id', adelantoId);
}

runTest();
