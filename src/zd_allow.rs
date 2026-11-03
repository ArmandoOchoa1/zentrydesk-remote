// ZentryDesk: el servidor solo deja conectarse a equipos registrados por una empresa activa.
// ZentryDesk escribe la lista de IDs permitidos (uno por línea) en el archivo de ZD_ALLOW_FILE;
// se vuelve a leer cuando cambia (se revisa como máximo cada 3 segundos) y, por si el cambio no se notara
// (misma fecha de modificación), también cada 60 segundos aunque parezca igual.
// Sin ZD_ALLOW_FILE el servidor funciona como el original (sin filtro): se avisa en el registro.
use std::{
    collections::HashSet,
    sync::{Mutex, Once},
    time::{Duration, Instant, SystemTime},
};

struct Cache {
    checked: Option<Instant>,
    loaded: Option<Instant>,
    // Fecha de modificación y tamaño: con solo la fecha, dos escrituras seguidas pueden quedar con la misma.
    stamp: Option<(Option<SystemTime>, u64)>,
    ids: Option<HashSet<String>>,
}

static CACHE: Mutex<Cache> = Mutex::new(Cache { checked: None, loaded: None, stamp: None, ids: None });
static WARN_NO_FILTER: Once = Once::new();

const CHECK_EVERY: Duration = Duration::from_secs(3);
const RELOAD_EVERY: Duration = Duration::from_secs(60);

fn parse(s: &str) -> HashSet<String> {
    // Un BOM al inicio (archivo guardado como "UTF-8 con BOM") haría que el primer ID nunca coincida.
    s.trim_start_matches('\u{feff}')
        .lines()
        .map(|l| l.trim().to_owned())
        .filter(|l| !l.is_empty())
        .collect()
}

pub fn allowed(id: &str) -> bool {
    let path = match std::env::var("ZD_ALLOW_FILE") {
        Ok(p) if !p.is_empty() => p,
        _ => {
            WARN_NO_FILTER.call_once(|| {
                hbb_common::log::warn!("ZD_ALLOW_FILE no está definido: el filtro de equipos de ZentryDesk está APAGADO");
            });
            return true;
        }
    };
    let mut c = CACHE.lock().unwrap();
    if c.checked.map_or(true, |t| t.elapsed() > CHECK_EVERY) {
        c.checked = Some(Instant::now());
        match std::fs::metadata(&path) {
            Ok(meta) => {
                let stamp = Some((meta.modified().ok(), meta.len()));
                let stale = c.loaded.map_or(true, |t| t.elapsed() > RELOAD_EVERY);
                if stamp != c.stamp || c.ids.is_none() || stale {
                    match std::fs::read_to_string(&path) {
                        Ok(s) => {
                            c.ids = Some(parse(&s));
                            c.stamp = stamp;
                            c.loaded = Some(Instant::now());
                        }
                        Err(e) => hbb_common::log::error!("No se pudo leer {}: {}", path, e),
                    }
                }
            }
            // Se mantiene la última lista leída (si la hay): un archivo que falta un momento no corta a todos.
            Err(e) => hbb_common::log::error!("No se encuentra {}: {}", path, e),
        }
    }
    // Si la lista nunca se pudo leer, no se deja pasar a nadie (fallar cerrado).
    c.ids.as_ref().map_or(false, |s| s.contains(id))
}

/// Mensaje que ve el técnico en su ZentryDesk Remote.
pub const NOT_REGISTERED: &str = "Este equipo no está registrado en ZentryDesk (o la cuenta de la empresa no está activa). Instálalo desde Configuración → Agente remoto o usa \"Solicitar control remoto\" desde el ticket.";

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn quita_bom_y_lineas_vacias() {
        let ids = parse("\u{feff}123456789\r\n\n 987654321 \n");
        assert!(ids.contains("123456789"));
        assert!(ids.contains("987654321"));
        assert_eq!(ids.len(), 2);
    }
}
