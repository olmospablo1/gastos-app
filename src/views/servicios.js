import { db, USERS } from '../firebase.js';

export function mountServicios(container, state) {
  let unsubscribeExpenses = null;
  let unsubscribeAll = null;

  let selectedMonth = state.currentMonth;
  let availableMonths = [state.currentMonth];
  let lastExpensesList = [];
  let activeFilter = 'Todos';

  // Inyectar el esqueleto inicial en el contenedor
  container.innerHTML = `
    <div class="view-container max-w-lg mx-auto pb-24 px-4 pt-6">
      <!-- Encabezado con selector integrado -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-white">Servicios y Gastos</h1>
          <p class="text-gray-400 text-sm mt-1">Revisá y cargá los gastos de cada mes.</p>
        </div>
        
        <!-- Contenedor del Selector de Mes -->
        <div id="selector-container" class="relative min-w-[155px] self-start sm:self-auto">
          <!-- Se inyecta el selector dinámicamente -->
        </div>
      </div>

      <!-- Contenedor del Formulario (u Info de Mes Cerrado) -->
      <div id="form-container" class="mb-8">
        <!-- Se inyecta dinámicamente -->
      </div>

      <!-- Contenedor del Listado de Gastos -->
      <div id="list-container">
        <!-- Se inyecta dinámicamente -->
      </div>
    </div>
  `;

  const selectorContainer = container.querySelector('#selector-container');
  const formContainer = container.querySelector('#form-container');
  const listContainer = container.querySelector('#list-container');

  // Rindea el selector de mes
  function renderSelector() {
    selectorContainer.innerHTML = `
      <select id="select-mes-filtro" class="w-full glass-input rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold focus:outline-none appearance-none cursor-pointer">
        ${availableMonths.map(m => `
          <option value="${m}" ${m === selectedMonth ? 'selected' : ''}>
            ${formatMes(m)} ${m === state.currentMonth ? '(Activo)' : ''}
          </option>
        `).join('')}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <svg class="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    `;

    // Escuchar cambios de mes
    const select = selectorContainer.querySelector('#select-mes-filtro');
    if (select) {
      select.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        setupExpensesSubscription();
      });
    }
  }

  // Rindea el listado y el formulario
  function renderContent(gastos) {
    lastExpensesList = gastos;
    // Determinar si el mes está cerrado
    const isMonthClosed = selectedMonth !== state.currentMonth || gastos.some(g => g.cerrado);

    // 1. Renderizar Formulario o Mensaje de Bloqueo
    if (isMonthClosed) {
      formContainer.innerHTML = `
        <div class="glass-card rounded-2xl p-5 border border-violet-500/20 bg-violet-950/5 flex items-start gap-3.5 animate-fade-in relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-violet-500/5 rounded-full blur-xl"></div>
          <div class="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
            <svg class="icon w-6 h-6" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div>
            <h3 class="font-bold text-white text-sm">Mes Cerrado e Inalterable</h3>
            <p class="text-xs text-gray-400 mt-1">Este mes ha sido archivado en el historial. Los gastos ya están consolidados, por lo que no es posible agregar ni eliminar registros.</p>
          </div>
        </div>
      `;
    } else {
      formContainer.innerHTML = `
        <div class="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden animate-fade-in">
          <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
          <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Cargar Gasto
          </h2>

          <form id="form-gasto" class="space-y-4">
            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="gasto-nombre">Concepto / Servicio</label>
              <input 
                type="text" 
                id="gasto-nombre" 
                placeholder="Ej. Alquiler, Luz, Internet..." 
                class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="gasto-monto">Monto ($)</label>
                <input 
                  type="number" 
                  id="gasto-monto" 
                  placeholder="0" 
                  min="1"
                  class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="gasto-pagador">Pagado por</label>
                <select 
                  id="gasto-pagador" 
                  class="w-full glass-input rounded-xl px-3 py-3 text-sm focus:outline-none appearance-none"
                  required
                >
                  <option value="" disabled ${!state.user?.mappedName ? 'selected' : ''}>Elegir...</option>
                  ${USERS.map(user => {
                    const isSelected = state.user?.mappedName === user;
                    return `<option value="${user}" ${isSelected ? 'selected' : ''}>${user}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="gasto-fecha">Fecha de Pago</label>
              <input 
                type="date" 
                id="gasto-fecha" 
                class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none"
                required
              />
            </div>

            <button 
              type="submit" 
              class="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
              Cargar Gasto
            </button>
          </form>
        </div>
      `;

      // Configurar fecha por defecto (hoy)
      const inputFecha = formContainer.querySelector('#gasto-fecha');
      if (inputFecha) {
        inputFecha.value = new Date().toISOString().split('T')[0];
      }

      // Evento de envío del formulario
      const form = formContainer.querySelector('#form-gasto');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const btnSubmit = form.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `Cargando...`;

          const nombre = form.querySelector('#gasto-nombre').value.trim();
          const monto = parseFloat(form.querySelector('#gasto-monto').value);
          const pagadoPor = form.querySelector('#gasto-pagador').value;
          const fecha = form.querySelector('#gasto-fecha').value;
          
          const [year, month] = fecha.split('-');
          const mes = `${year}-${month}`;

          const nuevoGasto = {
            nombre,
            monto,
            pagadoPor,
            fecha,
            mes
          };

          try {
            await db.addGasto(nuevoGasto);
            form.reset();
            inputFecha.value = new Date().toISOString().split('T')[0];
          } catch (err) {
            console.error("Error al guardar gasto:", err);
            await window.appAlert('Error', "Error al guardar el gasto.");
          } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `
              <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
              Cargar Gasto
            `;
          }
        });
      }
    }

    // 2. Renderizar Listado de Gastos
    const filteredGastos = activeFilter === 'Todos' 
      ? gastos 
      : gastos.filter(g => g.pagadoPor === activeFilter);
    
    const totalFiltrado = filteredGastos.reduce((sum, g) => sum + Number(g.monto), 0);

    listContainer.innerHTML = `
      <h2 class="text-xl font-bold text-white mb-4 flex items-center justify-between">
        <span class="flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M12 20h9M3 20h9M3 4h18M3 8h18M3 12h18M3 16h18"></path></svg>
          Detalle del Mes
        </span>
        <span class="text-xs font-medium text-gray-400">${filteredGastos.length} de ${gastos.length} gastos</span>
      </h2>

      <!-- Pills de Filtro (Fila horizontal de botones) -->
      <div class="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        ${['Todos', ...USERS].map(filterName => {
          const isActive = activeFilter === filterName;
          const activeClass = isActive 
            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' 
            : 'border-white/10 text-gray-400 bg-white/2 hover:border-white/20';
          return `
            <button 
              class="pill-filter text-xs px-4 py-1.5 rounded-full border transition-all shrink-0 active:scale-95 cursor-pointer ${activeClass}" 
              data-filter="${filterName}"
            >
              ${filterName}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Fila de Total de Gastos del Filtro -->
      <div class="flex items-center justify-between px-3 py-2.5 mb-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs">
        <span class="text-gray-400 font-medium">Total de Gastos ${activeFilter === 'Todos' ? 'del Mes' : `de ${activeFilter}`}:</span>
        <span class="font-extrabold text-indigo-400 text-sm">$${formatMonto(totalFiltrado)}</span>
      </div>

      <div class="space-y-3">
        ${filteredGastos.length === 0 ? `
          <div class="glass-card rounded-xl p-8 text-center border border-white/5 animate-fade-in">
            <svg class="icon text-gray-500 w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p class="text-gray-400 text-sm">No hay gastos para este filtro.</p>
            ${!isMonthClosed && activeFilter === 'Todos' ? '<p class="text-gray-500 text-xs mt-1">Completá el formulario para agregar uno.</p>' : ''}
          </div>
        ` : filteredGastos.map(g => {
          const colors = {
            'Paola': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            'Angelina': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'Macarena': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'Denise': 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          };
          const badgeColor = colors[g.pagadoPor] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

          return `
            <div class="glass-card rounded-xl p-4 border border-white/5 flex items-center justify-between animate-fade-in">
              <div class="flex-1 pr-4">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-semibold rounded px-2 py-0.5 border ${badgeColor}">
                    ${g.pagadoPor}
                  </span>
                  <span class="text-3xs text-gray-500">
                    ${formatFechaSimple(g.fecha)}
                  </span>
                  ${g.cerrado ? `
                    <span class="text-3xs bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5">
                      Cerrado
                    </span>
                  ` : ''}
                </div>
                <h3 class="font-bold text-white text-sm truncate">${g.nombre}</h3>
              </div>
              
              <div class="flex items-center gap-4">
                <span class="font-extrabold text-white text-base">$${formatMonto(g.monto)}</span>
                ${!isMonthClosed ? `
                  <button 
                    class="btn-delete-gasto p-2 hover:bg-rose-500/15 rounded-lg text-gray-500 hover:text-rose-400 active:scale-95 transition-all"
                    data-id="${g.id}"
                    title="Eliminar gasto"
                  >
                    <svg class="icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Configurar botones de filtro (pills)
    const pills = listContainer.querySelectorAll('.pill-filter');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        activeFilter = pill.getAttribute('data-filter');
        renderContent(lastExpensesList);
      });
    });

    // Configurar botones de eliminación
    if (!isMonthClosed) {
      const deleteBtns = listContainer.querySelectorAll('.btn-delete-gasto');
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (await window.appConfirm('Eliminar Gasto', "¿Estás seguro de que querés eliminar este gasto?")) {
            try {
              await db.deleteGasto(id);
            } catch (err) {
              console.error("Error al eliminar gasto:", err);
              await window.appAlert('Error', "No se pudo eliminar el gasto.");
            }
          }
        });
      });
    }
  }

  // Establece la suscripción a los gastos del mes seleccionado
  function setupExpensesSubscription() {
    if (unsubscribeExpenses) unsubscribeExpenses();

    unsubscribeExpenses = db.subscribeGastos(selectedMonth, (gastos) => {
      renderContent(gastos);
    });
  }

  // Escucha todos los gastos para actualizar el dropdown de meses disponibles
  unsubscribeAll = db.subscribeAllGastos((allGastos) => {
    // Obtener meses únicos con gastos
    const monthsSet = new Set(allGastos.map(g => g.mes));
    // Asegurarse de que el mes activo actual esté en la lista
    monthsSet.add(state.currentMonth);
    
    // Convertir a array y ordenar
    availableMonths = Array.from(monthsSet).sort();

    // Actualizar dropdown selector
    renderSelector();
  });

  // Suscribirse a los gastos iniciales del mes seleccionado
  setupExpensesSubscription();

  return () => {
    if (unsubscribeExpenses) unsubscribeExpenses();
    if (unsubscribeAll) unsubscribeAll();
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
  if (!mesStr) return '';
  const [year, month] = mesStr.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

function formatFechaSimple(fechaStr) {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-');
  return `${day}/${month}`;
}
