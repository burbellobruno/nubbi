# Renovación visual de Nubbi

## Base y alcance

Rama: `codex/nubbi-visual-renewal`, creada desde `codex/nubbi-p1-interface` en `1adbee4306a2dac79e151c289a915b53739b787a`. Tras fusionarse #3, se integró `main` (`5d1ffee4466c52065f1b70da836650064335e446`) mediante merge sin conflictos y el PR #4 se retargeteó a `main`. El usuario autorizó el 27 de octubre de 2026 las correcciones, coordinación, fusión y autodeploy condicionados a verificaciones satisfactorias. Trabajo realizado en copia/worktree aislados, sin tocar el checkout original de Descargas.

Referencia visual: `Nubbi_ Fantasía, Historias y Conexión.png`, recuperada del adjunto de la conversación original. Patrones públicos consultados en https://emochi.com/: descubrimiento mediante búsqueda, pestañas de exploración/tendencias y tarjetas con etiquetas. No se copiaron personajes, textos de catálogo ni imágenes de Emochi.

## Cambios

- Portada panorámica original con fantasía nocturna, tipografía editorial y llamadas al creador e inspiración ya existentes.
- Navegación lateral de escritorio y navegación inferior móvil con los seis destinos actuales.
- Historias recientes antes del selector de estilos; permanecen ocultas sin conversaciones reales del usuario.
- Siete estilos conservan sus valores y abren el mismo creador. No se agregan funciones ficticias de pago, notificaciones ni cuentas.
- Tarjetas, búsqueda, filtros, favoritos, chat, comunidad, Perfil y diálogos comparten el tratamiento visual. Tema claro y preferencias existentes conservados.
- Doce retratos originales de respaldo para `p0` a `p11`. Solo aparecen si falla el retrato del catálogo y no existe `c.img`; no reemplazan imágenes guardadas. El resto del catálogo conserva su respaldo original con iniciales.
- Nueva hoja `public/fantasy.css`. Caché de recursos públicos incrementada a `nubbi-v36`, incluyendo CSS y las dos imágenes locales. No cambia la política de exclusión de datos privados.

No se modificaron servidor, reglas Firebase, configuración de proveedores, lógica de sincronización, aislamiento, almacenamiento ni código de bienvenida. `app.js` cambia el respaldo visual de tarjetas y convierte los filtros en botones accesibles con `aria-pressed`, conservando callbacks. `experience.js` cambia orden de secciones y retratos recientes. La revisión independiente corrigió además el tema Sistema con SO claro, que recibía por error los tokens oscuros.

## Validación local

Servidor Express real local, sin credenciales de proveedores. Edge headless con Playwright. Los recorridos visuales bloquean solicitudes externas y usan únicamente estado sintético de invitado. La suite de cuentas sustituye el SDK de Firebase por uno simulado. No se accedió a datos de testers ni se ejecutaron escrituras Firebase reales.

- `scripts/review-fantasy.cjs`: 1440, 1024, 768, 390 y 320 px. Inicio, catálogo, historia reciente, búsqueda, favoritos, navegación, Perfil claro/oscuro, siete accesos de estilos, creador y apertura/cierre de chat. Sin errores JS de página ni desbordamiento horizontal de documento. Capturas para cada ancho.
- `scripts/test-welcome-browser.cjs`: seis escenarios, escritorio/móvil con reproducción normal, autoplay bloqueado y movimiento reducido; recarga, repetición, preferencias heredadas y audio opt-in aprobados.
- `scripts/test-account-browser.cjs`: 32 grupos aprobados en escritorio/móvil; invitado, A/B, logout, hidratación, migración explícita, restauraciones, errores de sincronización y registro. Se corrigió el selector de una aserción para contar imágenes de escena (`#msgs .m img`) sin incluir el avatar del personaje, cuyo tiempo de carga es independiente.
- `test-account-store.cjs`, `test-account-bootstrap.cjs`, `test-v5.js`, `test-ai-client.js`, `test-chat-model.js`, `test-character-age.js`, `test-image-auth.js`, `test-image-quota.js`, `test-firebase-security.js`: aprobados. Proveedores simulados; reglas evaluadas localmente, sin emulador.
- `test-service-worker.js`: once grupos aprobados, incluidos bytes reales del shell y exclusión de recursos privados.
- `test-security.js` contra servidor local: cabeceras/CSP, JSON, límites, origen, autenticación de imágenes y aislamiento de `.env` aprobados.
- Comprobación de sintaxis JS y `git diff --check` aprobados.

Limitaciones: las regresiones de cuentas usan Firebase simulado y los proveedores son simulados; no certifican escrituras Firebase ni generaciones reales. No se probaron Safari/iOS. `scripts/smoke-browser.cjs` agrega instalación real del service worker v36 y recarga offline en Edge, además de smoke de producción no destructivo con contextos nuevos de invitado y bloqueo de métodos de escritura. Los GET de salud solo comprueban configuración/token, no respuestas de chat o generación. La evidencia de publicación y deploy se registra en comentarios del PR #4 para evitar alterar el commit ya validado.

## Cierre de revisión (27 de octubre de 2026)

- Revisión independiente del código y capturas reales detectó dos defectos: tema Sistema claro y filtros sin teclado. Ambos corregidos; regresiones de Enter/Espacio y Sistema claro/oscuro añadidas en los cinco anchos.
- Se repitieron las diez suites JS enumeradas arriba, seguridad/CSP, seis escenarios welcome y 32 grupos accounts sobre la integración con main. Todos aprobados antes del cierre; se repetirán sobre el commit final antes de publicar.
- Las capturas completan las animaciones finitas antes de guardarse (`animations: disabled` solo en la captura); la aplicación conserva sus animaciones y preferencias. Se inspeccionaron las capturas reales de escritorio, móvil, Perfil y creador.
- Coordinación verificable: https://github.com/burbellobruno/nubbi/pull/4#issuecomment-6432792781. La revisión independiente ocurrió mediante subagente de esta sesión; no se afirma comunicación directa con ChatGPT.
- La producción previa al merge respondió 200/ok en `/api/health` (Groq) y `/api/image/health` (Cloudflare). No se enviaron mensajes ni se generaron imágenes, ni se accedió a datos de testers.

## Arte y especificaciones de generación

Herramienta utilizada: generación de imágenes integrada, dos recursos nuevos; sin edición de la referencia.

`public/fantasy-hero.png`: panorama 3:1, ilustración digital de fantasía semirrealista, índigo nocturno/lavanda/rosa, nubes y estrellas, castillo distante y luna creciente; elfa claramente adulta de 28 años, pelo plateado, vestido violeta oscuro y joyería plateada en la mitad derecha; espacio oscuro libre a la izquierda para titular. Sin texto, interfaz ni marcas de agua.

`public/fantasy-portraits.png`: atlas de cuatro columnas y tres filas uniformes, sin separadores ni texto, doce retratos originales semirrealistas y cinematográficos de adultos vestidos. Orden: vampiro, CEO japonés, mafioso italiano, profesor de literatura; samurái, amigo con buzo, demonio elegante, mecánico; mujer morena con suéter, artista de pelo rosa, asesina de pelo negro, elfa maga plateada. Paleta índigo/lavanda/rosa y caras centradas. El atlas se muestra con posiciones CSS, sin archivos recortados ni sustitución de imágenes del usuario.

Para repetir las capturas, definir `NUBBI_TEST_URL` en un servidor loopback, `NUBBI_PLAYWRIGHT_MODULE`, `NUBBI_BROWSER_PATH` y `NUBBI_REVIEW_OUTPUT`, y ejecutar `node scripts/review-fantasy.cjs`.
