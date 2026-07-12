/**
 * ============================================================
 * SCRIPT MIGRACIÓN HÍBRIDO DE ARCHIVOS A FIREBASE
 * ============================================================
 * Usa el Web SDK para comunicarse con Firestore (evitando errores de permisos)
 * y el Admin SDK para subir archivos a Storage de forma nativa en Node.js.
 * 
 * Requiere:
 * 1. scripts/serviceAccountKey.json
 * 
 * Ejecución:
 * node upload_existing_files.js
 * ============================================================
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const BACKUP_ROOT = 'C:\\Users\\User\\Downloads\\provedores_backup';

if (!fs.existsSync(KEY_PATH)) {
  console.error('\n❌ No se encontró serviceAccountKey.json en:', KEY_PATH);
  console.error('   Descárgalo desde Firebase Console → Configuración → Cuentas de servicio\n');
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

// 1. Inicializar Firebase Web SDK (para Firestore)
const webApp = initializeApp(firebaseConfig);
const db = getFirestore(webApp);

// 2. Inicializar Firebase Admin SDK (únicamente para Storage)
admin.initializeApp({
  credential: admin.credential.cert(require(KEY_PATH)),
  storageBucket: 'materiasprimas-df23c.appspot.com'
});
const bucket = admin.storage().bucket();

async function run() {
  console.log('\n🚀 Iniciando subida de archivos físicos (Estrategia Híbrida)...');
  console.log(`   Carpeta local de origen: ${BACKUP_ROOT}`);
  console.log(`   Bucket de destino: ${bucket.name}\n`);

  // Obtener todas las materias primas de Firestore usando el Web SDK
  const materialsCol = collection(db, 'materias_primas');
  const snapshot = await getDocs(materialsCol);
  console.log(`📋 Se encontraron ${snapshot.size} materias primas en Firestore.`);

  let totalFilesDetected = 0;
  let totalFilesUploaded = 0;
  let totalFilesMissing = 0;
  let totalFilesSkipped = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    const docRef = doc(db, 'materias_primas', document.id);
    const files = data.files || [];
    let updatedFiles = [...files];
    let needsUpdate = false;

    if (files.length === 0) continue;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      totalFilesDetected++;

      // Si ya tiene URL de Firebase, lo omitimos
      if (file.firebase_url) {
        totalFilesSkipped++;
        continue;
      }

      // Localizar el archivo físico en el disco
      const relativePath = file.relative_path;
      if (!relativePath) {
        totalFilesMissing++;
        continue;
      }

      const localFilePath = path.join(BACKUP_ROOT, relativePath);

      if (!fs.existsSync(localFilePath)) {
        totalFilesMissing++;
        continue;
      }

      const fileName = file.name;
      const folderName = data.folder_name || 'General';
      const storagePath = `documentos/${folderName}/${Date.now()}_${fileName}`;

      try {
        console.log(`   ⬆️ Subiendo [${totalFilesUploaded + 1}] -> ${fileName} (${file.size_mb || 0} MB)...`);
        
        // Leer archivo local como buffer de Node.js
        const fileBuffer = fs.readFileSync(localFilePath);
        const token = crypto.randomUUID();

        const storageFile = bucket.file(storagePath);
        
        // Subir a Firebase Storage de forma nativa con Admin SDK
        await storageFile.save(fileBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              firebaseStorageDownloadTokens: token
            }
          }
        });

        // Construir la URL pública de descarga permanente
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

        // Actualizar el objeto de archivo local en el array
        updatedFiles[idx] = {
          ...file,
          firebase_url: downloadUrl,
          firebase_path: storagePath
        };

        needsUpdate = true;
        totalFilesUploaded++;
      } catch (err) {
        console.error(`   ❌ Error subiendo ${fileName}:`, err.message);
        // Si hay un error de conexión persistente o cuota, detenemos
        if (err.message.includes('Quota') || err.message.includes('Limit')) {
          console.error('\n❌ Límite de cuota o error persistente de Storage. Deteniendo script.');
          process.exit(1);
        }
      }
    }

    // Guardar cambios en Firestore usando el Web SDK
    if (needsUpdate) {
      await updateDoc(docRef, {
        files: updatedFiles,
        files_count: updatedFiles.length
      });
    }
  }

  console.log('\n🎉 ¡Proceso de subida finalizado!');
  console.log(`   • Archivos detectados en la base de datos: ${totalFilesDetected}`);
  console.log(`   • Subidos con éxito a Firebase Storage: ${totalFilesUploaded}`);
  console.log(`   • Omitidos (ya estaban arriba): ${totalFilesSkipped}`);
  console.log(`   • No encontrados en disco local: ${totalFilesMissing}\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error fatal en el script:', err.message);
  process.exit(1);
});
