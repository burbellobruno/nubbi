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
5. Imágenes: abrí Stable Diffusion WebUI Forge con `--api` y un modelo SD 1.5 de anime. En la nube esta función no funciona porque `SD_URL` apunta a `localhost`.
6. `npm run dev` y entrá a **http://localhost:3001**.
7. (Opcional) retratos del catálogo: `npm run portraits 3` para probar con 3, y sin número para todos.

## Producción en Render

- `.env` **no se sube** a GitHub (está en `.gitignore`). En Render las variables se cargan en **Environment**.
- Configuración recomendada:
  - `CHAT_BASE_URL` = `https://api.groq.com/openai/v1`
  - `CHAT_API_KEY` = tu clave de Groq (`gsk_...`)
  - `CHAT_MODEL` = `openai/gpt-oss-20b`
- **No definas `PORT` en Render**: Render lo asigna automáticamente y la app ya usa `process.env.PORT`.
- Para verificar la configuración activa, abrí `https://TU-APP.onrender.com/api/health`.

## Chat, libertad e idiomas

- En **Perfil → Configuración** podés elegir:
  - **Idioma del chat**: rioplatense, latinoamericano neutro, mexicano, colombiano, chileno, España, English o português (Brasil).
  - **Creatividad**: preciso, equilibrado, creativo o impredecible.
  - **Longitud de respuesta**: corta, normal o larga.
- En **Escena** podés elegir la intensidad, incluida **Libre** (el personaje toma la iniciativa y puede crear conflicto y tensión, sin contenido sexual explícito).
- En el chat tenés **Improvisar** (el personaje propone un giro) y **Regenerar** (vuelve a responder el último mensaje).

## Cuentas y sincronización

- La app funciona sin cuenta (modo invitado) y guarda todo en el dispositivo.
- Para crear una cuenta:
  1. En **Firebase Console → Authentication → Sign-in method**, habilitá **Email/Password**.
  2. En **Authentication → Settings → Authorized domains**, agregá tu dominio de Render (por ejemplo `nubbi.onrender.com`) si no está.
  3. En **Perfil → Cuenta**, completá email y contraseña, y tocá **Crear cuenta**.
- Al crear la cuenta se suben los datos locales. Al iniciar sesión podés elegir bajar los datos de la nube o subir los de este dispositivo.
- También podés usar **Subir a la nube** y **Bajar de la nube** manualmente.

## Instalarla como app

- PC (Chrome/Brave/Edge): ícono de instalar en la barra de direcciones.
- Celu (misma red wifi): abrí `http://IP-DE-TU-PC:3001` y "Agregar a pantalla de inicio".
