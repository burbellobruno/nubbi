# Continuidad, memoria y personalidad: primera mejora

## Fallos corregidos

- El contexto de un turno largo conservaba el principio y podía descartar una rectificación final. Ahora se preservan inicio y final con una marca de omisión; el historial original no se modifica.
- Un resumen extenso ocupaba el presupuesto y dejaba fuera recuerdos nuevos. Resumen, citas fijadas y declaraciones explícitas del usuario tienen reservas independientes. Las notas se deduplican y ordenan por fecha sin modificar sus arrays; una nota demasiado larga no se corta como si fuera un hecho completo.
- Las declaraciones breves se conservan completas: ya no se guarda solo el inicio de una frase que puede terminar con una negación.
- El resumen solicitado podía llegar a un borrador de otro chat o pisar una edición. Se descartan resultados si cambia la cuenta, el chat, la sesión del diálogo o el borrador. Una respuesta vacía/error no borra nada. Guardar y limpiar realizan la escritura antes de cambiar el estado vivo; una cuota fallida conserva el borrador y los datos anteriores.

## Registro de escena

Herramientas → Memoria incorpora cuatro anclas opcionales por conversación: lugar/momento, objetos del usuario, objetos del personaje y acuerdos pendientes. Son datos editables y confirmados por el usuario; no extracción automática ni memoria ilimitada. Se incluyen como registro estructurado que distingue USUARIO/PERSONAJE. Un hecho posterior confirmado puede actualizar el punto de partida; una propuesta no equivale a un viaje o entrega.

Se guardan con el resumen solo al pulsar Guardar. Cerrar descarta los cambios del borrador. Los campos adicionales son cadenas opcionales, compatibles con snapshots antiguos, respaldos, ramas y sincronización manual por UID/invitado. No se migra ni borra información existente. Los campos importados de tipo incorrecto se rechazan antes de reemplazar datos.

## Interpretación

La personalidad se presenta antes de la afinidad; las puntuaciones no sustituyen límites ni preferencias de la ficha. Se refuerza la perspectiva del usuario y se evita sugerir recuerdos compartidos inventados. Continuar sigue el asunto pendiente sin exigir un giro nuevo. El motor elegido y las veinte experiencias siguen siendo elecciones separadas.

El botón Resumir sigue siendo una petición manual y produce un borrador revisable. Se centra en hechos confirmados, negaciones, posesión, acuerdos e incertidumbres. No añade llamadas automáticas por turno. Relación y recuerdos guardados se agrupan en un desplegable; los controles de guardar permanecen accesibles en el diálogo.

## Evidencia y límites

Las pruebas deterministas cubren presupuestos, UTF-8/JSON, papeles, notas completas, estados manuales, correcciones al final, fuentes históricas, errores, cuenta bloqueada/cambio de chat/reapertura, edición manual, limpieza y escritura fallida. Navegador con historial sintético largo comprueba envío, protección de borradores, guardado explícito y recarga en escritorio/móvil.

Las primeras pruebas reales sin registro estructurado fallaron en posesión de objetos con ambos motores. El registro dio cuatro respuestas correctas de posesión en20B/120B. Ambos evitaron convertir una propuesta en viaje y mantuvieron el límite ficticio de un personaje reservado con afinidad alta. En la actualización de posesión tras una entrega,120B siguió el cambio y20B produjo una contradicción. No se afirma memoria perfecta ni que el resumen generado sea infalible; el usuario debe revisar anclas y borradores. El motor no se cambia automáticamente y no se eliminan límites ni protecciones.

Los casos reales usan adultos y claves de ficción, no datos de testers ni credenciales. Algunas peticiones de investigación recibieron429; no se quitaron protecciones ni compraron créditos. Resultados crudos y limitaciones se entregan en outputs/story-continuity-*.json. Caché pública v44.
