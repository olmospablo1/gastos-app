# TICKET 00: Inicialización de la Instancia de Cloud Firestore

**Objetivo:** Crear y activar la instancia de la base de datos Cloud Firestore desde la consola de Firebase para permitir la persistencia de datos.

### 1. Instrucciones de Configuración Manual (Paso a Paso en Consola)
1. En la pantalla que ves en `image_6eabf2.png`, hacé click en el botón naranja que dice **"Crear base de datos"**.
2. **Ubicación de la base de datos:** Elegí una región cercana (por ejemplo, `nam5 - us-central` o `southamerica-east1` si está disponible) y dale a Siguiente.
3. **Reglas de seguridad iniciales:** Seleccioná **"Comenzar en modo de prueba"** (Test Mode). Esto habilitará la lectura y escritura abierta por 30 días para que puedas probar la app localmente y en producción sin bloqueos mientras terminás de configurar todo.
4. Hacé click en **"Habilitar"** (o Crear) y esperá unos segundos a que se aprovisione la base de datos.

### 2. Prompt para Antigravity:
> "Actuá como DevOps. El usuario ya inicializó la instancia de Cloud Firestore en la consola de Firebase en 'Modo de Prueba'.
> 1. Verificá que el archivo `src/firebase.js` exporte correctamente la instancia de Firestore (`getFirestore()`).
> 2. Generá un script corto de prueba (ej: `test-db.js`) que intente insertar un documento de prueba en una colección llamada `test_conexion` para que el usuario pueda validar de forma local si la base de datos ya recibe datos.
> 3. Si contás con herramientas MCP, prepará el entorno de desarrollo para recibir el primer envío de datos."

### 3. Criterios de Aceptación (QA):
* [ ] La consola de Firebase ya no muestra la pantalla de bienvenida de `image_6eabf2.png`, sino el panel vacío con las pestañas 'Datos', 'Reglas', 'Índices'.
* [ ] Al ejecutar la app localmente e intentar registrar un servicio, no se visualizan errores de conexión en la consola del desarrollador (F12).