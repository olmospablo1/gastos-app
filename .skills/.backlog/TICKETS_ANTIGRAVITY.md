# Backlog de Tickets - App Gastos Consultorio

## TICKET 01: Setup Inicial y Conexión Firebase
**Objetivo:** Crear la cáscara del proyecto y conectar con la DB.
**Prompt para Antigravity:**
> "Generá un proyecto web base usando Vite y Vanilla JS. 
> 1. Configurá el boilerplate de Firebase (v10+). 
> 2. Creá un archivo `src/firebase.js` que inicialice Firebase con constantes para las credenciales (API_KEY, PROJECT_ID, etc.). 
> 3. Instalá Tailwind CSS vía CDN en el `index.html`. 
> 4. Creá una estructura de carpetas: /src, /public."

---

## TICKET 02: Implementación de la Interfaz (3 Pantallas)
**Objetivo:** Tener los HTML listos para recibir datos.
**Prompt para Antigravity:**
> "Usando Tailwind CSS, creá tres archivos HTML (o componentes JS si usás SPA) basados en los prototipos:
> 1. `dashboard.html`: Resumen de saldos por persona.
> 2. `servicios.html`: Formulario para cargar gastos y lista del mes.
> 3. `historial.html`: Lista de meses cerrados.
> Asegurá que la navegación inferior (navbar) funcione para swappear entre vistas."

---

## TICKET 03: Lógica CRUD de Gastos
**Objetivo:** Que el formulario de 'Servicios' realmente guarde datos.
**Prompt para Antigravity:**
> "Conectá la pantalla `servicios.html` con Firestore.
> 1. Al enviar el formulario, guardá un doc en la colección 'gastos' con: {nombre, monto, pagadoPor, fecha, mes: '2026-05'}.
> 2. Implementá una función `renderGastos()` que use `onSnapshot` para mostrar los gastos del mes actual en tiempo real.
> 3. Agregá la función de eliminar un gasto por su ID."

---

## TICKET 04: Motor de Cálculo de Saldos
**Objetivo:** La magia matemática de la app.
**Prompt para Antigravity:**
> "En el `dashboard.html`, implementá la lógica de cálculo:
> 1. Consultá todos los gastos del mes actual.
> 2. Sumá el 'Total General'.
> 3. Dividí por 4 para obtener la 'Cuota Esperada'.
> 4. Por cada persona, restá lo que ya pagó de esa 'Cuota Esperada'.
> 5. Mostrá el resultado final (Debe pagar / A favor) en las tarjetas de cada usuario."

---

## TICKET 05: Proceso de Cierre de Mes
**Objetivo:** Archivar los datos y limpiar para el mes siguiente.
**Prompt para Antigravity:**
> "Creá la lógica de 'Cerrar Mes'.
> 1. Al presionar el botón de cierre, generá un snapshot de los saldos finales y guardalo en la colección 'cierres'.
> 2. Marcá los gastos de ese mes como 'cerrados' (edit=false).
> 3. La pantalla de Historial debe leer la colección 'cierres' y mostrar los resúmenes de meses pasados."