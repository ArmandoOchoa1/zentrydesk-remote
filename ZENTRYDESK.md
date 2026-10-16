# Servidor de ZentryDesk Remote

RustDesk Server 1.1.16 (AGPL-3.0) con un cambio: `hbbs` solo deja conectarse a los equipos que ZentryDesk
permite (registrados con el instalador de una empresa activa, o el equipo de una solicitud de control remoto
en curso). ZentryDesk escribe la lista en el archivo de `ZD_ALLOW_FILE`; ver `src/zd_allow.rs` y los dos
puntos marcados con "ZentryDesk" en `src/rendezvous_server.rs`. Sin esa variable funciona como el original.
