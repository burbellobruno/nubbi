# Nubbi

## Actualización de experiencia e imágenes

- Diseño e intro: consulta `DISENO-EXPERIENCIA.md`. El audio original está en `public/nubbi-intro.mp3`.
- Memoria y relaciones: consulta `MEJORAS-V5-INTEGRACION.md`.
- En Render, configura `FIREBASE_API_KEY` con la clave API del mismo proyecto Firebase usado por el cliente. No se modifican las credenciales automáticamente.
- Las imágenes requieren una cuenta Firebase no anónima. `IMAGE_DAILY_LIMIT` vale 5 por defecto; el límite se reinicia a las 00:00 UTC. La cuota vive en memoria: se pierde al reiniciar y no se comparte entre instancias. Los intentos consumen cuota.
- `IMAGE_PROVIDER=cloudflare|forge|huggingface` selecciona el proveedor predeterminado; el selector del creador permite elegir entre los disponibles.
- Para HuggingFace configura `HF_TOKEN`, `HF_IMAGE_MODEL` (predeterminado `cagliostrolab/animagine-xl-3.1`) y opcionalmente `HF_TIMEOUT_MS` (120000). El modelo debe estar disponible para inferencia en `hf-inference` y accesible con el token; tener una ficha pública no garantiza disponibilidad.
- Chat de texto: se conserva el límite por IP, sin cuota diaria por usuario.
- Pruebas: `node scripts/test-v5.js` y `node scripts/test-image-auth.js`.

App de chat con personajes de IA (adultos), para móvil y PC. El catálogo base tiene 27 personajes (p0 a p26).

## Desarrollo local

1. `npm install`
2. Copiá `.env.example` a `.env` y completá `CHAT_API_KEY`.
3. Por defecto usa **Groq** (nube), así no necesitás instalar nada local:
   - `CHAT_BASE_URL=https://api.groq.com/openai/v1`
   - `CHAT_MODEL=openai/gpt-oss-20b`
4. Si preferís usar **Ollama** local, cambiá en `.env`:
   - `CHAT_BASE_URL=http://localhost:11434/v1`
   - `CHAT_API_KEY=ollama`
   - `CHAT_MODEL=qwen2.5:7b`
   - y corré `ollama pull qwen2.5:7b`
5. Imágenes: la opción gratis es **Cloudflare Workers AI** (FLUX.1 schnell, sin GPU). Configurá `CF_ACCOUNT_ID` y `CF_API_TOKEN` en `.env`; si no, podés usar Forge/A1111 local con `SD_URL=http://127.0.0.1:7860`. En producción, mirá las secciones de abajo.
6. `npm run dev` y entrá a **http://localhost:3001**.
7. (Opcional) retratos del catálogo: `npm run portraits 3` para probar con 3, y sin número para todos.

## Producción en Render

- `.env` **no se sube** a GitHub (está en `.gitignore`). En Render las variables se cargan en **Environment**.
- Configuración recomendada:
  - `CHAT_BASE_URL` = `https://api.groq.com/openai/v1`
  - `CHAT_API_KEY` = tu clave de Groq (`gsk_...`)
  - `CHAT_MODEL` = `openai/gpt-oss-20b`
  - Opcional, para modo adulto: `ADULT_CHAT_BASE_URL`, `ADULT_CHAT_API_KEY`, `ADULT_CHAT_MODEL`
  - Opcional, para imágenes gratis: `CF_ACCOUNT_ID` y `CF_API_TOKEN` (ver abajo)
- **No definas `PORT` en Render**: Render lo asigna automáticamente y la app ya usa `process.env.PORT`.
- Para verificar la configuración activa, abrí `https://TU-APP.onrender.com/api/health`. Incluye si el proveedor adulto está configurado y los datos del endpoint de imágenes.

## Imágenes gratis con Cloudflare Workers AI

La opción sin GPU es **Cloudflare Workers AI** con **FLUX.1 schnell**. No necesita tarjeta y el plan gratuito incluye **10.000 neuronas por día** (aproximadamente 100–170 imágenes). Cloudflare no genera imágenes sexuales explícitas: sirve para retratos y escenas sugerentes. El texto adulto del chat sigue funcionando igual.

1. Creá una cuenta gratis en [Cloudflare](https://dash.cloudflare.com/sign-up/workers-and-pages).
2. En el dashboard, entrá a **Workers AI → Use REST API**.
3. Copiá el **Account ID** y creá un **API Token**. El token necesita permisos **Workers AI - Read** y **Workers AI - Edit**.
4. En Render → **Environment**, agregá:
   ```env
   CF_ACCOUNT_ID=tu_account_id_de_32_caracteres
   CF_API_TOKEN=tu_token_de_workers_ai
   ```
   Opcional: `CF_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell`, `CF_IMAGE_STEPS=4`, `CF_TIMEOUT_MS=60000`.
5. Guardá y esperá el redeploy. Verificá `https://TU-APP.onrender.com/api/image/health`: debe devolver `ok: true` con `provider: "cloudflare"`.
6. En la app, creá o editá un personaje y usá **Generar imagen con IA**.

- Si Cloudflare está configurado, se usa automáticamente en lugar de Forge. Para forzar uno: `IMAGE_PROVIDER=cloudflare` o `IMAGE_PROVIDER=forge`. Si usás Cloudflare, podés borrar `SD_URL`: no hace falta.
- En Cloudflare, el servidor reemplaza etiquetas meta como `adult`, `adulta` y `18+` por una edad adulta explícita (`28 years old` si el prompt no indica una edad de 21 o más). El modo adulto del chat no cambia: Cloudflare sigue bloqueando descripciones explícitas.
- La cuota se reinicia todos los días a las 00:00 UTC. Si se agota, la API devuelve un error hasta el día siguiente.

## Usar tus modelos locales (Forge)

La app ahora permite elegir el proveedor al generar cada imagen:

- **Cloudflare**: gratis, sin GPU, FLUX.1 schnell. Bueno para retratos rápidos y sugerentes.
- **Forge**: usa tus checkpoints y LoRAs locales. Mejor para anime, manhwa y realismo. Puede generar contenido adulto según tus modelos y la ley.

En el diálogo de crear/editar personaje elegí **Proveedor de imagen → Forge**. La lista de modelos se lee automáticamente desde Forge (`/sdapi/v1/sd-models`).

### Si corrés Nubbi en tu PC

1. Abrí Forge con `--api` (tu `webui-user.bat` ya lo tiene).
2. En `.env`:
   ```env
   SD_URL=http://127.0.0.1:7860
   IMAGE_PROVIDER=forge
   ```
3. Corré `npm run dev` y entrá a `http://localhost:3001`.
4. En el creador de personaje, elegí **Forge** y el modelo que quieras.

### Si usás la app en Render con tu PC

Render no puede acceder a `localhost`. Necesitás exponer Forge con un túnel mientras la PC y Forge estén prendidos:

1. Instalá `cloudflared` (gratis, sin cuenta para el túnel rápido):
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Con Forge corriendo en el puerto 7860, abrí otra terminal y ejecutá:
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:7860
   ```
3. Copiá la URL `https://....trycloudflare.com` que aparece.
4. En Render → **Environment**:
   ```env
   SD_URL=https://tu-url.trycloudflare.com
   IMAGE_PROVIDER=forge
   ```
   Si Forge tiene autenticación, agregá `SD_AUTH=Basic usuario:clave`.
5. Esperá el redeploy y en el creador elegí **Forge**. La lista de modelos debería aparecer.

**Importante:** no expongas Forge sin autenticación. Usá `--api-auth usuario:clave` y `--gradio-auth usuario:clave` al iniciar Forge, o un proxy con Basic Auth. El túnel rápido cambia de URL cada vez que lo reiniciás; si querés una URL fija, usá un túnel nombrado de Cloudflare con un dominio o un dominio estático de ngrok.

### Qué modelo usar

- **Anime**: Counterfeit, Anything V5, OpenSolera, liveAnimeMix.
- **Manhwa**: AImanhwa, manhwa-artstyle.
- **Realismo**: RealisticVision, ChilloutMix.
- **Ilustración/pintura**: DreamShaper.

Cloudflare no puede usar estos checkpoints ni LoRAs: es un solo modelo. Para retratos realistas ficticios puede servir, pero no para imitar un estilo o un personaje con la consistencia de tus modelos. No generes contenido sexual con personas reales identificables ni suplantación.

## Imágenes con GPU cloud (Forge / A1111)

El endpoint `/api/image` usa la API A1111 de **Forge** (también compatible con A1111). En Render no se puede usar `localhost`.

1. Levantá Forge en un GPU cloud (RunPod, Modal, Vast, etc.) con `--api --listen` y el checkpoint instalado.
2. Exponé el puerto 7860 por HTTPS y protegelo con autenticación. No dejes el endpoint abierto.
3. En Render → **Environment**:
   - `SD_URL=https://tu-endpoint-publico` (URL completa; no un ID interno de Render)
   - `SD_AUTH=Basic usuario:clave` (o `Bearer token`, o solo el token)
   - Opcional: `SD_TIMEOUT_MS=120000`, `SD_NEGATIVE=...`, `SD_CHECKPOINTS={"counterfeit":"Counterfeit-V3.0_fp16"}`
4. Verificá `https://TU-APP.onrender.com/api/image/health`. Debe devolver `ok: true` y el checkpoint activo.
5. En la app, creá o editá un personaje y usá **Generar imagen con IA**.

- En local: `SD_URL=http://127.0.0.1:7860` y Forge abierto con `--api`.
- El servidor agrega `adult, 18+` al prompt y un negativo con `child, minor, underage, teen, loli, shota, kid`. No quites esas protecciones.
- Para este proveedor, el backend implementado es Forge/A1111. **ComfyUI** usa otra API; si querés usarlo, hay que agregar un adaptador específico con tu workflow.

## Chat, libertad e idiomas

- En **Perfil → Configuración** podés elegir:
  - **Idioma del chat**: rioplatense, latinoamericano neutro, mexicano, colombiano, chileno, España, English o português (Brasil).
  - **Creatividad**: preciso, equilibrado, creativo o impredecible.
  - **Longitud de respuesta**: corta, normal o larga.
- En **Escena** podés elegir la intensidad, incluida **Libre** (el personaje toma la iniciativa y puede crear conflicto y tensión). Con el modo adulto activo, **Intenso** y **Libre** también pueden incluir ficción sexual explícita entre adultos.
- En el chat tenés **Improvisar** (el personaje propone un giro) y **Regenerar** (vuelve a responder el último mensaje).
- En **Perfil → Modelo de IA** podés elegir **Automático (rápido)**, **gpt-oss-20b** o **gpt-oss-120b** (más lento y más profundo). Si no elegís nada, se usa `CHAT_MODEL`.

## Contenido adulto y límites

- Al entrar, la app pide confirmar que tenés **18 años o más**. Es un gate simple: no verifica identidad.
- En **Perfil → Contenido adulto** podés permitir ficción sexual explícita entre adultos o dejar el modo solo sugerente.
- Está permitida la ficción sexual entre personajes **mayores de 18** y con consentimiento.
- **No está permitido**: contenido sexual con menores o personajes que aparenten ser menores, contenido no consentido o con personas reales. Prohibido el contenido sexual con animales reales (zoofilia). Los personajes antropomórficos adultos (furry) están permitidos como cualquier otro personaje. Esas prohibiciones están en el prompt del cliente y en el servidor.
- El tag **furry** agrupa personajes antropomórficos adultos y se puede filtrar como cualquier otro tag.
- El contenido explícito depende del proveedor de texto. Groq permite contenido adulto legal según su política, pero sus modelos pueden rechazar algunas escenas. Para mayor consistencia, configurá un proveedor alternativo solo para el modo adulto:

```env
ADULT_CHAT_BASE_URL=https://tu-proveedor/v1
ADULT_CHAT_API_KEY=tu_clave
ADULT_CHAT_MODEL=tu-modelo
```

Si `ADULT_CHAT_*` no está configurado, el modo adulto usa el proveedor general (`CHAT_*`). El servidor envía además una instrucción de seguridad con los límites anteriores.

## Funciones de historia

- **Acciones por mensaje**: escuchar, guardar en memoria, editar, crear una rama, rebobinar o borrar.
- **Memoria**: resumen automático de la conversación y recuerdos sueltos que se incluyen en el prompt.
- **Director**: propone 3 próximos giros o acciones para elegir.
- **Ramas**: guardá el estado actual y volvé a abrirlo cuando quieras (hasta 20 por personaje).
- **Exportar**: descarga la conversación en Markdown.
- **Escena**: instrucciones del chat, objetivo, secreto, arco, fondo, estilo de burbuja y atenuación del fondo.
- **Personas**: edad, pronombres, apariencia y relación con el personaje.
- **Voz**: elegí la voz del dispositivo, velocidad, tono y lectura automática.
- **Personajes propios**: crealos, editalos, compartilos por código e importalos desde **Perfil**.

## Cuentas y sincronización

- La app funciona sin cuenta (modo invitado) y guarda todo en el dispositivo.
- Para crear una cuenta:
  1. En **Firebase Console → Authentication → Sign-in method**, habilitá **Email/Password**.
  2. En **Authentication → Settings → Authorized domains**, agregá tu dominio de Render (por ejemplo `nubbi.onrender.com`) si no está.
  3. En **Perfil → Cuenta**, completá email y contraseña, y tocá **Crear cuenta**.
- Al crear la cuenta se suben los datos locales. Al iniciar sesión podés elegir bajar los datos de la nube o subir los de este dispositivo.
- También podés usar **Subir a la nube** y **Bajar de la nube** manualmente.

## Comunidad (Fase 2)

La sección **Comunidad** permite explorar personajes públicos, publicar los tuyos, ver novedades, dar me gusta, comentar y reportar contenido. Todo el contenido es 18+. Puede incluir ficción adulta; no se permite contenido sexual con menores ni no consentido.

- **Explorar**: cualquiera puede ver personajes y novedades publicadas.
- **Publicar, comentar, dar me gusta y reportar**: requiere una cuenta de email/contraseña (el modo invitado puede explorar, pero no escribir).
- **Publicar un personaje**: desde **Comunidad → + Publicar personaje** o desde la ficha de un personaje propio → **Publicar en comunidad**. Se publican nombre, descripción, rol, tags, personalidad, primer mensaje y una imagen comprimida opcional. **No** se suben chats, memoria, escenas privadas ni configuraciones del chat.
- **Perfil de creador**: en **Perfil → Perfil de creador** podés publicar tu nombre y bio. Se usa en tus personajes y publicaciones.
- **Moderación**: cada personaje, publicación y comentario se puede reportar. Los reportes se guardan en la colección `reports` y se revisan desde **Firebase Console → Firestore**. También podés bloquear creadores; el bloqueo y el contenido oculto por reportes se guardan solo en tu dispositivo.
- **Imágenes**: se redimensionan y comprimen antes de publicarse para no superar el límite de un documento de Firestore.

### Activar las reglas de Firestore

La primera vez hay que publicar las reglas incluidas en `firestore.rules`. Sin ellas, la comunidad muestra un error de permisos.

1. Instalá Firebase CLI (`npm install -g firebase-tools`) si no lo tenés.
2. Iniciá sesión: `firebase login`.
3. Desde la carpeta del proyecto: `firebase use nubbi-d106b`.
4. Publicá las reglas: `npm run deploy:rules` (o `firebase deploy --only firestore:rules`).
5. Verificá en **Firebase Console → Firestore → Reglas** que estén activas.

Si no podés usar la CLI, abrí **Firebase Console → Firestore → Reglas**, pegá el contenido de `firestore.rules` y publicá.

Las reglas permiten lectura pública solo de contenido publicado, escritura solo a cuentas reales, y limitan quién puede editar o borrar cada documento. La colección `reports` es de solo escritura desde la app: se lee y modera desde la consola con permisos de administrador. No hace falta crear las colecciones a mano; Firestore las crea al publicar el primer personaje.

## Instalarla como app

- PC (Chrome/Brave/Edge): ícono de instalar en la barra de direcciones.
- Celu (misma red wifi): abrí `http://IP-DE-TU-PC:3001` y "Agregar a pantalla de inicio".
