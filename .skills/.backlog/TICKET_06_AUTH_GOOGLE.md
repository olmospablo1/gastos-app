# TICKET 06: Autenticación con Google y Seguridad

**Objetivo:** Restringir el acceso a la app mediante el login de Google y vincular la identidad del usuario con los registros de gastos.

### 1. Configuración Previa (QA/Usuario)
* Ir a Firebase Console > Authentication > Sign-in method.
* Habilitar el proveedor "Google".

### 2. Prompt para Antigravity:
> "Implementá Firebase Authentication con Google en el proyecto.
> 1. Creá un modal de bienvenida que aparezca si no hay un usuario logueado, con un botón 'Ingresar con Google'.
> 2. Al loguearse, guardá el objeto `user` en el estado de la app.
> 3. En el formulario de `servicios.html`, hacé que el campo 'Pagado por' se complete automáticamente con el nombre (`displayName`) o mail del usuario logueado.
> 4. Implementá un botón de 'Cerrar sesión' en la navegación o perfil.
> 5. Asegurá que ninguna pantalla (Dashboard, Servicios, Historial) sea visible si no hay una sesión activa (Redirección al login)."

### 3. Criterios de Aceptación (QA):
* [ ] No se puede acceder a la URL del Dashboard sin estar logueado.
* [ ] Al cargar un gasto, el nombre de la persona aparece por defecto.
* [ ] Al cerrar sesión, la app vuelve a la pantalla de ingreso.