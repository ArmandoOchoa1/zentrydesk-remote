# ZentryDesk Remote

Cliente de asistencia remota de [ZentryDesk](https://zentrydesk.com) (Backend Perú), basado en
[RustDesk](https://github.com/rustdesk/rustdesk) 1.4.9 y distribuido bajo la misma licencia **AGPL-3.0**.

Cambios respecto de RustDesk (todos en `zentrydesk/personalizar.js`, que se aplica al compilar):

- Nombre de la app: **ZentryDesk** y el logo de ZentryDesk (`zentrydesk/iconos`, generados con `generar-iconos.js`).
- Servidor `soporte.zentrydesk.com` y su clave pública incluidos.
- Aceptación por clic obligatoria en cada conexión entrante (`approve-mode=click`).
- Ajustes de servidor, proxy y websocket ocultos.

Compilación: GitHub Actions, workflow **ZentryDesk Remote (Windows)** (`.github/workflows/zentrydesk-windows.yml`).
Una etiqueta `zd-*` publica el instalador `.msi` y el ejecutable `.exe` en Releases.
