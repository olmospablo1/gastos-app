# TICKET 11: Acción Rápida para Marcar como Pagado con Modal de Confirmación

**Objetivo:** Permitir a las profesionales cambiar el estado de una deuda a 'Pagado' directamente desde la lista de deudas de pacientes con un solo toque, previniendo clics accidentales mediante un modal de confirmación.

### 1. Requisitos de Interfaz (Mobile UX)
* En cada tarjeta de deuda que tenga el estado **'Debe'**, agregar un botón de acción rápida visualmente identificable (por ejemplo, un check verde o un botón que diga 'Cobrar').
* Si la deuda ya está en estado **'Pagado'**, este botón no debe mostrarse.

### 2. Prompt para Antigravity:
> "Actuá como desarrollador frontend senior. Vamos a implementar una mejora de usabilidad en el módulo de pacientes (`pacientes.html`).
> 1. En la lista de deudas, agregá un botón de acción rápida (puede ser un ícono `<i class='fas fa-check-circle text-green-500'></i>` o un badge interactivo) solo en las deudas que figuren como 'Debe'.
> 2. Al hacer clic en este botón, NO cambies el estado directamente; en su lugar, debés mostrar un **Modal de Confirmación nativo o un componente modal de Tailwind CSS**.
> 3. El modal debe preguntar: '¿Confirmas que el paciente [Nombre] ya abonó los $[Monto] de esta sesión?'. Debe incluir los botones 'Cancelar' y 'Sí, Confirmar'.
> 4. Si el usuario confirma, actualizá el documento correspondiente en la colección `deudas_pacientes` cambiando el campo `estado` a 'Pagado'.
> 5. Asegurá que la lista y los filtros se actualicen de inmediato gracias al listener en tiempo real (`onSnapshot`)."

### 3. Criterios de Aceptación (QA):
* [ ] El botón de acción rápida solo es visible en registros con estado 'Debe'.
* [ ] Al tocar el botón, aparece el modal bloqueando la pantalla trasera (overlay).
* [ ] Si se toca 'Cancelar', el modal se cierra y el estado de la deuda sigue intacto ('Debe').
* [ ] Si se toca 'Sí, Confirmar', el estado cambia a 'Pagado' en la base de datos, el botón desaparece de la tarjeta y la pill de filtros reacciona correctamente de forma inmediata.