import { db } from './firebase.js';
import { mountLogin } from './views/login.js';
import { mountDashboard } from './views/dashboard.js';
import { mountServicios } from './views/servicios.js';
import { mountHistorial } from './views/historial.js';
import { mountPacientes } from './views/pacientes.js';

// Estado global de la aplicación SPA
const state = {
  currentMonth: localStorage.getItem('consultorio_current_month') || '2026-05',
  user: null // Almacena el usuario activo: { email, displayName, mappedName }
};

// Modales personalizados de la aplicación (drop-in replacement para alert y confirm)
window.appConfirm = (title, message) => {
  return new Promise((resolve) => {
    const oldModal = document.getElementById('global-app-confirm');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'global-app-confirm';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass-card rounded-2xl w-full max-w-xs p-5 border border-white/10 relative overflow-hidden animate-fade-in shadow-2xl">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          ${title}
        </h3>
        <p class="text-xs text-gray-300 mb-4 leading-relaxed">${message}</p>
        
        <div class="flex gap-2.5 pt-1.5">
          <button 
            type="button" 
            id="btn-confirm-cancel" 
            class="flex-1 py-2.5 border border-white/10 hover:border-white/20 text-gray-300 text-3xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button"
            id="btn-confirm-ok"
            class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-3xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-confirm-cancel').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    modal.querySelector('#btn-confirm-ok').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
  });
};

window.appAlert = (title, message) => {
  return new Promise((resolve) => {
    const oldModal = document.getElementById('global-app-alert');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'global-app-alert';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass-card rounded-2xl w-full max-w-xs p-5 border border-white/10 relative overflow-hidden animate-fade-in shadow-2xl">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          ${title}
        </h3>
        <p class="text-xs text-gray-300 mb-4 leading-relaxed">${message}</p>
        
        <div class="flex pt-1.5">
          <button 
            type="button"
            id="btn-alert-ok"
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-3xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-alert-ok').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
  });
};

function getNextMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  let nextYear = parseInt(year);
  let nextMonth = parseInt(month) + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// Referencias a elementos del DOM
const appHeader = document.getElementById('app-header');
const appNavbar = document.getElementById('app-navbar');
const appContent = document.getElementById('app-content');
const navLinks = document.querySelectorAll('.nav-link');

const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userAvatarEl = document.getElementById('user-avatar');
const btnLogout = document.getElementById('btn-logout');

// Guardar la función de limpieza de la vista activa para evitar duplicar escuchas a Firestore
let destroyActiveView = null;

// Rutas de la SPA
const routes = {
  '#login': mountLogin,
  '#dashboard': mountDashboard,
  '#servicios': mountServicios,
  '#historial': mountHistorial,
  '#pacientes': mountPacientes
};

// Función principal del enrutador
function router() {
  let hash = window.location.hash || '#dashboard';

  // 1. Protección de Rutas (Guard de navegación)
  if (!state.user) {
    if (hash !== '#login') {
      window.location.hash = '#login';
      return; // El cambio de hash disparará 'hashchange' y re-ejecutará router()
    }
  } else {
    // Si ya está logueado e intenta ir a login, redirigir a dashboard
    if (hash === '#login') {
      window.location.hash = '#dashboard';
      return;
    }
  }

  const mountView = routes[hash] || mountDashboard;

  // 2. Limpiar suscripciones y estados de la vista anterior
  if (typeof destroyActiveView === 'function') {
    destroyActiveView();
    destroyActiveView = null;
  }

  // 3. Limpiar contenedor e inyectar animación de carga
  appContent.innerHTML = `
    <div class="flex items-center justify-center min-h-[50vh]">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  `;

  // 4. Montar la nueva vista y guardar su función de limpieza
  try {
    destroyActiveView = mountView(appContent, state);
  } catch (error) {
    console.error("Error montando la vista:", error);
    appContent.innerHTML = `
      <div class="p-6 text-center text-rose-400">
        <p class="font-bold">Ocurrió un error al cargar la sección.</p>
        <p class="text-xs text-gray-500 mt-2">${error.message}</p>
      </div>
    `;
  }

  // 5. Actualizar apariencia visual del menú de navegación inferior
  navLinks.forEach(link => {
    const linkHash = link.getAttribute('href');
    if (linkHash === hash) {
      link.classList.add('nav-link-active');
      link.querySelector('span')?.classList.remove('text-gray-400');
      link.querySelector('span')?.classList.add('text-indigo-400', 'font-medium');
    } else {
      link.classList.remove('nav-link-active');
      link.querySelector('span')?.classList.remove('text-indigo-400', 'font-medium');
      link.querySelector('span')?.classList.add('text-gray-400');
    }
  });
}

// Escuchar cambios de autenticación en Firebase / Mock Auth
let unsubscribeCierresGlobal = null;

db.auth.onAuthStateChanged((user) => {
  state.user = user;

  if (user) {
    // Configurar cabecera de perfil
    const label = user.mappedName || user.displayName || 'Usuario';
    userNameEl.innerText = label;
    userEmailEl.innerText = user.email;
    userAvatarEl.innerText = label.charAt(0).toUpperCase();

    // Mostrar cabecera y navbar
    appHeader.classList.remove('hidden');
    appNavbar.classList.remove('hidden');

    // Sincronizar mes activo dinámicamente según los cierres registrados en la DB
    if (!unsubscribeCierresGlobal) {
      unsubscribeCierresGlobal = db.subscribeCierres((cierres) => {
        let latestMonth = '2026-05';
        if (cierres && cierres.length > 0) {
          // Ordenar cierres por mes
          const sorted = [...cierres].sort((a, b) => a.mes.localeCompare(b.mes));
          const latestCierre = sorted[sorted.length - 1];
          latestMonth = getNextMonth(latestCierre.mes);
        }
        
        if (state.currentMonth !== latestMonth) {
          state.currentMonth = latestMonth;
          localStorage.setItem('consultorio_current_month', latestMonth);
          // Forzar re-render de la vista actual si no estamos en login
          if (window.location.hash !== '#login') {
            router();
          }
        }
      });
    }

    // Si el usuario estaba en la pantalla de login, enviarlo a dashboard
    if (window.location.hash === '#login' || !window.location.hash) {
      window.location.hash = '#dashboard';
    } else {
      router();
    }
  } else {
    // Desuscribirse al desloguearse
    if (unsubscribeCierresGlobal) {
      unsubscribeCierresGlobal();
      unsubscribeCierresGlobal = null;
    }

    // Ocultar cabecera y navbar
    appHeader.classList.add('hidden');
    appNavbar.classList.add('hidden');

    // Forzar redirección al login
    if (window.location.hash !== '#login') {
      window.location.hash = '#login';
    } else {
      router();
    }
  }
});

// Evento de Cerrar Sesión
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (await window.appConfirm('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?')) {
      try {
        await db.auth.signOut();
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
      }
    }
  });
}

// Escuchar cambios de ruta
window.addEventListener('hashchange', router);
