# Separación de narración y diálogo

La captura del dueño muestra acciones sin marcar, narración mezclada con palabras pronunciadas y un asterisco huérfano. Se corrigen dos capas:

- Las instrucciones comunes a las veinte experiencias exigen acciones/descripciones/pensamientos en párrafos propios entre asteriscos cerrados y palabras pronunciadas en párrafos separados con raya. Incluyen un ejemplo y prohíben presentar gestos como réplicas.
- El renderizador seguro distingue texto, acciones y énfasis. Una línea de diálogo con raya corta una acción sin cerrar; un cierre huérfano al final de una réplica no queda visible. Acciones multilínea, streaming, texto literal e HTML inerte se conservan. No reescribe historial ni intenta inferir semánticamente si una frase sin marcas era narración o diálogo.

Una frase antigua sin marcas puede seguir como texto normal: no se modifica su significado ni el almacenamiento. Las reglas nuevas se aplican a respuestas siguientes en todas las experiencias. No se añaden llamadas de corrección ni costes por mensaje. Caché pública v42, sin cambios a P1, sincronización, perfiles, proveedores o límites.

Pruebas: parser puro con marcas incompletas, cierre huérfano, diálogo dentro de acción abierta, acciones multilínea, HTML inerte y asteriscos literales; navegador real con SSE malformado en1440/390, separación visual y contenido guardado intacto. Pruebas de proveedor real con adultos ficticios usando20B/120B: ambas muestras separaron acción/voz y cerraron marcas. La muestra20B confundió un pronombre de la respuesta; no se certifica coherencia perfecta ni que todos los turnos futuros obedezcan el formato.
