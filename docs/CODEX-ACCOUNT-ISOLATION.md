# P1 — Account isolation and safe persistence

## 2026-10-26 — Reemplazo completo al descargar de Firebase

`persistDownloadedSnapshot()` ya construye el snapshot desde `NubbiAppDefaults()` y sobreescribe solo con los campos remotos validados. No incorpora secciones del estado local previo. Antes de serializar, el normalizador compartido migra recursivamente idiomas históricos como `es-AR` también en campos anidados y completa `prof` con todos sus valores iniciales. Después de `AccountStore.replace()` actualiza el mismo objeto raíz en memoria para que `st` corresponda exactamente al estado persistido. Se conserva el respaldo recuperable obligatorio, conflicto local, aislamiento por UID y campos remotos desconocidos seguros. La caché pública es `nubbi-v34` por los cambios públicos de esta corrección.

Pruebas de esta corrección cubren el perfil parcial, campos de idioma anidados `es-AR`, normalización antes de persistir, igualdad entre memoria y almacenamiento antes y después de recargar, una sola escritura, extensión remota segura y copia recuperable. Las suites VM/browser verifican además ausencia de escritura ante validación inválida, conflicto y fallo de almacenamiento. Los resultados de esta repetición se registran por separado en `CODEX-STATUS.md`; no deben confundirse con resultados de revisiones anteriores.

## 2026-10-26 — Correcciones de auditoría (sobre 6123c64)

Se corrigieron los dos hallazgos autorizados, únicamente en `fix/nubbi-account-isolation`:

- `public/account-store.js`: validación de `content` antes de cualquier escritura. Rechaza objetos, arrays, null, números y booleanos. Verifica también campos de texto de personajes/personas/perfil, estructura de voz, notas de memoria, relación y mensajes/configuración de ramas. Conserva campos desconocidos seguros y formatos válidos antiguos, incluidos mensajes de imagen sin leyenda. No convierte ni descarta silenciosamente datos inválidos.
- `public/app.js`: restaurar un archivo reemplaza el snapshot completo, sin mezclar `st`. Los campos omitidos reciben los valores iniciales de la aplicación tras recargar. Conserva el respaldo obligatorio antes de reemplazar y cancela ante error. Las imágenes sin leyenda tienen texto de presentación compatible en lista/chat y al guardarlas como recuerdo, sin alterar el snapshot importado.
- `public/index.html`: la acción se llama «Restaurar archivo»; la confirmación explica el reemplazo completo y los campos omitidos.
- `public/sw.js`: caché v32 por los archivos públicos modificados; mismas 21 entradas y política de seguridad.
- `scripts/test-account-store.cjs`: entradas malformadas, ausencia de escrituras ante rechazo, validación anidada, reemplazo parcial sin mezcla y restauración exacta de la copia anterior.
- `scripts/test-account-browser.cjs`: archivo y nube con `content` objeto/array, continuidad de Inicio/Chats/Perfil después del rechazo, cuota simulada al respaldar, reemplazo parcial, preservación de legacy/A/B, recuperación, imágenes antiguas y contenido válido de memoria/personas/ramas.
- Este informe, `CODEX-STATUS.md` y `CODEX-CHANGELOG.md`: documentación del cierre.

Validación repetida para esta corrección: nueve suites JS existentes; suites de store/bootstrap; Firebase VM, 24 grupos; navegador, 32 grupos de cuenta en escritorio/móvil, incluido restore parcial y comprobación de estado tras reload; seis escenarios de bienvenida; offline escritorio/móvil con v33 y 21 archivos; emulador oficial Firestore, 12 grupos; sintaxis de 27 archivos; `git diff --check`. Todo aprobado. Comandos y requisitos del entorno: sección de validación original debajo. El harness offline espera v33.

No se modificaron backend, proveedores, Firebase, reglas ni el checkout original. No se hizo push/PR/merge/deploy. La validación no incluye cuentas reales ni inferencia paga. Continúan los límites de localStorage, cuota y acceso offline descritos al final. Un respaldo inválido se conserva en su origen y debe corregirse fuera de la cuenta activa; no se intenta reparar automáticamente. No se encontraron bloqueos adicionales fuera del alcance de estas correcciones.

Verificación manual recomendada: exportar un respaldo de prueba, cambiar un `content` por `{}` y restaurarlo; confirmar el rechazo y navegar por Inicio/Chats/Perfil. Luego restaurar un archivo con solo `prof`, verificar que no quedan chats/personajes previos y recuperar la copia anterior desde Perfil. Repetir con una segunda cuenta y comprobar que su espacio y `nubbi-v1` siguen intactos.

## Implementación inicial (histórico)

Date: 2026-10-26. Branch: `fix/nubbi-account-isolation`.
Base: `b05ea99ec7346febbd673b7d8e69e5bf2040719d` (remote main verified).
Local main is older; it was not moved. Work is isolated in a separate worktree; the original checkout and index are untouched. No push, PR, deployment, rules publication or production writes.

## Root cause and correction

The main state used the browser-wide `nubbi-v1` key, irrespective of Firebase identity. Sign-in and registration could upload that state automatically. Cloud downloads also wrote to the shared key. Thus account B could see or upload A's local history.

The new store uses `nubbi:state:v2:guest` and `nubbi:state:v2:user:<encoded Firebase UID>`. Firebase hydration completes before application modules load. Identity changes immediately hide and lock the current document, then reload it, destroying old asynchronous callbacks rather than reusing the previous account's state. API responses, streaming callbacks and local writes also check the active identity. Existing Firebase session-epoch guards remain.

Login, registration and session restoration do not upload or download snapshots. Upload and download are deliberate actions with confirmation. Guest data can be copied into an account only by an explicit import; this does not upload it. A cloud download validates and backs up the local snapshot before changing live state.

## Migration and recovery

- `nubbi-v1` (or the older `mochi-chat-v3`) is left untouched. Its owner cannot be inferred safely. The profile offers an explicit import and explains the ownership ambiguity.
- Import copies the complete validated snapshot, including conversations, images, characters, memory, relationships, branches, personas, favorites, settings and unknown safe fields. It never deletes its source. Importing an identical snapshot again is a no-op.
- Before replacing an existing destination, a mandatory recovery snapshot is stored under the destination principal. If storage or quota prevents this, replacement stops. Failed target writes leave the previous target intact.
- Recovery restoration is restricted to the active namespace, also backing up the state being replaced. Profile offers restoration of the latest copy. Ordinary file import uses the same validation and backup path.
- Invalid/unreadable startup data fails closed. The status screen offers raw export of the active or legacy data when storage is readable. Ordinary save failure warns and retains in-memory state for export.
- A previously saved legacy snapshot is not proof of ownership. Explicit legacy recovery is a local user decision, not authentication of the legacy data's author.

## Files

| File | Change |
| --- | --- |
| public/account-store.js | UID/guest namespaces, validation, identity guards, explicit migration and recovery |
| public/account-bootstrap.js | Auth hydration gate, ordered module loading, locked transitions and recovery export |
| public/account-store.css | Hide private views until the active namespace is ready |
| public/app.js | Scoped load/save, manual cloud actions, migration UI, safe file import and async guards |
| public/firebase-sync.js | Bind operations to active namespace; preserve and back up local state on download |
| public/index.html | Load store/bootstrap and explain manual synchronization |
| public/sw.js | Cache v31; include the three new public assets, retaining the strict public-shell policy |
| scripts/test-account-store.cjs | Namespace, migration, recovery, rich snapshots, quota/read failures and sync guards |
| scripts/test-account-bootstrap.cjs | Hydration, ordered boot, transitions, auth failure and guest fallback |
| scripts/test-account-browser.cjs | Real browser/UI with simulated Firebase and local streaming responses |
| scripts/test-firebase-security.js | Exercise existing regressions with actual scoped persistence |
| docs/CODEX-STATUS.md, docs/CODEX-CHANGELOG.md, this file | Status and delivery documentation |

No backend, providers, Firebase project configuration, Firestore rules, package dependencies or UX animation implementation changed.

## Validation

All nine existing `scripts/test-*.js` suites passed: AI client, character age (24 groups), chat model, Firebase security (22), image authentication, image quota (19), HTTP security, service worker (11, actual 21 shell assets), and V5 memory/relationships/branches.

New store and bootstrap suites passed. Browser integration passed 22 assertion groups across desktop 1440x1000 and mobile 390x844: guest, explicit legacy import, A/B/sign-out, auth hydration/reload, external session transition, failed download/upload, recovery, explicit upload, registration, character creation, streamed chat and persistence. No page JavaScript errors or horizontal overflow.

The existing welcome browser suite passed all six desktop/mobile normal/autoplay-denied/reduced-motion scenarios, including replay, legacy preferences, reload, opt-in audio and layout checks. An additional local service-worker browser harness passed desktop/mobile offline navigation, cache isolation, private/authenticated/API/query bypass and valid character saving with v31/21 assets.

Official Firestore Emulator Suite passed 12 groups using `demo-nubbi-review` at `127.0.0.1:44770`. Expected permission-denied messages are negative security assertions. No production credentials/data were used. JavaScript syntax checks passed for all 27 public/scripts/server JS and CJS files; `git diff --check` passed.

### Commands and prerequisites

From the branch worktree, Node v24.20.0 and existing project dependencies:

```powershell
Get-ChildItem scripts/test-*.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw $_.Name } }
node scripts/test-account-store.cjs
node scripts/test-account-bootstrap.cjs
$files = @(Get-ChildItem public,scripts -File | Where-Object { $_.Extension -in '.js','.cjs' }) + @(Get-Item server.js)
$files | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw $_.Name } }
git diff --check
```

Browser prerequisites: Playwright, installed Brave/Chromium, local project server at 127.0.0.1:43828, no real provider calls. This run used the existing workspace `work/release-preflight/serve-candidate.cjs` helper, which disables dotenv and external server fetches:

```powershell
# From workspace root, keep server running in a separate terminal:
node work/release-preflight/serve-candidate.cjs work/account-isolation
# From branch worktree:
$env:NUBBI_PLAYWRIGHT_MODULE='C:/Users/burbe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:NUBBI_BROWSER_PATH='C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
$env:NUBBI_TEST_URL='http://127.0.0.1:43828'
node scripts/test-account-browser.cjs
node scripts/test-welcome-browser.cjs
# From workspace root:
node work/p1-sw-browser.cjs
& ./work/emulator-tools/run-firestore-tests.ps1 -ProjectRoot './work/account-isolation'
```

The two workspace harnesses are local validation infrastructure, not application dependencies. Emulator prerequisites were already available: portable Java 21, Firebase CLI 15.34, Firebase SDK 13.1, rules-unit-testing 6.0 and a downloaded Firestore emulator. Browser tests intercept Firebase and block external traffic; all provider responses are simulated.

## Compatibility limits and manual verification

1. Use separate test accounts A/B in a development Firebase project. Create a guest chat, sign into A, confirm empty A data or only A's prior local data; import guest only after consent. Confirm no cloud write on login.
2. Download A's existing backup explicitly; edit a character, persona, memory and chat, reload, sign out and sign into B. Confirm B cannot see A's content; return to A and confirm it persists.
3. Simulate a failed network request, quota exhaustion and an account transition during a pending download. Confirm existing data remains and stale work does not alter the next account.
4. Import a legacy/file backup, repeat it, restore the recovery copy, and export data. Verify the original legacy key remains unchanged.
5. Recheck real-provider chat/image behavior in a separately authorized environment. This delivery deliberately avoids paid inference and production Firebase activity.

LocalStorage isolation prevents accidental application-level mixing; it is not encryption against another person with browser-profile/devtools access. The legacy key remains recoverable on this device by explicit action. Welcome/audio and moderation safety preferences stored outside the main snapshot remain device preferences. A cold offline start without Firebase identity confirmation offers guest data only, never guesses the last authenticated UID. Changing identities reloads the page and ends active streams. Recovery copies consume storage; no automatic deletion is performed. Concurrent edits in two tabs of the same UID remain last-writer-wins, as before; account-transition races are guarded. An already-dispatched cloud write can finish for its original UID, but is never retargeted to the next account.

Firebase restores now use remote fields plus application defaults for omitted fields. A rollback to the old application would read the untouched legacy key and would not read newly scoped snapshots; export scoped data before any approved rollback. Production promotion requires separate approval and should retain the same Firebase project and rules. This correction remains local and uncommitted.
