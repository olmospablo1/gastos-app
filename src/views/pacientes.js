import { db } from '../firebase.js';

export function mountPacientes(container, state) {
  let unsubscribePacientes = null;
  let unsubscribeDeudas = null;

  let activeTab = 'sesiones'; // 'sesiones' | 'pacientes'
  let activeFilter = 'Todos'; // 'Todos' | 'Debe' | 'Pagado'
  let searchQuery = '';

  let listPacientes = [];
  let listDeudas = [];

  const emailProfesor = state.user?.email;

  if (!emailProfesor) {
    container.innerHTML = `
      <div class="p-6 text-center text-rose-400">
        <p class="font-bold">Error de Autenticación</p>
        <p class="text-xs text-gray-500 mt-2">Por favor, iniciá sesión nuevamente.</p>
      </div>
    `;
    return () => {};
  }

  // Estructura básica de la vista
  container.innerHTML = `
    <div class="view-container max-w-lg mx-auto pb-24 px-4 pt-6">
      <!-- Encabezado -->
      <div class="mb-6">
        <h1 class="text-3xl font-extrabold text-white">Mis Pacientes</h1>
        <p class="text-gray-400 text-sm mt-1">Gestión privada de pacientes y cobros de sesiones.</p>
      </div>

      <!-- Pestañas (Tabs) -->
      <div class="flex border-b border-white/5 mb-6">
        <button id="btn-tab-sesiones" class="flex-1 py-3 text-sm font-semibold transition-all border-b-2 focus:outline-none cursor-pointer">
          Sesiones
        </button>
        <button id="btn-tab-pacientes" class="flex-1 py-3 text-sm font-semibold transition-all border-b-2 focus:outline-none cursor-pointer">
          Pacientes
        </button>
      </div>

      <!-- Contenedor dinámico de la pestaña activa -->
      <div id="pacientes-tab-content"></div>
    </div>
  `;

  const btnTabSesiones = container.querySelector('#btn-tab-sesiones');
  const btnTabPacientes = container.querySelector('#btn-tab-pacientes');
  const tabContent = container.querySelector('#pacientes-tab-content');

  // Configurar listeners de las pestañas principales
  btnTabSesiones.addEventListener('click', () => switchTab('sesiones'));
  btnTabPacientes.addEventListener('click', () => switchTab('pacientes'));

  function switchTab(tabName) {
    activeTab = tabName;
    
    // Actualizar estilos visuales de las pestañas
    if (activeTab === 'sesiones') {
      btnTabSesiones.classList.add('border-indigo-500', 'text-indigo-400', 'font-bold');
      btnTabSesiones.classList.remove('border-transparent', 'text-gray-400');
      btnTabPacientes.classList.add('border-transparent', 'text-gray-400');
      btnTabPacientes.classList.remove('border-indigo-500', 'text-indigo-400', 'font-bold');
    } else {
      btnTabPacientes.classList.add('border-indigo-500', 'text-indigo-400', 'font-bold');
      btnTabPacientes.classList.remove('border-transparent', 'text-gray-400');
      btnTabSesiones.classList.add('border-transparent', 'text-gray-400');
      btnTabSesiones.classList.remove('border-indigo-500', 'text-indigo-400', 'font-bold');
    }

    renderActiveTab();
  }

  function renderActiveTab() {
    if (activeTab === 'sesiones') {
      renderTabSesiones();
    } else {
      renderTabPacientes();
    }
  }

  // --- RENDEREAR PESTAÑA: SESIONES ---
  function renderTabSesiones() {
    // Para las deudas, el total recaudado sumará todos los montos de estado Pagado más el monto_pagado parcial de las que están en Debe
    const totalCobrado = listDeudas.reduce((sum, d) => {
      if (d.estado === 'Pagado') return sum + Number(d.monto);
      return sum + Number(d.monto_pagado || 0);
    }, 0);

    // El total adeudado resta el monto_pagado parcial de las sesiones en Debe
    const totalAdeudado = listDeudas.filter(d => d.estado === 'Debe').reduce((sum, d) => {
      const rest = Number(d.monto) - Number(d.monto_pagado || 0);
      return sum + rest;
    }, 0);

    tabContent.innerHTML = `
      <!-- Formulario para Registrar Nueva Sesión -->
      <div class="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden mb-8 animate-fade-in">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
          Nueva Sesión / Cobro
        </h2>

        <form id="form-nueva-sesion" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="sesion-paciente">Paciente</label>
            <select id="sesion-paciente" class="w-full glass-input rounded-xl px-3 py-3 text-sm focus:outline-none appearance-none" required>
              <option value="" disabled selected>Elegir paciente...</option>
              ${listPacientes.map(p => `
                <option value="${p.id}" data-nombre="${p.nombre} ${p.apellido}">
                  ${p.apellido}, ${p.nombre}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="sesion-monto">Monto ($)</label>
              <input type="number" id="sesion-monto" placeholder="0" min="1" class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none" required />
            </div>
            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="sesion-estado">Estado de Pago</label>
              <select id="sesion-estado" class="w-full glass-input rounded-xl px-3 py-3 text-sm focus:outline-none appearance-none" required>
                <option value="Debe" selected>Debe</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="sesion-fecha">Fecha de Sesión</label>
            <input type="date" id="sesion-fecha" class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none" required />
          </div>

          <button type="submit" class="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Registrar Sesión
          </button>
        </form>
      </div>

      <!-- Buscador y Pills de Filtro -->
      <div class="mb-6 space-y-4">
        <!-- Buscador -->
        <div class="relative">
          <input 
            type="text" 
            id="buscador-pacientes" 
            placeholder="Buscar paciente por nombre..." 
            value="${searchQuery}"
            class="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
          />
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg class="icon w-5 h-5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        <!-- Pills de Filtro -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          ${['Todos', 'Debe', 'Pagado'].map(filterName => {
            const isActive = activeFilter === filterName;
            const activeClass = isActive 
              ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' 
              : 'border-white/10 text-gray-400 bg-white/2 hover:border-white/20';
            return `
              <button 
                class="pill-deuda-filter text-xs px-4 py-1.5 rounded-full border transition-all shrink-0 active:scale-95 cursor-pointer ${activeClass}" 
                data-filter="${filterName}"
              >
                ${filterName}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Resumen Financiero del Profesional -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="glass-card rounded-xl p-3 border border-emerald-500/10 bg-emerald-500/5">
          <p class="text-3xs uppercase tracking-wider text-emerald-400 font-semibold mb-0.5">Recaudado</p>
          <p class="text-lg font-extrabold text-white">$${formatMonto(totalCobrado)}</p>
        </div>
        <div class="glass-card rounded-xl p-3 border border-rose-500/10 bg-rose-500/5">
          <p class="text-3xs uppercase tracking-wider text-rose-400 font-semibold mb-0.5">Por Cobrar</p>
          <p class="text-lg font-extrabold text-white">$${formatMonto(totalAdeudado)}</p>
        </div>
      </div>

      <!-- Listado de Deudas -->
      <div class="space-y-3" id="lista-deudas-container">
        <!-- Renderizado dinámico de la lista de deudas -->
      </div>
    `;

    // Setea fecha por defecto (hoy)
    const inputFecha = tabContent.querySelector('#sesion-fecha');
    if (inputFecha) {
      inputFecha.value = new Date().toISOString().split('T')[0];
    }

    // Configurar listener para el formulario de registrar sesión
    const formSesion = tabContent.querySelector('#form-nueva-sesion');
    if (formSesion) {
      formSesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const select = formSesion.querySelector('#sesion-paciente');
        const selectedOption = select.options[select.selectedIndex];
        
        const idPaciente = select.value;
        const nombrePaciente = selectedOption.getAttribute('data-nombre');
        const monto = parseFloat(formSesion.querySelector('#sesion-monto').value);
        const estado = formSesion.querySelector('#sesion-estado').value;
        const fecha = formSesion.querySelector('#sesion-fecha').value;

        const nuevaDeuda = {
          id_paciente: idPaciente,
          nombre_paciente: nombrePaciente,
          monto,
          estado,
          fecha,
          id_profesional: emailProfesor
        };

        const btnSubmit = formSesion.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Registrando...';

        try {
          await db.addDeudaPaciente(nuevaDeuda);
          formSesion.reset();
          inputFecha.value = new Date().toISOString().split('T')[0];
        } catch (error) {
          console.error("Error al registrar sesión:", error);
          alert("Error al registrar la sesión.");
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Registrar Sesión
          `;
        }
      });
    }

    // Configurar buscador
    const buscador = tabContent.querySelector('#buscador-pacientes');
    if (buscador) {
      buscador.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        updateDeudasFilteredList();
      });
    }

    // Configurar pills de filtro
    const pills = tabContent.querySelectorAll('.pill-deuda-filter');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        activeFilter = pill.getAttribute('data-filter');
        // Actualizar UI activa de pills
        pills.forEach(p => {
          p.classList.remove('bg-indigo-600', 'border-indigo-600', 'text-white', 'font-bold');
          p.classList.add('border-white/10', 'text-gray-400', 'bg-white/2');
        });
        pill.classList.remove('border-white/10', 'text-gray-400', 'bg-white/2');
        pill.classList.add('bg-indigo-600', 'border-indigo-600', 'text-white', 'font-bold');

        updateDeudasFilteredList();
      });
    });

    // Iniciar renderizado inicial del listado filtrado
    updateDeudasFilteredList();
  }

  function updateDeudasFilteredList() {
    const listContainer = tabContent.querySelector('#lista-deudas-container');
    if (!listContainer) return;

    let filtered = listDeudas;

    // Filtro por Pill (Estado)
    if (activeFilter !== 'Todos') {
      filtered = filtered.filter(d => d.estado === activeFilter);
    }

    // Filtro por Buscador (Nombre)
    if (searchQuery !== '') {
      filtered = filtered.filter(d => d.nombre_paciente.toLowerCase().includes(searchQuery));
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-card rounded-xl p-8 text-center border border-white/5 animate-fade-in">
          <svg class="icon text-gray-500 w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p class="text-gray-400 text-sm">No se encontraron sesiones registradas.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(d => {
      const isPaid = d.estado === 'Pagado';
      const badgeClass = isPaid
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 cursor-pointer';
      
      const titleTooltip = isPaid ? 'Cobrado' : 'Click para marcar como Pagado';
      const montoTotal = Number(d.monto);
      const montoYaPagado = Number(d.monto_pagado || 0);
      const resta = montoTotal - montoYaPagado;

      const detailPago = (!isPaid && montoYaPagado > 0)
        ? `<span class="text-[10px] text-rose-400 font-semibold block mt-1">(Resta $${formatMonto(resta)} de $${formatMonto(montoTotal)})</span>`
        : '';

      return `
        <div class="glass-card rounded-xl p-4 border border-white/5 flex items-center justify-between animate-fade-in relative overflow-hidden">
          <div class="flex-1 pr-4">
            <div class="flex items-center gap-2 mb-1">
              <span 
                class="badge-estado text-3xs font-semibold rounded px-2 py-0.5 border transition-all ${badgeClass}" 
                data-id="${d.id}"
                data-estado="${d.estado}"
                data-monto="${montoTotal}"
                title="${titleTooltip}"
              >
                ${d.estado}
              </span>
              <span class="text-3xs text-gray-500">
                ${formatFechaSimple(d.fecha)}
              </span>
            </div>
            <h3 class="font-bold text-white text-sm truncate">${d.nombre_paciente}</h3>
            ${detailPago}
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="font-extrabold text-white text-base block">$${formatMonto(montoTotal)}</span>
            </div>
            <div class="flex items-center gap-1.5">
              ${!isPaid ? `
                <button 
                  class="btn-cobrar-deuda-rapida p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                  data-id="${d.id}"
                  data-nombre="${d.nombre_paciente}"
                  data-monto-total="${montoTotal}"
                  data-resta="${resta}"
                  title="Cobrar sesión (Marcar como Pagado)"
                >
                  <svg class="icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              ` : ''}
              <button 
                class="btn-delete-deuda p-2 hover:bg-rose-500/15 rounded-lg text-gray-500 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
                data-id="${d.id}"
                title="Eliminar sesión"
              >
                <svg class="icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Configurar listener para alternar estado abriendo modal de confirmación
    const badges = listContainer.querySelectorAll('.badge-estado');
    badges.forEach(badge => {
      badge.addEventListener('click', () => {
        const id = badge.getAttribute('data-id');
        const estadoActual = badge.getAttribute('data-estado');
        if (estadoActual === 'Debe') {
          const card = badge.closest('.glass-card');
          const checkBtn = card.querySelector('.btn-cobrar-deuda-rapida');
          if (checkBtn) {
            const nombre = checkBtn.getAttribute('data-nombre');
            const montoTotal = Number(checkBtn.getAttribute('data-monto-total'));
            const resta = Number(checkBtn.getAttribute('data-resta'));
            openConfirmacionPagoModal(id, nombre, resta, montoTotal);
          }
        }
      });
    });

    // Configurar listener para el botón de acción rápida de cobrar
    const cobrarBtns = listContainer.querySelectorAll('.btn-cobrar-deuda-rapida');
    cobrarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');
        const montoTotal = Number(btn.getAttribute('data-monto-total'));
        const resta = Number(btn.getAttribute('data-resta'));
        openConfirmacionPagoModal(id, nombre, resta, montoTotal);
      });
    });

    // Configurar listener para eliminar sesión
    const deleteBtns = listContainer.querySelectorAll('.btn-delete-deuda');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm("¿Estás seguro de que querés eliminar el registro de esta sesión?")) {
          try {
            await db.deleteDeudaPaciente(id);
          } catch (error) {
            console.error("Error al eliminar sesión:", error);
            alert("No se pudo eliminar el registro.");
          }
        }
      });
    });
  }

  // --- RENDEREAR PESTAÑA: PACIENTES ---
  function renderTabPacientes() {
    tabContent.innerHTML = `
      <!-- Formulario para Registrar Nuevo Paciente -->
      <div class="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden mb-8 animate-fade-in">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Nuevo Paciente
        </h2>

        <form id="form-nuevo-paciente" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="paciente-nombre">Nombre</label>
              <input type="text" id="paciente-nombre" placeholder="Ej. Juan" class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none" required />
            </div>
            <div>
              <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="paciente-apellido">Apellido</label>
              <input type="text" id="paciente-apellido" placeholder="Ej. Pérez" class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none" required />
            </div>
          </div>

          <div>
            <label class="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5" for="paciente-telefono">Teléfono (Celular)</label>
            <input type="tel" id="paciente-telefono" placeholder="Ej. 3416554433" class="w-full glass-input rounded-xl px-4 py-3 text-sm focus:outline-none" required />
          </div>

          <button type="submit" class="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Agregar Paciente
          </button>
        </form>
      </div>

      <!-- Listado de Pacientes del Profesional -->
      <h2 class="text-xl font-bold text-white mb-4 flex items-center justify-between">
        <span class="flex items-center gap-2">
          <svg class="icon text-indigo-400 w-5 h-5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Mis Pacientes
        </span>
        <span class="text-xs font-medium text-gray-400">${listPacientes.length} activos</span>
      </h2>

      <div class="space-y-3" id="lista-pacientes-container">
        <!-- Renderizado dinámico de la lista de pacientes -->
      </div>
    `;

    // Configurar listener para el formulario de registrar paciente
    const formPaciente = tabContent.querySelector('#form-nuevo-paciente');
    if (formPaciente) {
      formPaciente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = formPaciente.querySelector('#paciente-nombre').value.trim();
        const apellido = formPaciente.querySelector('#paciente-apellido').value.trim();
        const telefono = formPaciente.querySelector('#paciente-telefono').value.trim();

        const nuevoPaciente = {
          nombre,
          apellido,
          telefono,
          id_profesional: emailProfesor
        };

        const btnSubmit = formPaciente.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Guardando...';

        try {
          await db.addPaciente(nuevoPaciente);
          formPaciente.reset();
        } catch (error) {
          console.error("Error al registrar paciente:", error);
          alert("Error al registrar paciente.");
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Agregar Paciente
          `;
        }
      });
    }

    updatePacientesList();
  }

  function updatePacientesList() {
    const listContainer = tabContent.querySelector('#lista-pacientes-container');
    if (!listContainer) return;

    if (listPacientes.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-card rounded-xl p-8 text-center border border-white/5 animate-fade-in">
          <svg class="icon text-gray-500 w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          <p class="text-gray-400 text-sm">Aún no registraste pacientes.</p>
          <p class="text-gray-500 text-xs mt-1">Completá el formulario superior para añadir uno.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = listPacientes.map(p => {
      // Calcular deuda total acumulada
      const deudasPaciente = listDeudas.filter(d => d.id_paciente === p.id && d.estado === 'Debe');
      const totalDeuda = deudasPaciente.reduce((sum, d) => {
        const rest = Number(d.monto) - Number(d.monto_pagado || 0);
        return sum + rest;
      }, 0);

      // Formatear enlace de whatsapp o teléfono
      const cleanPhone = p.telefono.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}`;

      const debtBadge = totalDeuda > 0
        ? `
          <button 
            class="btn-pagar-deuda px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 text-3xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer ml-2 shrink-0"
            data-id="${p.id}"
            data-nombre="${p.nombre} ${p.apellido}"
            data-deuda="${totalDeuda}"
            title="Registrar cobro de deuda"
          >
            Debe: $${formatMonto(totalDeuda)}
          </button>
        `
        : `
          <span class="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xs font-semibold rounded-lg ml-2 shrink-0">
            Al día
          </span>
        `;

      return `
        <div class="glass-card rounded-xl p-4 border border-white/5 flex items-center justify-between animate-fade-in">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 flex-wrap">
              <h3 class="font-bold text-white text-base truncate max-w-[170px]">${p.apellido}, ${p.nombre}</h3>
              ${debtBadge}
            </div>
            <p class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <svg class="icon w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span class="truncate">${p.telefono}</span>
            </p>
          </div>

          <div class="flex items-center gap-2 ml-3 shrink-0">
            <button 
              class="btn-editar-paciente p-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 rounded-xl active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              data-id="${p.id}"
              data-nombre="${p.nombre}"
              data-apellido="${p.apellido}"
              data-telefono="${p.telefono}"
              title="Editar datos del paciente"
            >
              <svg class="icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            <a 
              href="${whatsappUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Enviar mensaje por WhatsApp"
            >
              <svg class="icon w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span class="text-3xs font-semibold">WhatsApp</span>
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Configurar listener para abrir modal de pago de deuda
    const payBtns = listContainer.querySelectorAll('.btn-pagar-deuda');
    payBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idPaciente = btn.getAttribute('data-id');
        const nombrePaciente = btn.getAttribute('data-nombre');
        const deuda = Number(btn.getAttribute('data-deuda'));
        openPaymentModal(idPaciente, nombrePaciente, deuda);
      });
    });

    // Configurar listener para abrir modal de edición de paciente
    const editBtns = listContainer.querySelectorAll('.btn-editar-paciente');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idPaciente = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');
        const apellido = btn.getAttribute('data-apellido');
        const telefono = btn.getAttribute('data-telefono');
        openEditPacienteModal(idPaciente, nombre, apellido, telefono);
      });
    });
  }

  function openPaymentModal(idPaciente, nombrePaciente, deuda) {
    // Eliminar modal anterior si existe
    const oldModal = document.getElementById('modal-abono');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-abono';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass-card rounded-2xl w-full max-w-xs p-5 border border-white/10 relative overflow-hidden animate-fade-in shadow-2xl">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-4.5 h-4.5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Registrar Pago / Abono
        </h3>
        <p class="text-3xs text-gray-400 mb-3.5">Ingresá el monto cobrado para saldar la deuda acumulada.</p>
        
        <div class="p-3 mb-4 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
          <p class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Paciente</p>
          <p class="text-xs font-bold text-white truncate">${nombrePaciente}</p>
          <p class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mt-2">Deuda total acumulada</p>
          <p class="text-sm font-extrabold text-rose-400">$${formatMonto(deuda)}</p>
        </div>

        <form id="form-modal-pago" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1.5" for="abono-monto">Monto a Cobrar ($)</label>
            <input 
              type="number" 
              id="abono-monto" 
              value="${deuda}"
              min="1" 
              max="${deuda}"
              class="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none" 
              required 
            />
          </div>

          <div class="flex gap-2.5 pt-1.5">
            <button 
              type="button" 
              id="btn-cancelar-abono" 
              class="flex-1 py-2.5 border border-white/10 hover:border-white/20 text-gray-300 text-3xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-3xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Registrar
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const btnCancel = modal.querySelector('#btn-cancelar-abono');
    btnCancel.addEventListener('click', () => modal.remove());

    const form = modal.querySelector('#form-modal-pago');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const abonoMonto = parseFloat(form.querySelector('#abono-monto').value);

      const btnSubmit = form.querySelector('button[type="submit"]');
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Procesando...';

      try {
        await db.registrarPagoPaciente(idPaciente, abonoMonto);
        modal.remove();
        alert(`¡Pago de $${formatMonto(abonoMonto)} registrado con éxito!`);
      } catch (error) {
        console.error("Error al registrar pago:", error);
        alert("No se pudo procesar el pago.");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Registrar';
      }
    });
  }

  function openEditPacienteModal(idPaciente, nombre, apellido, telefono) {
    // Eliminar modal anterior si existe
    const oldModal = document.getElementById('modal-edit-paciente');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-edit-paciente';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass-card rounded-2xl w-full max-w-xs p-5 border border-white/10 relative overflow-hidden animate-fade-in shadow-2xl">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg class="icon text-indigo-400 w-4.5 h-4.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Editar Paciente
        </h3>
        <p class="text-3xs text-gray-400 mb-4">Actualizá los datos de contacto del paciente.</p>
        
        <form id="form-modal-edit-paciente" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1.5" for="edit-nombre">Nombre</label>
              <input type="text" id="edit-nombre" value="${nombre}" class="w-full glass-input rounded-xl px-3 py-2 text-xs focus:outline-none" required />
            </div>
            <div>
              <label class="block text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1.5" for="edit-apellido">Apellido</label>
              <input type="text" id="edit-apellido" value="${apellido}" class="w-full glass-input rounded-xl px-3 py-2 text-xs focus:outline-none" required />
            </div>
          </div>

          <div>
            <label class="block text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1.5" for="edit-telefono">Teléfono (Celular)</label>
            <input type="tel" id="edit-telefono" value="${telefono}" class="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none" required />
          </div>

          <div class="flex gap-2.5 pt-1.5">
            <button 
              type="button" 
              id="btn-cancelar-edit" 
              class="flex-1 py-2.5 border border-white/10 hover:border-white/20 text-gray-300 text-3xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-3xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const btnCancel = modal.querySelector('#btn-cancelar-edit');
    btnCancel.addEventListener('click', () => modal.remove());

    const form = modal.querySelector('#form-modal-edit-paciente');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevoNombre = form.querySelector('#edit-nombre').value.trim();
      const nuevoApellido = form.querySelector('#edit-apellido').value.trim();
      const nuevoTelefono = form.querySelector('#edit-telefono').value.trim();

      const btnSubmit = form.querySelector('button[type="submit"]');
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Guardando...';

      try {
        await db.updatePaciente(idPaciente, {
          nombre: nuevoNombre,
          apellido: nuevoApellido,
          telefono: nuevoTelefono
        });
        modal.remove();
        alert('Datos del paciente actualizados con éxito.');
      } catch (error) {
        console.error("Error al actualizar paciente:", error);
        alert("No se pudieron guardar los cambios.");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Guardar';
      }
    });
  }

  function openConfirmacionPagoModal(idDeuda, nombrePaciente, montoCobrar, montoTotal) {
    // Eliminar modal anterior si existe
    const oldModal = document.getElementById('modal-confirmacion-pago');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirmacion-pago';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="glass-card rounded-2xl w-full max-w-xs p-5 border border-white/10 relative overflow-hidden animate-fade-in shadow-2xl">
        <div class="absolute -right-12 -bottom-12 w-28 h-28 bg-emerald-600/10 rounded-full blur-2xl"></div>
        <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg class="icon text-emerald-400 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Confirmar Cobro
        </h3>
        <p class="text-xs text-gray-300 mb-4 font-medium leading-relaxed">
          ¿Confirmas que el paciente <span class="font-extrabold text-white">${nombrePaciente}</span> ya abonó los <span class="font-extrabold text-emerald-400">$${formatMonto(montoCobrar)}</span> de esta sesión?
        </p>
        
        <div class="flex gap-2.5 pt-1.5">
          <button 
            type="button" 
            id="btn-cancelar-cobro-modal" 
            class="flex-1 py-2.5 border border-white/10 hover:border-white/20 text-gray-300 text-3xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button"
            id="btn-confirmar-cobro-modal"
            class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-3xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            Sí, Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const btnCancel = modal.querySelector('#btn-cancelar-cobro-modal');
    btnCancel.addEventListener('click', () => modal.remove());

    const btnConfirm = modal.querySelector('#btn-confirmar-cobro-modal');
    btnConfirm.addEventListener('click', async () => {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = 'Confirmando...';

      try {
        await db.updateDeudaEstado(idDeuda, 'Pagado', montoTotal);
        modal.remove();
      } catch (error) {
        console.error("Error al confirmar pago:", error);
        alert("No se pudo registrar el pago.");
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = 'Sí, Confirmar';
      }
    });
  }

  // --- ESCUCHA DE DATOS EN TIEMPO REAL ---
  unsubscribePacientes = db.subscribePacientes(emailProfesor, (pacientes) => {
    listPacientes = pacientes;
    if (activeTab === 'pacientes') {
      updatePacientesList();
    } else if (activeTab === 'sesiones') {
      const select = tabContent.querySelector('#sesion-paciente');
      if (select) {
        const valActual = select.value;
        select.innerHTML = `
          <option value="" disabled ${!valActual ? 'selected' : ''}>Elegir paciente...</option>
          ${listPacientes.map(p => `
            <option value="${p.id}" data-nombre="${p.nombre} ${p.apellido}" ${p.id === valActual ? 'selected' : ''}>
              ${p.apellido}, ${p.nombre}
            </option>
          `).join('')}
        `;
      }
    }
  });

  unsubscribeDeudas = db.subscribeDeudasPacientes(emailProfesor, (deudas) => {
    listDeudas = deudas;
    if (activeTab === 'sesiones') {
      renderTabSesiones();
    } else if (activeTab === 'pacientes') {
      updatePacientesList();
    }
  });

  // Mostrar pestaña inicial
  switchTab('sesiones');

  return () => {
    if (unsubscribePacientes) unsubscribePacientes();
    if (unsubscribeDeudas) unsubscribeDeudas();
  };
}

// Helpers locales
function formatMonto(monto) {
  return Number(monto).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatFechaSimple(fechaStr) {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}
