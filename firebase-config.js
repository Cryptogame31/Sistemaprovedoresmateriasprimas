// ============================================================
// FIREBASE CONFIGURATION
// Proyecto: materiasprimas-df23c
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyD-UtKQxOpGzsG2rPAYvpoHARREkbPOXog",
  authDomain: "materiasprimas-df23c.firebaseapp.com",
  projectId: "materiasprimas-df23c",
  storageBucket: "materiasprimas-df23c.firebasestorage.app",
  messagingSenderId: "1038653546902",
  appId: "1:1038653546902:web:87b227e86cc3da953f7db7",
  measurementId: "G-61RBJT3JJ0"
};

firebase.initializeApp(firebaseConfig);
const db      = firebase.firestore();
const storage = firebase.storage();
storage.setMaxUploadRetryTime(3000);
storage.setMaxOperationRetryTime(3000);

// Configurar persistencia offline (opcional pero mejora UX)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia offline: múltiples pestañas abiertas.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistencia offline no disponible en este navegador.');
  }
});

console.log('%c🔥 Firebase conectado correctamente', 'color:#f97316;font-weight:bold;font-size:14px;');
console.log('   Proyecto:', firebaseConfig.projectId);
