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

  // --- Pacientes & Deudas Mock ---
  _getPacientes() {
    const data = localStorage.getItem('consultorio_pacientes');
    return data ? JSON.parse(data) : [];
  }

  _savePacientes(pacientes) {
    localStorage.setItem('consultorio_pacientes', JSON.stringify(pacientes));
    this.notifyAll();
  }

  _getDeudas() {
    const data = localStorage.getItem('consultorio_deudas_pacientes');
    return data ? JSON.parse(data) : [];
  }

  _saveDeudas(deudas) {
    localStorage.setItem('consultorio_deudas_pacientes', JSON.stringify(deudas));
    this.notifyAll();
  }

  addPaciente(paciente) {
    const pacientes = this._getPacientes();
    const newPaciente = {
      id: 'mock_paciente_' + Math.random().toString(36).substr(2, 9),
      ...paciente
    };
    pacientes.push(newPaciente);
    this._savePacientes(pacientes);
    return Promise.resolve(newPaciente);
  }

  updatePaciente(id, updates) {
    let pacientes = this._getPacientes();
    pacientes = pacientes.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    this._savePacientes(pacientes);

    // Propagar cambio de nombre a las deudas/sesiones
    if (updates.nombre || updates.apellido) {
      const nuevoNombreCompleto = `${updates.nombre || ''} ${updates.apellido || ''}`.trim();
      let deudas = this._getDeudas();
      deudas = deudas.map(d => {
        if (d.id_paciente === id) {
          return { ...d, nombre_paciente: nuevoNombreCompleto };
        }
        return d;
      });
      this._saveDeudas(deudas);
    }
    return Promise.resolve();
  }

  subscribePacientes(email, callback) {
    const listenerId = 'pacientes_' + Math.random().toString(36).substr(2, 9);
    const runCallback = () => {
      const allPacientes = this._getPacientes();
      const filtered = allPacientes.filter(p => p.id_profesional === email);
      // Ordenar alfabéticamente por apellido y nombre
      filtered.sort((a, b) => {
        const nameA = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
        const nameB = `${b.apellido || ''} ${b.nombre || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      callback(filtered);
    };

    this.listeners[listenerId] = runCallback;
    runCallback();

    return () => {
      delete this.listeners[listenerId];
    };
  }

  addDeudaPaciente(deuda) {
    const deudas = this._getDeudas();
    const newDeuda = {
      id: 'mock_deuda_' + Math.random().toString(36).substr(2, 9),
      ...deuda,
      monto_pagado: deuda.estado === 'Pagado' ? Number(deuda.monto) : Number(deuda.monto_pagado || 0)
    };
    deudas.push(newDeuda);
    this._saveDeudas(deudas);
    return Promise.resolve(newDeuda);
  }

  subscribeDeudasPacientes(email, callback) {
    const listenerId = 'deudas_' + Math.random().toString(36).substr(2, 9);
    const runCallback = () => {
      const allDeudas = this._getDeudas();
      const filtered = allDeudas.filter(d => d.id_profesional === email);
      // Ordenar por fecha descendente
      filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      callback(filtered);
    };

    this.listeners[listenerId] = runCallback;
    runCallback();

    return () => {
      delete this.listeners[listenerId];
    };
  }

  updateDeudaEstado(id, nuevoEstado, montoTotal) {
    let deudas = this._getDeudas();
    deudas = deudas.map(d => {
      if (d.id === id) {
        const updates = { ...d, estado: nuevoEstado };
        if (nuevoEstado === 'Pagado') {
          updates.monto_pagado = montoTotal !== undefined ? Number(montoTotal) : Number(d.monto);
        }
        return updates;
      }
      return d;
    });
    this._saveDeudas(deudas);
    return Promise.resolve();
  }

  updateDeudaPago(id, nuevoEstado, nuevoMontoPagado) {
    let deudas = this._getDeudas();
    deudas = deudas.map(d => {
      if (d.id === id) {
        return { ...d, estado: nuevoEstado, monto_pagado: Number(nuevoMontoPagado) };
      }
      return d;
    });
    this._saveDeudas(deudas);
    return Promise.resolve();
  }

  deleteDeudaPaciente(id) {
    let deudas = this._getDeudas();
    deudas = deudas.filter(d => d.id !== id);
    this._saveDeudas(deudas);
    return Promise.resolve();
  }

  registrarPagoPaciente(idPaciente, montoAbono) {
    let deudas = this._getDeudas();
    const impagas = deudas.filter(d => d.id_paciente === idPaciente && d.estado === 'Debe');
    impagas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let restante = Number(montoAbono);
    
    deudas = deudas.map(d => {
      if (d.id_paciente === idPaciente && d.estado === 'Debe' && restante > 0) {
        const montoTotal = Number(d.monto);
        const montoYaPagado = Number(d.monto_pagado || 0);
        const deudaRestante = montoTotal - montoYaPagado;

        if (restante >= deudaRestante) {
          restante -= deudaRestante;
          return { ...d, estado: 'Pagado', monto_pagado: montoTotal };
        } else {
          const nuevoPago = montoYaPagado + restante;
          restante = 0;
          return { ...d, estado: 'Debe', monto_pagado: nuevoPago };
        }
      }
      return d;
    });

    this._saveDeudas(deudas);
    return Promise.resolve();
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
        where('mes', '==', mes)
      );
      return onSnapshot(q, (snapshot) => {
        const gastos = [];
        snapshot.forEach((doc) => {
          gastos.push({ id: doc.id, ...doc.data() });
        });
        // Ordenar por fecha del lado del cliente para evitar requerir un índice compuesto en Firestore
        gastos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
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
        where('mes', '==', mes)
      );
      const snapshot = await getDocs(q);
      const gastos = [];
      snapshot.forEach((doc) => {
        gastos.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar por fecha del lado del cliente para evitar requerir un índice compuesto en Firestore
      gastos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
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
      const cierreConFecha = {
        ...cierre,
        fechaCierre: cierre.fechaCierre || new Date().toISOString()
      };
      return addDoc(ref, cierreConFecha);
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

  // --- MÓDULO PACIENTES & DEUDAS ---
  addPaciente: async (paciente) => {
    if (useMock) {
      return mockDB.addPaciente(paciente);
    } else {
      const ref = collection(dbInstance, 'pacientes');
      return addDoc(ref, paciente);
    }
  },

  updatePaciente: async (id, updates) => {
    if (useMock) {
      return mockDB.updatePaciente(id, updates);
    } else {
      const docRef = doc(dbInstance, 'pacientes', id);
      await setDoc(docRef, updates, { merge: true });

      // Propagar cambio de nombre a las deudas/sesiones
      if (updates.nombre || updates.apellido) {
        const nuevoNombreCompleto = `${updates.nombre || ''} ${updates.apellido || ''}`.trim();
        const q = query(
          collection(dbInstance, 'deudas_pacientes'),
          where('id_paciente', '==', id)
        );
        const snapshot = await getDocs(q);
        const promises = [];
        snapshot.forEach(d => {
          const debtRef = doc(dbInstance, 'deudas_pacientes', d.id);
          promises.push(setDoc(debtRef, { nombre_paciente: nuevoNombreCompleto }, { merge: true }));
        });
        await Promise.all(promises);
      }
      return Promise.resolve();
    }
  },

  subscribePacientes: (email, callback) => {
    if (useMock) {
      return mockDB.subscribePacientes(email, callback);
    } else {
      const q = query(
        collection(dbInstance, 'pacientes'),
        where('id_profesional', '==', email)
      );
      return onSnapshot(q, (snapshot) => {
        const pacientes = [];
        snapshot.forEach((doc) => {
          pacientes.push({ id: doc.id, ...doc.data() });
        });
        // Ordenar alfabéticamente por apellido y luego nombre
        pacientes.sort((a, b) => {
          const nameA = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
          const nameB = `${b.apellido || ''} ${b.nombre || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        callback(pacientes);
      }, (error) => {
        console.error("Error en onSnapshot de pacientes:", error);
      });
    }
  },

  addDeudaPaciente: async (deuda) => {
    const deudaConPago = {
      ...deuda,
      monto_pagado: deuda.estado === 'Pagado' ? Number(deuda.monto) : Number(deuda.monto_pagado || 0)
    };
    if (useMock) {
      return mockDB.addDeudaPaciente(deudaConPago);
    } else {
      const ref = collection(dbInstance, 'deudas_pacientes');
      return addDoc(ref, deudaConPago);
    }
  },

  subscribeDeudasPacientes: (email, callback) => {
    if (useMock) {
      return mockDB.subscribeDeudasPacientes(email, callback);
    } else {
      const q = query(
        collection(dbInstance, 'deudas_pacientes'),
        where('id_profesional', '==', email)
      );
      return onSnapshot(q, (snapshot) => {
        const deudas = [];
        snapshot.forEach((doc) => {
          deudas.push({ id: doc.id, ...doc.data() });
        });
        // Ordenar por fecha descendente
        deudas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        callback(deudas);
      }, (error) => {
        console.error("Error en onSnapshot de deudas_pacientes:", error);
      });
    }
  },

  updateDeudaEstado: async (id, nuevoEstado, montoTotal) => {
    if (useMock) {
      return mockDB.updateDeudaEstado(id, nuevoEstado, montoTotal);
    } else {
      const docRef = doc(dbInstance, 'deudas_pacientes', id);
      const updates = { estado: nuevoEstado };
      if (nuevoEstado === 'Pagado' && montoTotal !== undefined) {
        updates.monto_pagado = Number(montoTotal);
      }
      return setDoc(docRef, updates, { merge: true });
    }
  },

  updateDeudaPago: async (id, nuevoEstado, nuevoMontoPagado) => {
    if (useMock) {
      return mockDB.updateDeudaPago(id, nuevoEstado, nuevoMontoPagado);
    } else {
      const docRef = doc(dbInstance, 'deudas_pacientes', id);
      return setDoc(docRef, { 
        estado: nuevoEstado, 
        monto_pagado: Number(nuevoMontoPagado) 
      }, { merge: true });
    }
  },

  deleteDeudaPaciente: async (id) => {
    if (useMock) {
      return mockDB.deleteDeudaPaciente(id);
    } else {
      const docRef = doc(dbInstance, 'deudas_pacientes', id);
      return deleteDoc(docRef);
    }
  },

  registrarPagoPaciente: async (idPaciente, montoAbono) => {
    if (useMock) {
      return mockDB.registrarPagoPaciente(idPaciente, montoAbono);
    } else {
      const q = query(
        collection(dbInstance, 'deudas_pacientes'),
        where('id_paciente', '==', idPaciente),
        where('estado', '==', 'Debe')
      );
      const snapshot = await getDocs(q);
      const deudasImpagas = [];
      snapshot.forEach(doc => {
        deudasImpagas.push({ id: doc.id, ...doc.data() });
      });

      deudasImpagas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      let restante = Number(montoAbono);
      const promises = [];

      for (const d of deudasImpagas) {
        if (restante <= 0) break;

        const montoTotal = Number(d.monto);
        const montoYaPagado = Number(d.monto_pagado || 0);
        const deudaRestante = montoTotal - montoYaPagado;
        const docRef = doc(dbInstance, 'deudas_pacientes', d.id);

        if (restante >= deudaRestante) {
          restante -= deudaRestante;
          promises.push(setDoc(docRef, { estado: 'Pagado', monto_pagado: montoTotal }, { merge: true }));
        } else {
          const nuevoPago = montoYaPagado + restante;
          restante = 0;
          promises.push(setDoc(docRef, { estado: 'Debe', monto_pagado: nuevoPago }, { merge: true }));
        }
      }

      await Promise.all(promises);
      return Promise.resolve();
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
