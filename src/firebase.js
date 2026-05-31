import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  setDoc,
  getDocs
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

// Nombres de los 4 usuarios del consultorio
export const USERS = ['Paola', 'Angelina', 'Macarena', 'Denise'];

// Mapeo de correos electrónicos a nombres de usuario del consultorio
export const EMAIL_TO_USER = {
  'paola.eltrebol@gmail.com': 'Paola',
  'makibaravalle93@gmail.com': 'Macarena',
  'lic.fonodeniseraffa@gmail.com': 'Denise',
  'angivagliente539@gmail.com': 'Angelina'
};

// Resolver el nombre correspondiente del consultorio en base al email
export function getMappedName(email) {
  if (!email) return null;
  const emailLower = email.toLowerCase();
  const mapped = EMAIL_TO_USER[emailLower];
  if (mapped) return mapped;

  // Intento de coincidencia parcial (si el nombre está incluido en la primera parte del email)
  const prefix = emailLower.split('@')[0];
  for (const user of USERS) {
    if (prefix.includes(user.toLowerCase())) {
      return user;
    }
  }
  return null;
}

// Credenciales de Firebase. 
// Cargadas automáticamente desde el archivo .env usando Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Determinar si usar Firebase real o Mock DB local
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

let dbInstance = null;
let useMock = !isFirebaseConfigured;

// --- IMPLEMENTACIÓN MOCK DB (LOCAL STORAGE) ---
class MockDB {
  constructor() {
    this.listeners = {};
    // Limpiar cierres duplicados al iniciar
    this._cleanDuplicateCierres();
    // Escuchar cambios en localStorage de otras pestañas si aplica
    window.addEventListener('storage', (e) => {
      if (e.key === 'consultorio_gastos' || e.key === 'consultorio_cierres') {
        this.notifyAll();
      }
    });
  }

  _cleanDuplicateCierres() {
    const data = localStorage.getItem('consultorio_cierres');
    if (data) {
      try {
        const cierres = JSON.parse(data);
        const unique = [];
        const seen = new Set();
        // Recorrer de atrás hacia adelante para quedarnos con el más reciente
        for (let i = cierres.length - 1; i >= 0; i--) {
          const c = cierres[i];
          if (!seen.has(c.mes)) {
            seen.add(c.mes);
            unique.unshift(c);
          }
        }
        if (unique.length !== cierres.length) {
          localStorage.setItem('consultorio_cierres', JSON.stringify(unique));
          console.log("🧹 Se limpiaron cierres duplicados en localStorage.");
        }
      } catch (e) {
        console.error("Error limpiando cierres duplicados:", e);
      }
    }
  }

  _getGastos() {
    const data = localStorage.getItem('consultorio_gastos');
    return data ? JSON.parse(data) : [];
  }

  _saveGastos(gastos) {
    localStorage.setItem('consultorio_gastos', JSON.stringify(gastos));
    this.notifyAll();
  }

  _getCierres() {
    const data = localStorage.getItem('consultorio_cierres');
    return data ? JSON.parse(data) : [];
  }

  _saveCierres(cierres) {
    localStorage.setItem('consultorio_cierres', JSON.stringify(cierres));
    this.notifyAll();
  }

  notifyAll() {
    Object.values(this.listeners).forEach(listener => {
      if (listener) listener();
    });
  }

  // CRUD Gastos
  addGasto(gasto) {
    const gastos = this._getGastos();
    const newGasto = {
      id: 'mock_' + Math.random().toString(36).substr(2, 9),
      ...gasto,
      fecha: gasto.fecha || new Date().toISOString()
    };
    gastos.push(newGasto);
    this._saveGastos(gastos);
    return Promise.resolve(newGasto);
  }

  deleteGasto(id) {
    let gastos = this._getGastos();
    gastos = gastos.filter(g => g.id !== id);
    this._saveGastos(gastos);
    return Promise.resolve();
  }

  getGastos(mes) {
    const allGastos = this._getGastos();
    const filtered = allGastos.filter(g => g.mes === mes);
    filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return Promise.resolve(filtered);
  }

  subscribeGastos(mes, callback) {
    const listenerId = 'gastos_' + Math.random().toString(36).substr(2, 9);
    const runCallback = () => {
      const allGastos = this._getGastos();
      // Filtrar por el mes (YYYY-MM)
      const filtered = allGastos.filter(g => g.mes === mes);
      // Ordenar por fecha (descendente o ascendente)
      filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      callback(filtered);
    };

    this.listeners[listenerId] = runCallback;
    runCallback(); // Primera ejecución inmediata

    return () => {
      delete this.listeners[listenerId];
    };
  }

  // Cierre de Mes
  addCierre(cierre) {
    const cierres = this._getCierres();
    const newCierre = {
      id: 'mock_cierre_' + Math.random().toString(36).substr(2, 9),
      ...cierre,
      fechaCierre: new Date().toISOString()
    };
    cierres.push(newCierre);
    this._saveCierres(cierres);
    return Promise.resolve(newCierre);
  }

  subscribeCierres(callback) {
    const listenerId = 'cierres_' + Math.random().toString(36).substr(2, 9);
    const runCallback = () => {
      const allCierres = this._getCierres();
      allCierres.sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));
      callback(allCierres);
    };

    this.listeners[listenerId] = runCallback;
    runCallback();

    return () => {
      delete this.listeners[listenerId];
    };
  }

  cerrarGastosDeMes(mes) {
    let gastos = this._getGastos();
    gastos = gastos.map(g => {
      if (g.mes === mes) {
        return { ...g, cerrado: true };
      }
      return g;
    });
    this._saveGastos(gastos);
    return Promise.resolve();
  }

  reabrirMes(mes) {
    // 1. Eliminar cierres de ese mes
    let cierres = this._getCierres();
    cierres = cierres.filter(c => c.mes !== mes);
    this._saveCierres(cierres);

    // 2. Desmarcar gastos de ese mes como cerrados
    let gastos = this._getGastos();
    gastos = gastos.map(g => {
      if (g.mes === mes) {
        const { cerrado, ...rest } = g;
        return rest;
      }
      return g;
    });
    this._saveGastos(gastos);
    return Promise.resolve();
  }

  subscribeAllGastos(callback) {
    const listenerId = 'all_gastos_' + Math.random().toString(36).substr(2, 9);
    const runCallback = () => {
      const allGastos = this._getGastos();
      allGastos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      callback(allGastos);
    };

    this.listeners[listenerId] = runCallback;
    runCallback();

    return () => {
      delete this.listeners[listenerId];
    };
  }
}

const mockDB = new MockDB();

// --- VARIABLES DE AUTENTICACIÓN ---
let authInstance = null;
let authListeners = [];
let currentAuthUser = null;

// Inicializar estado de mock auth en localStorage si aplica
if (useMock) {
  const stored = localStorage.getItem('consultorio_mock_user');
  currentAuthUser = stored ? JSON.parse(stored) : null;
}

// --- INICIALIZAR FIREBASE SI APLICA ---
if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
    console.log("🔥 Conectado con éxito a Firebase Firestore y Auth.");
  } catch (error) {
    console.error("⚠️ Error inicializando Firebase. Activando Mock de respaldo.", error);
    useMock = true;
    const stored = localStorage.getItem('consultorio_mock_user');
    currentAuthUser = stored ? JSON.parse(stored) : null;
  }
} else {
  console.log("ℹ️ Firebase no configurado. Utilizando Mock DB y Mock Auth locales.");
}

// --- ADAPTADOR UNIFICADO DE OPERACIONES (API PÚBLICA) ---
export const db = {
  isMock: () => useMock,

  // Agregar un gasto
  addGasto: async (gasto) => {
    if (useMock) {
      return mockDB.addGasto(gasto);
    } else {
      const ref = collection(dbInstance, 'gastos');
      return addDoc(ref, gasto);
    }
  },

  // Eliminar un gasto
  deleteGasto: async (id) => {
    if (useMock) {
      return mockDB.deleteGasto(id);
    } else {
      const ref = doc(dbInstance, 'gastos', id);
      return deleteDoc(ref);
    }
  },

  // Escuchar gastos de un mes en tiempo real
  subscribeGastos: (mes, callback) => {
    if (useMock) {
      return mockDB.subscribeGastos(mes, callback);
    } else {
      const q = query(
        collection(dbInstance, 'gastos'), 
        where('mes', '==', mes),
        orderBy('fecha', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        const gastos = [];
        snapshot.forEach((doc) => {
          gastos.push({ id: doc.id, ...doc.data() });
        });
        callback(gastos);
      }, (error) => {
        console.error("Error en onSnapshot de gastos:", error);
      });
    }
  },

  // Leer gastos de un mes (lectura única)
  getGastos: async (mes) => {
    if (useMock) {
      return mockDB.getGastos(mes);
    } else {
      const q = query(
        collection(dbInstance, 'gastos'), 
        where('mes', '==', mes),
        orderBy('fecha', 'asc')
      );
      const snapshot = await getDocs(q);
      const gastos = [];
      snapshot.forEach((doc) => {
        gastos.push({ id: doc.id, ...doc.data() });
      });
      return gastos;
    }
  },

  // Escuchar todos los gastos (útil para listar meses disponibles)
  subscribeAllGastos: (callback) => {
    if (useMock) {
      return mockDB.subscribeAllGastos(callback);
    } else {
      const q = query(collection(dbInstance, 'gastos'), orderBy('fecha', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const gastos = [];
        snapshot.forEach((doc) => {
          gastos.push({ id: doc.id, ...doc.data() });
        });
        callback(gastos);
      }, (error) => {
        console.error("Error en onSnapshot de todos los gastos:", error);
      });
    }
  },

  // Cerrar gastos de un mes
  cerrarGastosDeMes: async (mes) => {
    if (useMock) {
      return mockDB.cerrarGastosDeMes(mes);
    } else {
      const q = query(collection(dbInstance, 'gastos'), where('mes', '==', mes));
      const snapshot = await getDocs(q);
      const promises = [];
      snapshot.forEach((d) => {
        const docRef = doc(dbInstance, 'gastos', d.id);
        promises.push(setDoc(docRef, { cerrado: true }, { merge: true }));
      });
      return Promise.all(promises);
    }
  },

  // Reabrir un mes cerrado (eliminar cierre y desmarcar gastos)
  reabrirMes: async (mes) => {
    if (useMock) {
      return mockDB.reabrirMes(mes);
    } else {
      // 1. Eliminar cierres de ese mes
      const qCierres = query(collection(dbInstance, 'cierres'), where('mes', '==', mes));
      const snapCierres = await getDocs(qCierres);
      const promises = [];
      snapCierres.forEach((d) => {
        promises.push(deleteDoc(doc(dbInstance, 'cierres', d.id)));
      });

      // 2. Desmarcar gastos de ese mes
      const qGastos = query(collection(dbInstance, 'gastos'), where('mes', '==', mes));
      const snapGastos = await getDocs(qGastos);
      snapGastos.forEach((d) => {
        const docRef = doc(dbInstance, 'gastos', d.id);
        promises.push(setDoc(docRef, { cerrado: false }, { merge: true }));
      });

      return Promise.all(promises);
    }
  },

  // Guardar cierre de mes
  addCierre: async (cierre) => {
    if (useMock) {
      return mockDB.addCierre(cierre);
    } else {
      const ref = collection(dbInstance, 'cierres');
      return addDoc(ref, cierre);
    }
  },

  // Escuchar todos los cierres de mes
  subscribeCierres: (callback) => {
    if (useMock) {
      return mockDB.subscribeCierres(callback);
    } else {
      const q = query(collection(dbInstance, 'cierres'), orderBy('fechaCierre', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const cierres = [];
        snapshot.forEach((doc) => {
          cierres.push({ id: doc.id, ...doc.data() });
        });
        callback(cierres);
      }, (error) => {
        console.error("Error en onSnapshot de cierres:", error);
      });
    }
  },

  // Capa de Autenticación Unificada
  auth: {
    isMock: () => useMock,

    signInWithGoogle: async () => {
      if (useMock) {
        return db.auth.signInMock('Paola');
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(authInstance, provider);
        const user = result.user;
        return {
          email: user.email,
          displayName: user.displayName,
          mappedName: getMappedName(user.email)
        };
      }
    },

    signInMock: async (username) => {
      const emailMap = {
        'Paola': 'paola.eltrebol@gmail.com',
        'Macarena': 'makibaravalle93@gmail.com',
        'Angelina': 'angivagliente539@gmail.com',
        'Denise': 'lic.fonodeniseraffa@gmail.com'
      };
      const user = {
        email: emailMap[username] || `${username.toLowerCase()}@mock.com`,
        displayName: username,
        mappedName: username
      };
      localStorage.setItem('consultorio_mock_user', JSON.stringify(user));
      currentAuthUser = user;
      authListeners.forEach(cb => cb(user));
      return user;
    },

    signOut: async () => {
      if (useMock) {
        localStorage.removeItem('consultorio_mock_user');
        currentAuthUser = null;
        authListeners.forEach(cb => cb(null));
        return Promise.resolve();
      } else {
        await firebaseSignOut(authInstance);
        return Promise.resolve();
      }
    },

    onAuthStateChanged: (callback) => {
      if (useMock) {
        authListeners.push(callback);
        callback(currentAuthUser);
        return () => {
          authListeners = authListeners.filter(cb => cb !== callback);
        };
      } else {
        return firebaseOnAuthStateChanged(authInstance, (user) => {
          if (user) {
            const formattedUser = {
              email: user.email,
              displayName: user.displayName,
              mappedName: getMappedName(user.email)
            };
            callback(formattedUser);
          } else {
            callback(null);
          }
        });
      }
    },

    getCurrentUser: () => {
      if (useMock) {
        return currentAuthUser;
      } else {
        const user = authInstance?.currentUser;
        if (!user) return null;
        return {
          email: user.email,
          displayName: user.displayName,
          mappedName: getMappedName(user.email)
        };
      }
    }
  }
};
