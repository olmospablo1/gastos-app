# TICKET 08: Despliegue a Producción (Firebase Hosting)

**Objetivo:** Subir la aplicación a la nube para que sea accesible desde una URL pública (web.app) y funcione en los celulares de todos los socios.

### 1. Requisitos Previos (Usuario)
* Tener instalado Node.js y npm.
* Estar logueado en la terminal con tu cuenta de Google donde creaste el proyecto de Firebase.

### 2. Prompt para Antigravity:
> "Actuá como DevOps. Vamos a realizar el deploy de la app a Firebase Hosting.
> 1. Guiame para instalar las `firebase-tools` de forma global si no las tengo.
> 2. Ayudame a ejecutar `firebase login` y `firebase init hosting`.
> 3. Durante el `init`, configuramos:
>    - Project Setup: Seleccionar el proyecto existente 'consultorio-gastos'.
>    - Public Directory: Si usamos Vite, la carpeta es `dist`. Si es HTML puro, es la carpeta raíz o `public`.
>    - Configure as a single-page app: Yes.
>    - Set up automatic builds and deploys with GitHub: Yes (para que cada vez que hagas un push a Git, se actualice la web sola).
> 4. Generá el comando para construir el proyecto (`npm run build`) y luego `firebase deploy`."

### 3. Criterios de Aceptación (QA):
* [ ] La terminal devuelve una 'Hosting URL' válida (ej: https://consultorio-gastos.web.app).
* [ ] Al entrar a la URL desde el celular, la app carga correctamente.
* [ ] Las funcionalidades de Firestore (carga de gastos) funcionan en el entorno de producción.