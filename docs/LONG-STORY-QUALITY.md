# Historias completas, experiencias y controles del chat

## Qué cambia

- Memoria y Director quedan visibles junto a Experiencias; Acción y las herramientas secundarias pasan a Más. Se reutilizan sus mismos botones y funciones. En móvil se organizan en dos filas, sin un carrusel que oculte los controles principales.
- Las respuestas no están obligadas a añadir un gesto ni dos frases a una pregunta cerrada. Se refuerza conservar objetos, no describir características de objetos ocultos y evitar repetir gestos o tareas ya resueltas.
- Cada experiencia tiene un foco breve permitido por el sistema que se recuerda en el turno. La personalidad, los hechos y los límites conservan prioridad. Se facilita cambiar el motor desde la cabecera del selector y cada tarjeta muestra su recomendación.
- El predeterminado de despliegue pasa a `openai/gpt-oss-120b`. `openai/gpt-oss-20b` sigue en la lista y las preferencias explícitas por cuenta/chat siguen teniendo prioridad. No se cambia de modelo como fallback oculto. `render.yaml` y `.env.example` documentan el mismo valor; la configuración existente de Render se actualiza por mezcla de las dos claves no secretas `CHAT_MODEL` y `CHAT_MODEL_ALLOWLIST`, preservando las demás. No se modifican planes, cuotas, claves ni proveedores.

Son perfiles de escritura originales sobre los motores existentes, no modelos entrenados nuevos.

## Prueba real de 30 turnos por motor

Las dos conversaciones completas están en [baseline-20b.json](long-story-eval/baseline-20b.json) y [baseline-120b.json](long-story-eval/baseline-120b.json). Hay 30 intercambios por conversación, 60 respuestas reales del proveedor en total y 120 mensajes almacenados en la evidencia. Los mensajes del usuario fueron escritos como un guion de prueba; las respuestas del personaje no fueron preparadas ni simuladas.

Se capturó el `sys` real de la aplicación con un invitado sintético local y se usó el constructor de contexto real y `/api/chat` de producción. Los eventos SSE registran el motor informado por el proveedor y el servidor, uso y motivo de finalización. No hubo errores de proveedor ni cortes por tokens en estas dos corridas. No se usaron cuentas reales, Firebase ni datos de testers. Todos los personajes son adultos ficticios.

El escenario incluye una mochila cerrada, una llave que pasa a la mesa y después al personaje, una corrección de dos a tres campanadas, un alias nuevo, preguntas sobre un sobre oculto y un límite propio del personaje. Las anclas iniciales de memoria no se actualizaron después: se prueba que las acciones posteriores prevalezcan sobre ellas. Escena se usa en turnos1–16, Chispa17–24 y Enigma25–30 con extensión normal controlada. Hay una incongruencia de prueba entre la descripción que pide voseo y la preferencia de idioma neutro que exige tuteo: no se usa el pronombre para puntuar personalidad.

### Hallazgos revisados

| Comprobación | 20B, corrida completa | 120B, corrida completa |
| --- | --- | --- |
| Alias inicial y cambio a Cobre | Conservados | Conservados |
| Esperar tres campanadas tras la corrección | Conservado | Conservado |
| Mochila y contenido del sobre | Respeta cierre en10/26; en16 inventa peso y textura no observados | Conserva la incertidumbre sobre el contenido |
| Posesión y ubicación de objetos | En4 se atribuye el cuaderno; en11 cambia mesa por suelo; en12 cambia a mano del usuario; en29/30 mezcla estados incompatibles | Conserva el estado final de la llave tras la entrega y el inventario del usuario |
| Límite del personaje ante presión afectiva | Lo conserva, con negativa genérica | Lo conserva, con negativa genérica |
| Recuerdo sugerido por una pregunta | Añade detalles pasados no establecidos | Declara no recordar; la pregunta presupone una visita, por lo que el caso es ambiguo y no se toma como prueba absoluta de falsedad |

La medición descriptiva encontró comienzos de acciones repetidos, pero no párrafos largos idénticos. No se eliminan ni sustituyen frases de la respuesta mediante filtros. Las repeticiones son señales para revisión, no un detector automático de mala narrativa.

## Cambios y comprobaciones posteriores

Se conservaron los resultados de la primera variante en `candidate-v1-*.json`, incluida una diferenciación débil entre Pulso y Chispa. La variante final está en `candidate-*.json`: cinco respuestas generadas de nuevo contra prefijos exactos de la corrida original (turnos4/12/14/16/30), más cuatro perfiles por motor sobre el mismo personaje y mensaje. No son otras dos conversaciones completas; son regresiones dirigidas y una comparación controlada. No hubo reintentos por un resultado narrativo desfavorable. Las muestras auxiliares `candidate-memory-*.json` corresponden a la variante anterior al foco por turno.

En la variante final, 120B mantuvo la llave sobre la mesa, la incertidumbre del sobre y el inventario tras la entrega. 20B mejoró algunos casos, pero volvió a ubicar mal la llave en el replay12 y produjo una transición ambigua en30. Por eso las instrucciones no se presentan como cura de 20B: se elige 120B como predeterminado y se conserva20B para quien lo prefiera. Una negativa de120B todavía puede sonar impersonal; no se certifica una voz perfecta.

La comparación final hizo visible la ironía breve de Chispa en120B, una respuesta más desarrollada de Novela y la distinción entre observación, hipótesis y comprobación de Enigma. En20B la diferenciación fue menos consistente. Solo se probaron estos cuatro perfiles en una escena controlada por motor; no es una validación estadística de todos los perfiles ni una afirmación de superioridad general sobre otras aplicaciones.

## Reproducir sin llamadas accidentales

- `node scripts/eval-long-stories.cjs` solo muestra ayuda y no llama al proveedor.
- Con un servidor local en43984 y Playwright/Edge configurados como en el resto de pruebas: `node scripts/capture-story-eval.cjs review/story-eval-systems.json` captura únicamente datos de un invitado sintético. Bloquea servicios externos y escrituras remotas; la exportación temporal de funciones privadas se inyecta solo en esa sesión de prueba.
- Ejecución explícita: `node scripts/eval-long-stories.cjs --real --systems review/story-eval-systems.json --output review/new-run`. Esto consume la asignación existente del proveedor, usa dos motores y espera entre solicitudes. No compra créditos ni cambia cuotas. `--resume` exige los mismos hashes de instrucciones y código.
- `node scripts/test-long-story-evidence.cjs` verifica la integridad de los archivos históricos. `--match-current` comprueba además que los archivos de producción evaluados coincidan con esta versión. No comprueba verdad semántica.
- Regresiones y perfiles: `node scripts/eval-story-probes.cjs --real --systems review/story-eval-systems.json --baseline docs/long-story-eval --output review/new-probes` solicita cinco replays y cuatro perfiles por motor. `--without-focus` permite comparar sin el refuerzo final. Nunca reemplaza una carpeta de evidencia existente.
- `scripts/story-eval-metrics.cjs` mide extensión, finales interrogativos, cortes y coincidencias de frases. Sus cifras no constituyen una calificación automática de coherencia.

P1, la migración y recuperación explícitas, sincronización manual y separación por UID/invitado permanecen. El chat sigue siendo ficción no explícita; no se cambian controles de contenido. Las pruebas de autenticación/Firebase y generación de imágenes siguen siendo simuladas, sin certificación de integración real. Tampoco se activan pagos ni aplicaciones OAuth.
