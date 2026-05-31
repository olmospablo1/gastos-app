# TICKET 01-B: Configuración Automática de Git y Repositorio

**Objetivo:** Inicializar el control de versiones, configurar exclusiones de seguridad y preparar el primer envío (push) al repositorio remoto.

### 1. Requisitos Previos (Usuario)
* Tener instalado Git en la computadora.
* Tener la URL del repositorio vacío creado en GitHub (ej: `https://github.com/usuario/repo.git`).

### 2. Prompt para Antigravity:
> "Actuá como experto en DevOps. Necesito configurar Git en este proyecto local.
> 1. Creá un archivo `.gitignore` robusto que excluya: `node_modules/`, `.env`, `dist/`, `.DS_Store` y carpetas de caché de IDEs.
> 2. Generá un script detallado (o ejecutá vía terminal si tenés permisos) para:
>    - `git init` (inicializar el repo).
>    - `git add .` (staged de archivos).
>    - `git commit -m 'chore: inicialización del proyecto y configuración de entorno'`.
>    - `git branch -M main` (asegurar rama principal).
> 3. Pedime la URL de mi repositorio de GitHub para ejecutar:
>    - `git remote add origin [URL]`.
>    - `git push -u origin main`.
> 4. Verificá que no se estén incluyendo archivos del sistema o carpetas pesadas en el commit."

### 3. Criterios de Aceptación (QA):
* [ ] El archivo `.gitignore` existe y oculta correctamente la carpeta `node_modules`.
* [ ] El comando `git status` muestra que el árbol de trabajo está limpio después del push.
* [ ] Los archivos aparecen reflejados en la web de GitHub.