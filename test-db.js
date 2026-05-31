import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Parsear el archivo .env manualmente
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
      const [, key, value] = match;
      process.env[key] = value;
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log("Configuración cargada:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "***" : undefined
});

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Error: No se encontraron las variables de entorno de Firebase en el archivo .env");
  process.exit(1);
}

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log("🔥 Inicializando conexión con Cloud Firestore...");
  
  const testDoc = {
    fecha: new Date().toISOString(),
    mensaje: "Prueba de conexión exitosa desde test-db.js",
    ambiente: "Node.js Local"
  };
  
  console.log("📤 Intentando guardar un documento de prueba en la colección 'test_conexion'...");
  const docRef = await addDoc(collection(db, 'test_conexion'), testDoc);
  console.log(`✅ ¡Conexión exitosa! Documento creado en la colección 'test_conexion' con ID: ${docRef.id}`);
  process.exit(0);
} catch (error) {
  console.error("❌ Error de conexión con Firestore:", error);
  process.exit(1);
}
