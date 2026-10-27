# Experiencia inmersiva de Nubbi

Implementación del 27 de octubre de 2026, sobre main después del PR #4. El objetivo es mejorar uso y continuidad con funciones verificables, sin prometer superioridad universal frente a otra aplicación.

## Interfaz y movimiento

Nueva capa immersive: entradas suaves de tarjetas, foco accesible, búsqueda con limpieza y contador de resultados, guía del creador por pasos, etiquetas asociadas a controles, lectura y contraste del chat, adaptación móvil y controles narrativos. Conserva bienvenida, preferencias, temas y movimiento reducido; no agrega animación continua costosa ni reemplaza imágenes guardadas.

## Narrativa y continuidad

Cuatro estilos: Conversación, Cinematográfico, Novela y Aventura. Son direcciones narrativas sobre el motor técnico elegido, no cuatro proveedores inventados. Extensión independiente por chat: breve, equilibrada, desarrollada o capítulo (hasta 3000 tokens solicitados). El servidor permite hasta 4096; el proveedor puede terminar antes o tener límites propios.

Los motores reales seleccionables son gpt-oss-20b y gpt-oss-120b mediante Groq; 20b sigue siendo predeterminado. La alternativa 120b se habilita por allowlist y se comprueba con una muestra segura; no se activa un plan pago ni se cambia billing. La cuota gratuita de Groq es compartida por organización y puede limitar un turno largo aunque el modelo admita contexto mayor. Las muestras no establecen un ganador ni una mejora perfecta de coherencia. Fuentes: [20b](https://console.groq.com/docs/model/openai/gpt-oss-20b), [120b](https://console.groq.com/docs/model/openai/gpt-oss-120b), [límites](https://console.groq.com/docs/rate-limits).

Hechos de continuidad de hasta 1600 caracteres por chat; instrucciones para preservar objetos, lugar y conocimiento, distinguir posesiones del usuario/personaje, respetar decisiones del usuario y evitar relleno. El contexto reciente se arma cronológicamente dentro de 30000 caracteres sin borrar el historial guardado. Memoria y ramas existentes se conservan. Para escenas románticas se usa ficción no explícita y elipsis.

La conversación nueva también se envía con roles de sistema, usuario y asistente separados; se conserva el prompt textual para compatibilidad. El servidor valida roles, tamaño y forma antes de contactar al proveedor. Esta separación reduce ambigüedad respecto a concatenar todo el diálogo como un solo mensaje de usuario, sin prometer que un modelo deje de cometer errores.

Cuatro muestras sintéticas reales a través del backend de producción devolvieron 200. La revisión detectó confusión de posesiones, se reforzó perspectiva y se repitieron las muestras. Esto comprueba funcionamiento y permite revisión cualitativa, no garantiza coherencia perfecta ni mide superioridad frente a Emochi.

## Imágenes

La opción Según el estilo usa Lucid Origin para ilustración y FLUX.1 schnell para realismo de menor consumo. Hay perfiles anime, webtoon, manhwa, manga, BL romántico, realista, 3D, semirealista, furry antropomórfico y fantasía. Una elección explícita previamente guardada tiene prioridad. Nuevos usuarios pueden elegir auto sin modificar defaults globales del servidor.

Cloudflare incluye una cuota gratuita compartida de 10000 neuronas/día; Lucid consume mucho más que FLUX. No es capacidad ilimitada por usuario ni garantía de que una plataforma de muchos usuarios pueda operar gratis. Se conservan autenticación, cuotas y rechazos del proveedor, sin reintentos que eludan políticas. No se certificó una comparación visual real de generación: las regresiones del proveedor son simuladas. FLUX.2 no se implementó sin un contrato de integración suficientemente validado.

## Personajes adultos y cuentas

El mínimo pasa de 21 a 18 años en creación, importación, publicación e imágenes.18/19/20 son válidos; 17 y edades contradictorias siguen rechazados. Los registros existentes no se reescriben.

Google se verificó mediante iniciación de URL OAuth en Firebase sin enviar credenciales ni iniciar sesión; el proveedor ya estaba habilitado. El botón usa popup y selector de cuenta. Facebook y X tienen implementación cliente pero permanecen deshabilitados: Firebase responde que su configuración no existe. Habilitarlos requiere aplicaciones OAuth y configuración por el dueño. No se crearon claves, apps ni cuentas nuevas. La iniciación OAuth no certifica un login completo con cuenta real.

No hay vinculación automática del invitado, mezcla de cuentas ni descarga automática. La migración/recuperación y sincronización manual de P1 siguen siendo explícitas. Las pruebas sociales simulan popup, cancelación, conflicto de cuenta y cuenta previa; no tocan Firestore ni datos de testers.

## Verificación

Doce suites locales incluyen regresiones P1, memoria, SSE/modelos, edades, imágenes, seguridad Firebase/VM, caché, narrativa y auth social. Nuevas pruebas browser verifican estilos/canon/extensión, contexto acotado con 80 mensajes largos y conservación del historial, guía y accesibilidad en cinco anchos. Ver resultados del commit final y despliegue en el PR. La caché pública sube a v37.

Fuentes primarias consultadas:
- [Emochi: modelos y enfoque narrativo](https://image-cdn.flowgpt.com/event/emochi-h5/model-system-upgrade/index.html). Se toman ideas de uso, no imágenes/personajes/código.
- [Cloudflare: precios y cuota](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Lucid Origin](https://developers.cloudflare.com/workers-ai/models/lucid-origin/).
- [Firebase Google](https://firebase.google.com/docs/auth/web/google-signin), [Facebook](https://firebase.google.com/docs/auth/web/facebook-login), [X/Twitter](https://firebase.google.com/docs/auth/web/twitter-login).
- [Hugging Face: pricing](https://huggingface.co/docs/inference-providers/pricing). No asumir inferencia alojada gratis por existir una ficha de modelo.
