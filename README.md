# Nubbi

App de chat con personajes de IA (adultos), para móvil y PC.

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
5. Imágenes: abrí Stable Diffusion WebUI Forge con `--api` y un modelo SD 1.5 de anime. En local podés usar `SD_URL=http://127.0.0.1:7860`; en producción apuntá `SD_URL` a un Forge/A1111 en GPU cloud (ver más abajo).
6. `npm run dev` y entrá a **http://localhost:3001**.
7. (Opcional) retratos del catálogo: `npm run portraits 3` para probar con 3, y sin número para todos.

## Producción en Render

- `.env` **no se sube** a GitHub (está en `.gitignore`). En Render las variables se cargan en **Environment**.
- Configuración recomendada:
  - `CHAT_BASE_URL` = `https://api.groq.com/openai/v1`
  - `CHAT_API_KEY` = tu clave de Groq (`gsk_...`)
  - `CHAT_MODEL` = `openai/gpt-oss-20b`
  - Opcional, para modo adulto: `ADULT_CHAT_BASE_URL`, `ADULT_CHAT_API_KEY`, `ADULT_CHAT_MODEL`
- **No definas `PORT` en Render**: Render lo asigna automáticamente y la app ya usa `process.env.PORT`.
- Para verificar la configuración activa, abrí `https://TU-APP.onrender.com/api/health`. Incluye si el proveedor adulto está configurado y los datos del endpoint de imágenes.

## Imágenes en GPU cloud (Forge / A1111)

El endpoint `/api/image` usa la API A1111 de **Forge** (también compatible con A1111). En Render no se puede usar `localhost`.

1. Levantá Forge en un GPU cloud (RunPod, Modal, Vast, etc.) con `--api --listen` y el checkpoint instalado.
2. Exponé el puerto 7860 por HTTPS y protegelo con autenticación. No dejes el endpoint abierto.
3. En Render → **Environment**:
   - `SD_URL=https://tu-endpoint-publico`
   - `SD_AUTH=Basic usuario:clave` (o `Bearer token`, o solo el token)
   - Opcional: `SD_TIMEOUT_MS=120000`, `SD_NEGATIVE=...`, `SD_CHECKPOINTS={"counterfeit":"Counterfeit-V3.0_fp16"}`
4. Verificá `https://TU-APP.onrender.com/api/image/health`. Debe devolver `ok: true` y el checkpoint activo.
5. En la app, creá o editá un personaje y usá **Generar imagen con IA**.

- En local: `SD_URL=http://127.0.0.1:7860` y Forge abierto con `--api`.
- El servidor agrega `adult, 18+` al prompt y un negativo con `child, minor, underage, teen, loli, shota, kid`. No quites esas protecciones.
- El backend implementado es Forge/A1111. **ComfyUI** usa otra API; si querés usarlo, hay que agregar un adaptador específico con tu workflow.

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
- **No está permitido**: contenido sexual con menores o personajes que aparenten ser menores, contenido no consentido, con animales o con personas reales. Esas prohibiciones están en el prompt del cliente y en el servidor.
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
