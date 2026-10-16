// ZentryDesk: el servidor solo deja conectarse a equipos registrados por una empresa activa.
// ZentryDesk escribe la lista de IDs permitidos (uno por línea) en el archivo de ZD_ALLOW_FILE;
// se vuelve a leer cuando cambia (se revisa como máximo cada 3 segundos).
// Sin ZD_ALLOW_FILE el servidor funciona como el original (sin filtro).
use std::{
    collections::HashSet,
    sync::Mutex,
    time::{Duration, Instant, SystemTime},
};

struct Cache {
    checked: Option<Instant>,
    mtime: Option<SystemTime>,
    ids: Option<HashSet<String>>,
}

static CACHE: Mutex<Cache> = Mutex::new(Cache { checked: None, mtime: None, ids: None });

pub fn allowed(id: &str) -> bool {
    let path = match std::env::var("ZD_ALLOW_FILE") {
        Ok(p) if !p.is_empty() => p,
        _ => return true,
    };
    let mut c = CACHE.lock().unwrap();
    if c.checked.map_or(true, |t| t.elapsed() > Duration::from_secs(3)) {
        c.checked = Some(Instant::now());
        if let Ok(meta) = std::fs::metadata(&path) {
            let m = meta.modified().ok();
            if m != c.mtime || c.ids.is_none() {
                if let Ok(s) = std::fs::read_to_string(&path) {
                    c.ids = Some(s.lines().map(|l| l.trim().to_owned()).filter(|l| !l.is_empty()).collect());
                    c.mtime = m;
                }
            }
        }
    }
    // Si la lista nunca se pudo leer, no se deja pasar a nadie (fallar cerrado).
    c.ids.as_ref().map_or(false, |s| s.contains(id))
}

/// Mensaje que ve el técnico en su ZentryDesk Remote.
pub const NOT_REGISTERED: &str = "Este equipo no está registrado en ZentryDesk (o la cuenta de la empresa no está activa). Instálalo desde Configuración → Agente remoto o usa \"Solicitar control remoto\" desde el ticket.";
