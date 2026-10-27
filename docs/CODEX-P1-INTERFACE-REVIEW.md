# Nubbi P1 — ajustes finales de interfaz

Preparado el 26 de octubre de 2026. Rama local `codex/nubbi-p1-interface`, desde `origin/main` actualizado en `7977506026c1b6956ef858322bd4734c26af5da1` (P1 fusionado). Checkout aislado: `C:/Users/burbe/.codex/worktrees/nubbi-p1-interface/account-isolation`. Sin commits, push, PR, merge ni despliegue.

## Cambios

- Inicio: aviso de datos anteriores más compacto. Conserva íntegros la explicación, condición de aparición y botón para revisar/importar en Perfil. En escritorio distribuye texto y acción en una fila; en móvil los apila.
- Inicio: reduce altura, relleno y márgenes del bloque principal y de estilos. Conserva textos, ilustraciones, catálogo, estilos y acciones existentes.
- Perfil: agrupa los controles en siete tarjetas con títulos accesibles. Dos columnas en pantallas amplias y una en móvil; controles de sincronización/exportación/restauración se distribuyen con ajuste de línea. Se conservan identificadores y manejadores existentes. El panel dinámico de privacidad y la bienvenida permanecen disponibles.
- README: elimina la afirmación histórica de subida automática al crear cuenta. Explica la sincronización exclusivamente manual, separación de espacios, descarga con recuperación y revisión explícita de datos anteriores.
- Caché pública: versión `nubbi-v35` para entregar los estilos nuevos cuando se publique. Sin cambios de política offline, recursos permitidos ni lógica de cuentas.

Archivos de aplicación: `public/experience.css`, `public/index.html`, `public/app.js` (solo una clase de presentación) y `public/sw.js` (identificador de caché). Documentación: `README.md` y este informe.

## Validación

- Nueve suites JavaScript existentes aprobadas: AI client, edades (24 grupos), modelos de chat, Firebase VM (24), autenticación de imágenes, cuota de imágenes (19), seguridad HTTP, service worker (11) y memoria/ramas V5.
- Account store y bootstrap: aprobados.
- Navegador de cuentas: 32 grupos aprobados en escritorio y móvil, incluyendo importación explícita, A/B, sincronización, errores, recuperación, descargas parciales y persistencia tras recargar.
- Bienvenida: seis escenarios aprobados (escritorio/móvil, normal, bloqueado y movimiento reducido). No se editó su código ni sus recursos.
- Service worker repetido tras incrementar la versión: 11 grupos aprobados, con los bytes reales del shell.
- Sintaxis de app.js y sw.js y `git diff --check`: aprobados.

Comparación visual local con Firebase simulado, red externa bloqueada, servidor Express sin dotenv ni proveedores, perfiles de navegador nuevos y contenido sintético. Capturas antes/después de Inicio y Perfil, más sincronización y recuperación. Se verificó el acceso del aviso a recuperación sin cambiar el origen, la presencia de todos los controles, las siete tarjetas y ausencia de desbordamiento horizontal de página y tarjetas.

| Pantalla | Estilos antes → después | Búsqueda antes → después |
|---|---:|---:|
| Escritorio 1440×1000 | 587 → 482 px | 828 → 711 px |
| Tablet 768×1024 | 636 → 448 px | 887 → 687 px |
| Móvil 390×844 | 684 → 563 px | 928 → 796 px |
| Móvil estrecho 320×740 | 693 → 593 px | 935 → 825 px |

Las medidas corresponden al caso con aviso de datos anteriores y movimiento reducido. Los estilos aparecen entre 100 y 188 px antes; la búsqueda, entre 110 y 200 px antes. Las capturas se revisaron visualmente en escritorio y móvil, incluidas las tarjetas de sincronización y recuperación en 320 px. La bienvenida se probó por separado con su suite existente.

Artefactos externos: `C:/Users/burbe/.codex/visualizations/2026/10/26/01a17a77-1788-7682-8b78-8029a705bbf5/`. Allí se conservan `nubbi-interface-visual-results.json`, `nubbi-interface-visual.cjs` y capturas `interface-*-before/after-*.png`. Las capturas muestran datos ficticios y configuración local deshabilitada; no reflejan la configuración de proveedores de producción.

## Límites y estado de entrega

No hubo operaciones Firebase reales, migraciones, borrados ni generación IA. No se repitió el emulador Firestore, porque sus reglas y la lógica cloud no cambiaron. El service worker se validó con su suite existente; no se afirma una nueva prueba offline de navegador completa.

Se comprobó ausencia de diferencias en account-store.js, account-bootstrap.js, firebase-sync.js, firebase-config.js, experience.js, server.js y firestore.rules. No se reaplicó el aislamiento de P1 ni se cambió la bienvenida. El checkout original y el checkout previo de P1 no se editaron; solo se actualizó la referencia Git origin/main al preparar la nueva rama.

Los cambios quedan locales y sin publicar para revisión del usuario antes de cualquier PR.
