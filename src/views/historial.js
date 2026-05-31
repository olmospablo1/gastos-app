import { db, USERS } from '../firebase.js';

export function mountHistorial(container, state) {
  let unsubscribe = null;
  const accordionGastosMap = {};
  const accordionActiveFilters = {};

  function render(cierres) {
    container.innerHTML = `
      <div class="view-container max-w-lg mx-auto pb-24 px-4 pt-6">
        <!-- Título -->
        <div class="mb-6">
          <h1 class="text-3xl font-extrabold text-white">Historial de Cierres</h1>
          <p class="text-gray-400 text-sm mt-1">Revisá los meses archivados y realizá nuevos cierres.</p>
        </div>

        <!-- Sección de Cierre del Mes Actual (Glass Card) -->
        <div class="glass-card rounded-2xl p-5 mb-8 border border-white/10 relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-28 h-28 bg-violet-600/10 rounded-full blur-2xl"></div>
          <h2 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <svg class="icon text-violet-400 w-5 h-5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Cierre del Mes Actual
          </h2>
          <p class="text-xs text-gray-400 mb-4">Cerrar el mes de <span class="text-indigo-400 font-semibold">${formatMes(state.currentMonth)}</span> congelará los saldos y creará un registro permanente en el historial.</p>
          
          <button 
            id="btn-cerrar-mes" 
            class="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Archivar y Cerrar Mes
          </button>
        </div>

        <!-- Listado de Cierres Pasados -->
        <div>
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Historial de Meses Cerrados
          </h2>

          <div id="lista-cierres" class="space-y-4">
            ${cierres.length === 0 ? `
              <div class="glass-card rounded-xl p-8 text-center border border-white/5">
                <svg class="icon text-gray-500 w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <p class="text-gray-400 text-sm">Aún no hay ningún mes cerrado.</p>
                <p class="text-gray-500 text-xs mt-1">Los cierres guardados aparecerán aquí.</p>
              </div>
            ` : cierres.map((c, index) => {
              return `
                <div class="glass-card rounded-xl border border-white/5 overflow-hidden animate-fade-in">
                  <!-- Cabecera de Tarjeta Acordeón -->
                  <button 
                    class="w-full text-left p-4 hover:bg-white/2 flex items-center justify-between focus:outline-none transition-colors accordion-toggle" 
                    data-index="${index}"
                  >
                    <div>
                      <h3 class="font-extrabold text-white text-base">${formatMes(c.mes)}</h3>
                      <p class="text-2xs text-gray-500 mt-0.5">Cerrado el ${formatFechaHora(c.fechaCierre)}</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="text-right">
                        <p class="text-xs text-gray-400">Total Mensual</p>
                        <p class="font-extrabold text-indigo-400 text-sm">$${formatMonto(c.totalGeneral)}</p>
                      </div>
                      <svg class="icon w-4 h-4 text-gray-400 transition-transform duration-200 chevron-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </button>

                  <!-- Detalle de Saldos (Inicialmente oculto) -->
                  <div class="accordion-content hidden border-t border-white/5 bg-zinc-950/20 p-4 space-y-3">
                    <div class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Resumen de Saldos al Cierre:</div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      ${USERS.map(user => {
                        const saldo = c.saldos[user] || 0;
                        const pago = c.pagos[user] || 0;
                        let textClass = "text-zinc-400";
                        let statusText = "Al día";

                        if (saldo > 0.01) {
                          textClass = "text-emerald-400";
                          statusText = `A favor: +$${formatMonto(saldo)}`;
                        } else if (saldo < -0.01) {
                          textClass = "text-rose-400";
                          statusText = `Debe pagar: -$${formatMonto(Math.abs(saldo))}`;
                        }

                        return `
                          <div class="p-2.5 rounded-lg bg-zinc-900/40 border border-white/5">
                            <p class="font-bold text-white mb-0.5">${user}</p>
                            <p class="text-3xs text-gray-500 mb-1">Pagó: $${formatMonto(pago)}</p>
                            <p class="font-semibold ${textClass}">${statusText}</p>
                          </div>
                        `;
                      }).join('')}
                    </div>
                    
                    <!-- Subcontenedor de listado de gastos y pills del cierre -->
                    <div class="gastos-list-subcontainer border-t border-white/5 pt-3 mt-4" data-mes="${c.mes}" data-loaded="false">
                      <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                      </div>
                    </div>

                    <!-- Botón para Reabrir Mes -->
                    <div class="mt-4 flex justify-end">
                      <button 
                        class="btn-reabrir-mes px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 text-xs font-semibold rounded-lg active:scale-95 transition-all flex items-center gap-1.5"
                        data-mes="${c.mes}"
                      >
                        <svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        Reabrir y Editar Gastos
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // 1. Configurar lógica del acordeón
    const toggles = container.querySelectorAll('.accordion-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', async () => {
        const index = toggle.getAttribute('data-index');
        const content = toggle.nextElementSibling;
        const chevron = toggle.querySelector('.chevron-icon');

        content.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');

        // Si se expande el acordeón, cargar los gastos del cierre de forma diferida (lazy load)
        if (!content.classList.contains('hidden')) {
          const listContainer = content.querySelector('.gastos-list-subcontainer');
          if (listContainer && listContainer.getAttribute('data-loaded') !== 'true') {
            const mes = listContainer.getAttribute('data-mes');
            await loadAccordionExpenses(listContainer, mes, index);
          }
        }
      });
    });

    // 2. Configurar lógica del botón de reabrir mes
    const reabrirBtns = container.querySelectorAll('.btn-reabrir-mes');
    reabrirBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Evitar que se colapse el acordeón
        const mes = btn.getAttribute('data-mes');
        if (confirm(`¿Estás seguro de que deseas reabrir el mes de ${formatMes(mes)}? Esto revertirá el cierre y te permitirá editar los gastos nuevamente.`)) {
          try {
            await db.reabrirMes(mes);
            state.currentMonth = mes;
            localStorage.setItem('consultorio_current_month', mes);
            alert(`El mes de ${formatMes(mes)} ha sido reabierto con éxito.`);
            window.location.hash = '#servicios'; // Redirigir a la vista de gastos para editar
          } catch (err) {
            console.error("Error al reabrir el mes:", err);
            alert("No se pudo reabrir el mes.");
          }
        }
      });
    });

    // 3. Configurar lógica del botón de cerrar mes (lectura única limpia con getGastos)
    const btnCerrar = container.querySelector('#btn-cerrar-mes');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', async () => {
        if (!confirm(`¿Estás seguro de que deseas cerrar el mes de ${formatMes(state.currentMonth)}?`)) {
          return;
        }

        btnCerrar.disabled = true;
        btnCerrar.innerHTML = `Cerrando...`;

        try {
          // 1. Obtener gastos del mes en una única lectura limpia (evita loops infinitos)
          const gastos = await db.getGastos(state.currentMonth);

          const totalGeneral = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
          const cuotaEsperada = totalGeneral / 4;

          const pagos = USERS.reduce((acc, user) => {
            acc[user] = gastos
              .filter(g => g.pagadoPor === user)
              .reduce((sum, g) => sum + Number(g.monto), 0);
            return acc;
          }, {});

          const saldos = USERS.reduce((acc, user) => {
            acc[user] = pagos[user] - cuotaEsperada;
            return acc;
          }, {});

          const cierre = {
            mes: state.currentMonth,
            totalGeneral,
            pagos,
            saldos
          };

          // 2. Marcar los gastos del mes como cerrados en la DB
          await db.cerrarGastosDeMes(state.currentMonth);

          // 3. Guardar el documento del cierre
          await db.addCierre(cierre);
          
          // Avanzar el mes actual (pasar al mes siguiente)
          const [year, month] = state.currentMonth.split('-');
          let nextYear = parseInt(year);
          let nextMonth = parseInt(month) + 1;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
          }
          const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
          
          // Actualizar estado global y localStorage de configuración
          state.currentMonth = nextMonthStr;
          localStorage.setItem('consultorio_current_month', nextMonthStr);

          alert(`¡Mes de ${formatMes(cierre.mes)} cerrado con éxito! Ahora el mes activo es ${formatMes(nextMonthStr)}.`);
          
          // Redirigir al dashboard
          window.location.hash = '#dashboard';
        } catch (err) {
          console.error("Error al realizar el cierre:", err);
          alert("No se pudo guardar el cierre del mes.");
        } finally {
          btnCerrar.disabled = false;
          btnCerrar.innerHTML = `
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Archivar y Cerrar Mes
          `;
        }
      });
    }
  }

  async function loadAccordionExpenses(listContainer, mes, index) {
    listContainer.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
      </div>
    `;

    try {
      const gastos = await db.getGastos(mes);
      accordionGastosMap[mes] = gastos;
      accordionActiveFilters[mes] = 'Todos';
      listContainer.setAttribute('data-loaded', 'true');
      renderAccordionExpenses(listContainer, mes, index);
    } catch (e) {
      console.error("Error cargando gastos para historial:", e);
      listContainer.innerHTML = `<p class="text-3xs text-rose-400 py-2">Error al cargar gastos del mes.</p>`;
    }
  }

  function renderAccordionExpenses(listContainer, mes, index) {
    const gastos = accordionGastosMap[mes] || [];
    const activeFilter = accordionActiveFilters[mes] || 'Todos';

    const filtered = activeFilter === 'Todos'
      ? gastos
      : gastos.filter(g => g.pagadoPor === activeFilter);

    const totalFiltrado = filtered.reduce((sum, g) => sum + Number(g.monto), 0);

    listContainer.innerHTML = `
      <div class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Detalle de Gastos del Cierre:</div>
      
      <!-- Pills de Filtro (Fila horizontal de botones) -->
      <div class="flex gap-1.5 overflow-x-auto pb-2.5 pt-0.5 scrollbar-none">
        ${['Todos', ...USERS].map(filterName => {
          const isActive = activeFilter === filterName;
          const activeClass = isActive
            ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
            : 'border-white/5 text-gray-400 bg-white/2 hover:border-white/10';
          return `
            <button 
              class="pill-accordion-filter text-3xs px-2.5 py-1 rounded-full border transition-all shrink-0 active:scale-95 cursor-pointer ${activeClass}" 
              data-filter="${filterName}"
            >
              ${filterName}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Fila de Total de Gastos del Filtro -->
      <div class="flex items-center justify-between py-1.5 px-2 mb-2 rounded bg-indigo-500/5 border border-indigo-500/10 text-3xs">
        <span class="text-gray-400 font-medium">Total ${activeFilter === 'Todos' ? 'del Cierre' : `de ${activeFilter}`}:</span>
        <span class="font-bold text-indigo-400">$${formatMonto(totalFiltrado)}</span>
      </div>

      <!-- Detalle Listado -->
      <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
        ${filtered.length === 0 ? `
          <p class="text-3xs text-gray-500 text-center py-3">No hay gastos para este filtro.</p>
        ` : filtered.map(g => {
          const colors = {
            'Paola': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            'Angelina': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'Macarena': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'Denise': 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          };
          const badgeColor = colors[g.pagadoPor] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
          return `
            <div class="flex items-center justify-between p-2 rounded bg-zinc-900/30 border border-white/5 animate-fade-in">
              <div class="truncate max-w-[200px] flex items-center gap-1.5">
                <span class="text-[9px] font-semibold px-1 rounded border ${badgeColor}">${g.pagadoPor}</span>
                <span class="text-3xs text-white truncate max-w-[120px]">${g.nombre}</span>
              </div>
              <span class="text-3xs font-bold text-white shrink-0">$${formatMonto(g.monto)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Escuchar clicks de las pills en el acordeón
    const pills = listContainer.querySelectorAll('.pill-accordion-filter');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.getAttribute('data-filter');
        accordionActiveFilters[mes] = filter;
        renderAccordionExpenses(listContainer, mes, index);
      });
    });
  }

  // Escuchar en tiempo real los cierres guardados
  unsubscribe = db.subscribeCierres(render);

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// Helpers locales
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
    .replace(/^\w/, c => c.toUpperCase());
}

function formatFechaHora(fechaStr) {
  if (!fechaStr) return '';
  const date = new Date(fechaStr);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
