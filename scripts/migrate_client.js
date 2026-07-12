/**
 * ============================================================
 * SCRIPT DE MIGRACIÓN WEB SDK: data.json → Firebase Firestore
 * ============================================================
 * Este script utiliza las credenciales web normales (API Key)
 * para realizar la migración. Se salta los permisos IAM de Google Cloud.
 * Requiere que la base de datos de Firestore esté configurada en "modo de prueba"
 * o con reglas que permitan escritura.
 * 
 * Ejecución:
 * node migrate_client.js
 * ============================================================
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, writeBatch, doc, collection } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

if (!fs.existsSync(DATA_PATH)) {
  console.error('\n❌ No se encontró data.json en:', DATA_PATH, '\n');
  process.exit(1);
}

// Configuración de Firebase obtenida de tu Web App
const firebaseConfig = {
  apiKey: "AIzaSyD-UtKQxOpGzsG2rPAYvpoHARREkbPOXog",
  authDomain: "materiasprimas-df23c.firebaseapp.com",
  projectId: "materiasprimas-df23c",
  storageBucket: "materiasprimas-df23c.firebasestorage.app",
  messagingSenderId: "1038653546902",
  appId: "1:1038653546902:web:87b227e86cc3da953f7db7",
  measurementId: "G-61RBJT3JJ0"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Limpiar objetos de valores undefined (que Firestore no permite)
function cleanObj(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

async function migrate() {
  const start = Date.now();
  
  // Leer data.json y limpiar BOM si existe
  let rawJson = fs.readFileSync(DATA_PATH, 'utf-8');
  if (rawJson.charCodeAt(0) === 0xFEFF) rawJson = rawJson.slice(1);
  const rawData = JSON.parse(rawJson);

  console.log('\n🔥 Iniciando migración de cliente a Firebase Firestore...');
  console.log('   Proyecto:', firebaseConfig.projectId);
  console.log('   Usando Clave API pública (Web SDK)\n');

  // ── 1. Migrar configuración ────────────────────────────────
  console.log('📋 Migrando configuración del sistema...');
  const config = cleanObj(rawData.config || {});
  
  const configBatch = writeBatch(db);
  const configDocRef = doc(db, 'config', 'app_config');
  configBatch.set(configDocRef, config);
  await configBatch.commit();
  console.log('   ✅ Configuración guardada en Firestore\n');

  // ── 2. Recolectar todas las materias primas ────────────────
  const allMaterials = [];
  const dataObj = rawData.data || {};
  for (const [category, materials] of Object.entries(dataObj)) {
    for (const m of (Array.isArray(materials) ? materials : [])) {
      // Nos aseguramos de guardar la categoría original si no está presente
      const cleanM = cleanObj(m);
      if (!cleanM.folder_type) {
        cleanM.folder_type = category;
      }
      allMaterials.push(cleanM);
    }
  }
  console.log(`📦 Migrando materias primas: ${allMaterials.length} registros`);

  // ── 3. Escribir en batches de 400 ─────────────────────────
  const BATCH_SIZE = 400;
  let migrated = 0;
  const materialsCol = collection(db, 'materias_primas');

  for (let i = 0; i < allMaterials.length; i += BATCH_SIZE) {
    const chunk = allMaterials.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    
    for (const material of chunk) {
      // Crear una referencia de documento con ID autogenerado
      const newDocRef = doc(materialsCol);
      batch.set(newDocRef, material);
    }
    
    await batch.commit();
    migrated += chunk.length;
    console.log(`   ✅ Migrados ${migrated}/${allMaterials.length}...`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n🎉 ¡Migración completada exitosamente en ${elapsed}s!`);
  console.log(`   • ${allMaterials.length} materias primas → colección "materias_primas"`);
  console.log('   • Configuración → colección "config" / doc "app_config"');
  console.log('\n💡 Ahora puedes abrir tu index.html y comprobar la app.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Error durante la migración:', err.message);
  console.error(err.stack);
  process.exit(1);
});
