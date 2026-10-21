# Nubbi

App de chat con personajes de IA (adultos), para móvil y PC.

1. `npm install`
2. Copiá `.env.example` a `.env`
3. Chat: instalá Ollama y corré `ollama pull llama3.1:8b` (o cambiá `CHAT_*` por OpenRouter/Groq)
4. Imágenes: abrí Stable Diffusion WebUI Forge con `--api` y un modelo SD 1.5 de anime
5. `npm run dev` y entrá a http://localhost:3000
6. (Opcional) retratos del catálogo: `npm run portraits 3` para probar con 3, y sin número para todos

## Instalarla como app
- PC (Chrome/Brave/Edge): ícono de instalar en la barra de direcciones
- Celu (misma red wifi): abrí `http://IP-DE-TU-PC:3000` y "Agregar a pantalla de inicio"
