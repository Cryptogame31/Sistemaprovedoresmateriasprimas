/**
 * ============================================================
 * SCRIPT DE MIGRACIÓN: data.json → Firebase Firestore
 * ============================================================
 * INSTRUCCIONES:
 * 1. Ve a: https://console.firebase.google.com/project/materiasprimas-df23c/settings/serviceaccounts/adminsdk
 * 2. Haz clic en "Generar nueva clave privada" → descarga el JSON
 * 3. Renómbralo a "serviceAccountKey.json" y ponlo en esta carpeta (scripts/)
 * 4. Ejecuta desde la carpeta scripts/:
 *    npm install firebase-admin
 *    node migrate_to_firebase.js
 * ============================================================
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const KEY_PATH  = path.join(__dirname, 'serviceAccountKey.json');
const DATA_PATH = path.join(__dirname, '..', 'data.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error('\n❌ No se encontró serviceAccountKey.json en:', KEY_PATH);
  console.error('   Descárgala desde Firebase Console → Configuración → Cuentas de servicio\n');
  process.exit(1);
}
if (!fs.existsSync(DATA_PATH)) {
  console.error('\n❌ No se encontró data.json en:', DATA_PATH, '\n');
  process.exit(1);
}

const serviceAccount = require(KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  'materiasprimas-df23c'
});

const db = admin.firestore();

// Elimina campos undefined que Firestore no acepta
function cleanObj(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

async function migrate() {
  const start   = Date.now();
  // Strip BOM if present (PowerShell escribe JSON con UTF-8 BOM)
  let rawJson = fs.readFileSync(DATA_PATH, 'utf-8');
  if (rawJson.charCodeAt(0) === 0xFEFF) rawJson = rawJson.slice(1);
  const rawData = JSON.parse(rawJson);

  console.log('\n🔥 Iniciando migración a Firebase Firestore...');
  console.log('   Proyecto: materiasprimas-df23c\n');

  // ── 1. Migrar configuración ────────────────────────────────
  console.log('📋 Migrando configuración del sistema...');
  const config = cleanObj(rawData.config || {});
  await db.collection('config').doc('app_config').set(config);
  console.log('   ✅ Configuración guardada en Firestore\n');

  // ── 2. Recolectar todas las materias primas ────────────────
  const allMaterials = [];
  const dataObj      = rawData.data || {};
  for (const [, materials] of Object.entries(dataObj)) {
    for (const m of (Array.isArray(materials) ? materials : [])) {
      allMaterials.push(cleanObj(m));
    }
  }
  console.log(`📦 Migrando materias primas: ${allMaterials.length} registros`);

  // ── 3. Escribir en batches de 400 ─────────────────────────
  const BATCH_SIZE = 400;
  let migrated     = 0;

  for (let i = 0; i < allMaterials.length; i += BATCH_SIZE) {
    const chunk = allMaterials.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const material of chunk) {
      batch.set(db.collection('materias_primas').doc(), material);
    }
    await batch.commit();
    migrated += chunk.length;
    console.log(`   ✅ Migrados ${migrated}/${allMaterials.length}...`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n🎉 ¡Migración completada en ${elapsed}s!`);
  console.log(`   • ${allMaterials.length} materias primas → colección "materias_primas"`);
  console.log('   • Configuración → colección "config" / doc "app_config"');
  console.log('\n💡 Próximo paso: abre http://localhost:8080 y verifica los datos.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Error durante la migración:', err.message);
  console.error(err.stack);
  process.exit(1);
});
