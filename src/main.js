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

    // Si el usuario estaba en la pantalla de login, enviarlo a dashboard
    if (window.location.hash === '#login' || !window.location.hash) {
      window.location.hash = '#dashboard';
    } else {
      router();
    }
  } else {
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
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
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
