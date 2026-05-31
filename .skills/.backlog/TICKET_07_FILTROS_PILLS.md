# TICKET 07: Filtros de Usuario (Pills) y UX de Listas

**Objetivo:** Permitir filtrar los gastos por persona en tiempo real utilizando una interfaz de pastillas (pills) optimizada para móviles.

### 1. Prompt para Antigravity:
> "Mejorá las pantallas de `servicios.html` (mes actual) e `historial.html` (detalle de mes cerrado) con filtros de usuario.
> 1. Insertá una barra de navegación horizontal con 'Pills' (botones redondeados) arriba de las listas de gastos.
> 2. Las opciones deben ser: 'Todos', 'Paola', 'Angie', 'Socio 3', 'Socio 4'.
> 3. Al seleccionar una Pill:
>    - Cambiá su estilo visual (ej: fondo azul para la activa, borde gris para las inactivas).
>    - Filtrá el array de datos para mostrar solo los gastos de esa persona.
>    - Actualizá el total de dinero mostrado en pantalla para que coincida con el filtro seleccionado.
> 4. Si el filtro no arroja resultados, mostrá un mensaje: 'Esta persona aún no registró gastos'."

### 2. Criterios de Aceptación (QA):
* [ ] El scroll de las pills es horizontal y suave en el celular.
* [ ] Al tocar 'Todos', se limpia el filtro y se ve la suma total del mes.
* [ ] El filtro funciona correctamente tanto en los gastos vivos como en los archivados del historial.