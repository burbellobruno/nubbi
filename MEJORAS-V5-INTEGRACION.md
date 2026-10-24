# Integración selectiva de V5

Se conserva el proyecto de `Downloads/nubbi`: servidor, protecciones, autenticación de imágenes y catálogo de 27 personajes. No se reemplazan archivos con versiones antiguas del ZIP.

- Memoria explícita por personaje, con un máximo de 20 entradas y eliminación individual desde Memoria.
- Confianza y afinidad entre 0 y 100, controles manuales y evolución automática opcional.
- Solo los mensajes nuevos enviados por el usuario pueden modificar puntuaciones; regenerar o continuar no vuelve a puntuarlos.
- Detección conservadora de frases completas: no interpreta negaciones, ironía ni contexto complejo.
- Ficha visual, imágenes de escenas y visualización de respuestas con sesión y cuota del servidor existente. La semilla estable no garantiza identidad visual.
- Los mensajes de imagen se excluyen del contexto de conversación.
- Advertencia de almacenamiento lleno. Las imágenes siguen en localStorage; conviene exportar los datos.
- Corrección del cierre externo del creador; validación del nombre y errores dentro del asistente.
- Service worker `nubbi-v14`, posterior a `nubbi-v13` del ZIP.

## Pruebas

Ejecuta `node scripts/test-v5.js` y `npm run dev`.
En un chat, envía «Gracias» y verifica en Memoria +2 de confianza y +1 de afinidad. Regenera o continúa: las puntuaciones no deben repetirse. «No te quiero» no debe aumentar afinidad. Desactiva la evolución y comprueba que los valores permanecen iguales.

Envía «Recuerda que mi color favorito es azul» y verifica que aparezca una sola vez en Memoria. Guarda una rama y comprueba que sus valores no se comparten con otra rama.

Con una cuenta no anónima y el proveedor configurado, prueba Ficha visual, Crear imagen y Visualizar este mensaje. Sin sesión, debe solicitar iniciar sesión. No se han realizado llamadas reales de generación durante la integración.

En el creador: prueba nombre vacío, pasos 1→2→3, Atrás, Cancelar y Guardar. La migración completa de textos al español neutro solicitada anteriormente todavía no está terminada.
