import { db, USERS } from '../firebase.js';

export function mountDashboard(container, state) {
  let unsubscribe = null;

  function render(gastos) {
    // 1. Calcular totales
    const totalGeneral = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
    const cuotaEsperada = totalGeneral / 4;

    // Calcular cuánto pagó cada persona
    const pagosPorPersona = USERS.reduce((acc, user) => {
      acc[user] = gastos
        .filter(g => g.pagadoPor === user)
        .reduce((sum, g) => sum + Number(g.monto), 0);
      return acc;
    }, {});

    // Calcular saldos (lo que pagó - lo que le correspondía pagar)
    const saldos = USERS.reduce((acc, user) => {
      acc[user] = pagosPorPersona[user] - cuotaEsperada;
      return acc;
    }, {});

    // Crear HTML
    container.innerHTML = `
      <div class="view-container max-w-lg mx-auto pb-24 px-4 pt-6">
        <!-- Encabezado con gradiente -->
        <div class="mb-8 text-center">
          <span class="text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Resumen Mensual</span>
          <h1 class="text-4xl font-extrabold text-white mt-3 mb-1">Consultorio Gastos</h1>
          <p class="text-gray-400 text-sm">Mes de Control: <span class="font-bold text-indigo-300">${formatMes(state.currentMonth)}</span></p>
        </div>

        <!-- Tarjeta de Resumen General (Glassmorphism) -->
        <div class="glass-card rounded-2xl p-6 mb-8 border border-white/10 relative overflow-hidden">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600/15 rounded-full blur-3xl"></div>
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-violet-600/15 rounded-full blur-3xl"></div>
          
          <div class="grid grid-cols-2 gap-4 divide-x divide-white/10 text-center relative z-10">
            <div>
              <p class="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Gasto Total</p>
              <p class="text-3xl font-extrabold text-white">$${formatMonto(totalGeneral)}</p>
            </div>
            <div>
              <p class="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Cuota p/p (4)</p>
              <p class="text-3xl font-extrabold text-indigo-400">$${formatMonto(cuotaEsperada)}</p>
            </div>
          </div>
        </div>

        <!-- Título de Sección -->
        <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg class="icon text-indigo-400" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Saldos por Persona
        </h2>

        <!-- Grilla de Tarjetas de Usuarios -->
        <div class="space-y-4">
          ${USERS.map(user => {
            const saldo = saldos[user] || 0;
            const pago = pagosPorPersona[user] || 0;
            let statusColor = "border-zinc-800 text-zinc-400 bg-zinc-900/20";
            let statusLabel = "Al día";
            let statusBadge = "bg-zinc-500/10 text-zinc-400 border-zinc-500/25";
            let amountClass = "text-white";
            let actionText = "";

            if (saldo > 0.01) {
              statusColor = "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5";
              statusLabel = "A favor";
              statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
              amountClass = "text-emerald-400";
              actionText = `Recibe <span class="font-bold">$${formatMonto(saldo)}</span>`;
            } else if (saldo < -0.01) {
              statusColor = "border-rose-500/30 bg-rose-500/5 shadow-rose-500/5";
              statusLabel = "Debe pagar";
              statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/25";
              amountClass = "text-rose-400";
              actionText = `Debe aportar <span class="font-bold">$${formatMonto(Math.abs(saldo))}</span>`;
            }

            return `
              <div class="glass-card glass-card-hover rounded-xl p-4 border ${statusColor} transition-all duration-300 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- Avatar con letra inicial -->
                  <div class="w-11 h-11 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/25">
                    ${user.charAt(0)}
                  </div>
                  <div>
                    <h3 class="font-bold text-white text-base">${user}</h3>
                    <p class="text-xs text-gray-400">Pagó: $${formatMonto(pago)}</p>
                  </div>
                </div>

                <div class="text-right">
                  <span class="inline-block px-2 py-0.5 text-2xs font-semibold rounded-md border ${statusBadge} mb-1">
                    ${statusLabel}
                  </span>
                  <p class="text-sm font-semibold ${amountClass}">
                    ${actionText || '$0'}
                  </p>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Botón para cerrar mes en el Dashboard (Ticket 05) -->
        <div class="mt-8">
          <button id="btn-cerrar-mes-dashboard" class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2">
            <svg class="icon w-5 h-5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Realizar Cierre de Mes
          </button>
        </div>
      </div>
    `;

    // Escuchar el evento de cierre de mes
    const btnCerrar = container.querySelector('#btn-cerrar-mes-dashboard');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => {
        window.location.hash = '#historial';
      });
    }
  }

  // Suscribirse a los gastos del mes actual en Firestore/MockDB
  unsubscribe = db.subscribeGastos(state.currentMonth, render);

  // Devolver función de limpieza para cuando se desmonte la vista
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// Helpers para formatear dinero y fecha de mes
function formatMonto(monto) {
  return Number(monto).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatMes(mesStr) {
  const [year, month] = mesStr.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase()); // Capitalizar mes
}
