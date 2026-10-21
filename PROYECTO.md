# Contexto de Nubbi (para agentes de IA)

Nubbi: app de chat con personajes de IA, español rioplatense casual. Todos los personajes son adultos (18+).
Estilo inspirado en apps de character chat. Diseño propio, violeta y celeste del logo.

Stack: Express (`server.js`) + front sin frameworks en `public/` (`index.html`, `style.css`, `app.js`, `catalog.js`).
- `/api/chat`: cualquier API compatible con OpenAI (por defecto Groq). Config en `.env` (`CHAT_BASE_URL`, `CHAT_API_KEY`, `CHAT_MODEL`).
- Modo adulto: `ADULT_CHAT_*` permite usar otro proveedor/modelo para pedidos con `adult:true`. Límites duros: +18, sin menores, sin no consentimiento, sin animales, sin personas reales.
- `/api/image`: Cloudflare Workers AI (FLUX.1 schnell, plan free) o Forge/A1111 local/remoto (`--api`) con `SD_AUTH` opcional. `GET /api/image/health` verifica el proveedor activo.
- Estado en localStorage (`nubbi-v1`); migra de `mochi-chat-v3`.
- Catálogo base en `public/catalog.js` (21 personajes, ids p0..p20). Retratos opcionales en `public/portraits/<id>.png`.
- Responsive: celu con barra inferior y chat a pantalla completa; PC con menú lateral y chat en panel derecho.
- PWA: `manifest.webmanifest` + `sw.js`.

Funciones: catálogo filtrable (género, tags, búsqueda), crear personaje (con IA y foto/retrato), perfil, favoritos,
emociones en cada respuesta, acciones entre *asteriscos*, modo chat/historia, escena y rol, "continuar historia",
intensidad Suave/Romántico/Intenso/Libre. Con el modo adulto activo, Intenso y Libre pueden incluir ficción sexual explícita entre adultos; sin modo adulto se mantienen sugerentes.

Fase 2 (comunidad): `public/community.js` + colecciones Firestore `communityCharacters`, `communityPosts`,
`communityPosts/{postId}/comments`, `creators` y `reports`. Reglas en `firestore.rules`; se publican con
`npm run deploy:rules`. Cualquiera puede explorar; publicar, comentar, dar me gusta y reportar requiere cuenta
real (no anónima). Las imágenes se comprimen en el cliente. Los bloqueos y el contenido oculto por reportes
se guardan aparte en localStorage (`nubbi-mod-v1`), sin subirse a la nube. Moderación manual desde Firebase Console.

Fase 3 (en curso): gate 18+ simple (`nubbi-adult-ok`), modo adulto opt-in, prompts explícitos solo para adultos y generación de imágenes con Cloudflare Workers AI (gratis, sin GPU, sin imágenes explícitas) o Forge/A1111 remoto. Pendiente: panel de moderación admin y credenciales de Cloudflare configuradas.

Reglas: leer antes de cambiar, no tocar `.env`, personajes siempre adultos. Nunca habilitar contenido sexual con menores, no consentido, con animales o con personas reales.
