# TICKET 10: Módulo Privado de Gestión de Deudas de Pacientes

**Objetivo:** Crear un panel independiente y privado para que cada profesional pueda gestionar los pacientes de su consultorio y el estado de pago de sus sesiones.

### 1. Regla Crítica de Seguridad (Aislamiento)
* **BLOQUEANTE:** Un usuario logueado SOLO puede ver, editar o listar los pacientes y deudas donde el campo `id_profesional` coincida exactamente con su email de Firebase Auth (`request.auth.token.email`). Los datos NO se comparten entre los 4 socios.

### 2. Prompt para Antigravity:
> "Actuá como desarrollador fullstack. Vamos a agregar un módulo privado llamado 'Mis Pacientes' a la app existente.
> 1. Creá una nueva vista `pacientes.html` y agregala a la navegación inferior.
> 2. Implementá un formulario simple para dar de alta Pacientes con: Nombre, Apellido y Teléfono. Guardalos en la colección 'pacientes' vinculando el ID del usuario logueado.
> 3. Implementá un formulario para registrar una 'Nueva Sesión' donde se seleccione un paciente (de un desplegable), se ingrese el Monto ($), la Fecha de la sesión (selector de fecha) y el Estado (Debe / Pagado). Guardalo en 'deudas_pacientes'.
> 4. En la vista principal del módulo, mostrá la lista de deudas del mes. Agregá un buscador por nombre de paciente y 'Pills' para filtrar por estado ('Todos', 'Debe', 'Pagado').
> 5. Al tocar el estado 'Debe' de una tarjeta, debe permitir cambiarlo a 'Pagado' con un solo click."

### 3. Criterios de Aceptación (QA):
* [ ] Si Paola se loguea, ve a sus pacientes. Si Angie se loguea, ve una lista vacía (no ve los pacientes de Paola).
* [ ] El filtro de fechas y estados actualiza la lista en tiempo real.
* [ ] El selector de fecha permite elegir días pasados (por si registra la sesión al día siguiente).