// ZentryDesk Remote: personaliza RustDesk antes de compilar (se ejecuta en GitHub Actions tras el checkout).
// Cada reemplazo es exacto: si RustDesk cambia el código de origen, el script falla en vez de compilar a medias.
// Licencia: RustDesk es AGPL-3.0; este fork publica sus cambios en este mismo repositorio.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER = process.env.ZD_SERVER || 'remoto.zentrydesk.com';
const KEY = process.env.ZD_KEY || 'T5uTdG9HEO+YeapTrKUVOQs73jMeYwSHSuzpzceha7g=';
const APP = 'ZentryDesk';

function edit(file, pairs) {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [from, to] of pairs) {
    if (from instanceof RegExp ? !from.test(s) : !s.includes(from)) throw new Error(`${file}: no se encontró ${from}`);
    s = from instanceof RegExp ? s.replace(from, to) : s.split(from).join(to);
  }
  fs.writeFileSync(p, s);
  console.log(`✓ ${file}`);
}
const settings = (obj) => `RwLock::new([${Object.entries(obj).map(([k, v]) => `("${k}", "${v}")`).join(', ')}].iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())`;

// 1. Servidor, clave y nombre de la app; aceptación por clic siempre y ajustes de servidor ocultos.
edit('libs/hbb_common/src/config.rs', [
  [/pub const RENDEZVOUS_SERVERS: &\[&str\] = &\["[^"]*"\];/, `pub const RENDEZVOUS_SERVERS: &[&str] = &["${SERVER}"];`],
  [/pub const RS_PUB_KEY: &str = "[^"]*";/, `pub const RS_PUB_KEY: &str = "${KEY}";`],
  ['pub static ref APP_NAME: RwLock<String> = RwLock::new("RustDesk".to_owned());', `pub static ref APP_NAME: RwLock<String> = RwLock::new("${APP}".to_owned());`],
  // Nadie entra sin que el usuario acepte en su pantalla (no se usan contraseñas fijas).
  // El servidor también va como opción: sin ella el cliente se cree en el servidor público
  // (muestra "configure su propio servidor") y manda su estado a admin.rustdesk.com en vez de ZentryDesk.
  // El estado (/api) va por el 443 (Caddy en el VPS). La conexión NO va por WebSocket: el servidor libre de
  // RustDesk (hbbs) no registra equipos por WebSocket ni TCP (responde NOT_SUPPORT); solo por UDP 21116.
  ['pub static ref OVERWRITE_SETTINGS: RwLock<HashMap<String, String>> = Default::default();',
    `pub static ref OVERWRITE_SETTINGS: RwLock<HashMap<String, String>> = ${settings({ 'approve-mode': 'click', 'custom-rendezvous-server': SERVER, 'key': KEY, 'api-server': `https://${SERVER}` })};`],
  // El usuario no puede cambiar el servidor ni la red: siempre ZentryDesk. El crédito a RustDesk queda en
  // "Acerca de" y en las propiedades del ejecutable (AGPL), no en la pantalla principal.
  ['pub static ref BUILTIN_SETTINGS: RwLock<HashMap<String, String>> = Default::default();',
    `pub static ref BUILTIN_SETTINGS: RwLock<HashMap<String, String>> = ${settings({ 'hide-server-settings': 'Y', 'hide-proxy-settings': 'Y', 'hide-websocket-settings': 'Y', 'hide-powered-by-me': 'Y' })};`],
]);

// 2. Datos del ejecutable (Propiedades → Detalles en Windows).
// Aplica al programa (Cargo.toml) y al ejecutable portátil que lo empaqueta (libs/portable/Cargo.toml).
const meta = (file) => edit(file, [
  [/ProductName = "RustDesk"/, `ProductName = "${APP}"\nCompanyName = "Backend Peru"`],
  [/LegalCopyright = "[^"]*"/, 'LegalCopyright = "ZentryDesk de Backend Peru. Basado en RustDesk (AGPL-3.0)."'],
  [/FileDescription = "RustDesk Remote Desktop"/, 'FileDescription = "ZentryDesk Remote - asistencia remota"'],
]);
meta('Cargo.toml');
meta('libs/portable/Cargo.toml');
edit('flutter/windows/runner/Runner.rc', [
  ['VALUE "CompanyName", "Purslane Tech Pte. Ltd." "\\0"', 'VALUE "CompanyName", "Backend Peru" "\\0"'],
  ['VALUE "FileDescription", "RustDesk Remote Desktop" "\\0"', 'VALUE "FileDescription", "ZentryDesk Remote - asistencia remota" "\\0"'],
  [/VALUE "LegalCopyright", "[^"]*" "\\0"/, 'VALUE "LegalCopyright", "ZentryDesk de Backend Peru. Basado en RustDesk (AGPL-3.0)." "\\0"'],
  ['VALUE "ProductName", "RustDesk" "\\0"', `VALUE "ProductName", "${APP}" "\\0"`],
]);

// 3. Logo: íconos de Windows, de la bandeja y el logo dentro de la app.
const icons = path.join(__dirname, 'iconos');
const copy = (from, to) => { fs.copyFileSync(path.join(icons, from), path.join(ROOT, to)); console.log(`✓ ${to}`); };
for (const f of ['icon.ico', 'tray-icon.ico', 'icon.png', '32x32.png', '64x64.png', '128x128.png', '128x128@2x.png']) copy(f, `res/${f}`);
copy('app_icon.ico', 'flutter/windows/runner/resources/app_icon.ico');
copy('icon.svg', 'flutter/assets/icon.svg');
// Logo con el nombre arriba del ID (la app busca logo_dark/logo_light/logo.png; generar-logo.ps1).
for (const f of ['logo.png', 'logo_dark.png', 'logo_light.png']) copy(f, `flutter/assets/${f}`);

console.log(`Listo: ${APP} → ${SERVER}`);
