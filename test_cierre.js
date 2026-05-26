import { PrismaClient } from '@prisma/client';

async function runTest() {
  console.log('--- Starting Integration Test for Cierre Trimestral ---');
  const prisma = new PrismaClient();

  try {
    // 1. Iniciar sesión para obtener el token JWT
    console.log('1. Logging in as admin...');
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} ${errText}`);
    }

    const { token } = await loginRes.json();
    console.log('✅ Logged in successfully. Token acquired.');

    // 2. Ejecutar el cierre trimestral
    console.log('2. Executing Cierre Trimestral...');
    const cierreRes = await fetch('http://localhost:4000/api/cierre-trimestral/ejecutar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!cierreRes.ok) {
      const errText = await cierreRes.text();
      throw new Error(`Cierre Trimestral execution failed: ${cierreRes.status} ${errText}`);
    }

    const arrayBuffer = await cierreRes.arrayBuffer();
    const bufferSize = arrayBuffer.byteLength;
    console.log(`✅ Cierre Trimestral completed successfully! Excel size: ${bufferSize} bytes`);

    // 3. Verificar si el reporte se guardó en la base de datos
    console.log('3. Verifying ReporteTrimestral record in DB...');
    const reportes = await prisma.reporteTrimestral.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (reportes.length === 0) {
      console.error('❌ FAIL: No ReporteTrimestral found in database!');
    } else {
      const r = reportes[0];
      console.log('✅ SUCCESS: ReporteTrimestral found!');
      console.log(`   Periodo: ${r.periodo}`);
      console.log(`   Rango: ${r.fechaInicio.toISOString()} to ${r.fechaFin.toISOString()}`);
      console.log(`   Total Nóminas Pagadas: ${r.totalNominasPagadas}`);
      console.log(`   Total Adelantos: ${r.totalAdelantos}`);
      console.log(`   Total Ingresos Caja: ${r.totalIngresosCaja}`);
      console.log(`   Total Egresos Caja: ${r.totalEgresosCaja}`);
    }
  } catch (error) {
    console.error('❌ Error during test execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
