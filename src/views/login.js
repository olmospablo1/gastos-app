import { db, USERS } from '../firebase.js';

export function mountLogin(container, state) {
  const isMock = db.auth.isMock();

  container.innerHTML = `
    <div class="view-container max-w-sm mx-auto px-4 flex flex-col justify-center min-h-[90vh] pb-16">
      
      <!-- Logo y Encabezado con Gradiente -->
      <div class="text-center mb-8 animate-fade-in">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 mb-5 relative">
          <div class="absolute inset-0 rounded-2xl bg-white/10 blur-md"></div>
          <svg class="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Acceso Privado</h1>
        <p class="text-gray-400 text-sm mt-2 px-6">Identificate para acceder al control de gastos compartidos del consultorio.</p>
      </div>

      <!-- Tarjeta Principal de Login (Glassmorphism) -->
      <div class="glass-card rounded-2xl p-6 border border-white/10 relative overflow-hidden animate-fade-in">
        <div class="absolute -right-12 -top-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <div class="absolute -left-12 -bottom-12 w-28 h-28 bg-violet-600/10 rounded-full blur-2xl"></div>

        <div class="relative z-10 space-y-6">
          
          <!-- Botón de Google Sign-in Real o Mock Genérico -->
          <button 
            id="btn-login-google" 
            class="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-3 border border-gray-200"
          >
            <!-- Logo de Google SVG -->
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.26 2.28v1.9h3.63c2.13-1.96 3.36-4.85 3.36-8.03z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.63-2.82c-1.01.68-2.3 1.09-3.83 1.09-2.95 0-5.46-1.99-6.35-4.67H2.43v2.9C4.41 20.73 8.01 24 12 24z"/>
              <path fill="#FBBC05" d="M5.65 14.69a7.18 7.18 0 0 1 0-4.38V7.41H2.43a12.02 12.02 0 0 0 0 9.19l3.22-2.91z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 8.01 0 4.41 3.27 2.43 7.41l3.22 2.9C6.54 6.74 9.05 4.75 12 4.75z"/>
            </svg>
            Acceder con Google
          </button>

          <!-- Sección de Mock Login si no está configurado Firebase -->
          ${isMock ? `
            <div class="pt-6 border-t border-white/5 space-y-4">
              <div class="text-center">
                <span class="text-3xs uppercase tracking-widest text-indigo-400 font-semibold">Desarrollo: Simular Usuario</span>
              </div>
              <p class="text-3xs text-gray-500 text-center leading-relaxed">Firebase no está configurado en local. Hacé clic en cualquiera de los usuarios para simular una sesión de Google:</p>
              
              <div class="grid grid-cols-2 gap-2.5 pt-2">
                ${USERS.map(user => `
                  <button 
                    class="btn-mock-login flex items-center gap-2 p-2.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 text-xs text-left text-white active:scale-95 transition-all"
                    data-user="${user}"
                  >
                    <div class="w-6 h-6 rounded bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                      ${user.charAt(0)}
                    </div>
                    <span class="truncate font-semibold">${user}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;

  // 1. Configurar evento de Login con Google (Real o Paola por defecto en Mock)
  const btnGoogle = container.querySelector('#btn-login-google');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      btnGoogle.disabled = true;
      btnGoogle.innerHTML = `Ingresando...`;
      try {
        await db.auth.signInWithGoogle();
        // Redirigir al dashboard (main.js se encarga de reaccionar)
        window.location.hash = '#dashboard';
      } catch (err) {
        console.error("Error al autenticar con Google:", err);
        alert("Error de autenticación. Verifica que tengas conexión a internet y los popups habilitados.");
      } finally {
        btnGoogle.disabled = false;
        btnGoogle.innerHTML = `
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.26 2.28v1.9h3.63c2.13-1.96 3.36-4.85 3.36-8.03z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.63-2.82c-1.01.68-2.3 1.09-3.83 1.09-2.95 0-5.46-1.99-6.35-4.67H2.43v2.9C4.41 20.73 8.01 24 12 24z"/>
            <path fill="#FBBC05" d="M5.65 14.69a7.18 7.18 0 0 1 0-4.38V7.41H2.43a12.02 12.02 0 0 0 0 9.19l3.22-2.91z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 8.01 0 4.41 3.27 2.43 7.41l3.22 2.9C6.54 6.74 9.05 4.75 12 4.75z"/>
          </svg>
          Acceder con Google
        `;
      }
    });
  }

  // 2. Configurar eventos de Mock Login si aplica
  if (isMock) {
    const mockBtns = container.querySelectorAll('.btn-mock-login');
    mockBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-user');
        try {
          await db.auth.signInMock(username);
          window.location.hash = '#dashboard';
        } catch (err) {
          console.error("Error mock login:", err);
        }
      });
    });
  }

  return () => {};
}
