# TICKET 01: Vinculación de Base de Datos y Control de Versiones

**Objetivo:** Conectar el código local con el repositorio de GitHub y enlazar la base de datos de Firebase.

### 1. Requisitos Previos (Paso a paso para el usuario)
1. **Crear Repo:** Entrá a GitHub y creá un repositorio nuevo llamado `consultorio-gastos` (vacío, sin README).
2. **Obtener URL:** Copiá la URL (ej: `https://github.com/tu-usuario/consultorio-gastos.git`).
3. **Firebase SDK:** En tu consola de Firebase, andá a "Configuración del proyecto" y buscá el objeto `firebaseConfig`.

### 2. Prompt para Antigravity:
> "Actuá como DevOps. Necesito vincular mi proyecto local con Firebase y Git.
> 1. Creá un archivo `.env` para guardar las credenciales de Firebase de forma segura.
> 2. Modificá `src/firebase.js` para que lea las variables de ese archivo `.env`.
> 3. Creá un archivo `.gitignore` que incluya `node_modules`, `.env` y `dist` para no subir basura al repo.
> 4. Generame una lista de comandos CLI para: 
>    - Inicializar Git local.
>    - Vincular el repo remoto de GitHub.
>    - Hacer el primer push.
>    - Instalar las dependencias de Firebase vía npm."

---

## 🛠 Guía paso a paso para ejecutar en tu Terminal (CLI)

Como no sos programador, seguí este orden exacto en la terminal de tu computadora (dentro de la carpeta del proyecto):

### Paso A: Conectar con Firebase
Para instalar la librería de Firebase, escribí esto:
```bash
npm install firebase