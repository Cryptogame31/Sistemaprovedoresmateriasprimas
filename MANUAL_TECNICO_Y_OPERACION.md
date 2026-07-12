# Manual Técnico y de Operación - Gestor de Materias Primas y Proveedores

## 1. Descripción General
Este proyecto es una aplicación web (Single Page Application) diseñada para gestionar proveedores, materias primas y su documentación asociada (Fichas técnicas, certificados, actas, etc.). 
La aplicación fue migrada recientemente a un entorno basado en **Firebase (Firestore y Storage)** para el almacenamiento de datos en la nube, reemplazando un sistema de base de datos local JSON, lo que permite operar de manera escalable y sincronizada.

---

## 2. Manual Técnico

### 2.1. Arquitectura y Tecnologías
*   **Frontend**: HTML5, CSS3 (con variables personalizadas para diseño UI/UX), JavaScript (ES6+).
*   **Backend (Servidor de Desarrollo Local)**: Un script de PowerShell (`scripts/server.ps1`) que expone los archivos estáticos en un servidor HTTP local (`http://localhost:8080`).
*   **Base de Datos**: Firebase Firestore (Colecciones `materias_primas` y `config`).
*   **Almacenamiento de Archivos**: Firebase Storage (Para almacenar PDFs e imágenes).
*   **Autenticación**: (Actualmente acceso directo, se apoya en reglas de seguridad de Firebase).

### 2.2. Estructura del Proyecto (Carpetas y Archivos Principales)
*   `index.html`: Interfaz de usuario principal.
*   `style.css`: Estilos visuales de la aplicación.
*   `firebase-config.js`: Configuración y credenciales de acceso a Firebase. Inicializa los SDK.
*   `firebase-app.js`: Contiene la lógica de negocio, manejo de eventos de la interfaz, y operaciones CRUD directas contra Firebase.
*   `data.json`: Archivo de base de datos local original (Respaldado por razones históricas).
*   `scripts/`:
    *   `server.ps1`: Servidor HTTP ligero en PowerShell para entorno de desarrollo/local.
    *   `migrate_to_firebase.js`: Script Node.js que se usó para subir la data.json inicial a Firestore.
    *   `upload_existing_files.js`: Script híbrido de subida masiva de archivos.

### 2.3. Requisitos Previos para otro PC
1.  **Sistema Operativo**: Windows 10/11.
2.  **PowerShell**: Viene preinstalado en Windows. Se debe permitir la ejecución de scripts (`Set-ExecutionPolicy Bypass -Scope CurrentUser`).
3.  (Opcional) **Node.js**: Solo si se desean ejecutar scripts administrativos de la carpeta `/scripts`. No es requerido para usar la aplicación.

---

## 3. Manual de Operación

### 3.1. ¿Cómo iniciar la aplicación?
1.  Abre la carpeta del proyecto.
2.  Haz clic derecho sobre el archivo `scripts/server.ps1` y selecciona **"Ejecutar con PowerShell"**.
3.  Mantén abierta la ventana negra/azul de PowerShell que aparecerá. (Esta ventana es el servidor).
4.  Abre tu navegador web (Chrome, Edge, Firefox) y entra a: `http://localhost:8080`

### 3.2. Uso del Sistema
*   **Vista Principal (Planilla)**: Muestra una tabla con todos los proveedores categorizados. Puedes usar los filtros en la parte superior para buscar por carpeta, proveedor o estado de documentación.
*   **Catálogos (Configuración)**: Permite añadir, editar o eliminar los tipos de carpetas, listas de proveedores, distribuidores y fabricantes para que aparezcan en los menús desplegables.
*   **Añadir Materia Prima**: Haz clic en el botón flotante (+) para registrar una nueva materia prima y vincularla a un proveedor.
*   **Gestión de Archivos**: 
    1. Haz clic en cualquier fila de la tabla para abrir el panel lateral de detalles.
    2. En el panel, verás los documentos asociados (Fichas Técnicas, Actas, etc.).
    3. Usa la opción "Subir Documento" para cargar un nuevo archivo PDF o imagen. (Estos se guardarán directamente en Firebase Storage).

### 3.3. Solución de Problemas Comunes
*   *La página no carga*: Asegúrate de que el script `server.ps1` esté en ejecución.
*   *Cambios no se guardan*: Revisa tu conexión a internet, ya que la aplicación ahora lee y escribe directamente en la base de datos en la nube (Firebase).
*   *Archivos viejos no se visualizan*: Durante la migración algunos archivos físicos locales que no se pudieron cargar masivamente por fallas del "bucket" requerirán ser resubidos manualmente vía la interfaz si no se finalizó el script automático.

---
*Nota: Este proyecto fue configurado para ser "Cloud-First". Mientras tengas los archivos fuente locales servidos y acceso a internet, tu progreso se guardará de forma segura en la nube.*
