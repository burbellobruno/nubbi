# Personas e interpretación narrativa

Perfil → Tus personas permite elegir retratos JPEG, PNG o WebP, tanto propios como de IA descargados. Vista previa, quitar, cancelar y editar conservan la identidad de la persona y las selecciones de cada chat. Los archivos se validan (firma, 8 MB, 8192 píxeles por lado y 24 MP), se recortan al centro y recodifican como JPEG de 512 × 512 en el dispositivo. No se envían al generador ni se analizan para inferir apariencia: el campo Apariencia sigue siendo la descripción para el personaje. JPEG/WebP comprueban dimensiones después de decodificar; no se garantiza un límite estricto de memoria ante archivos patológicos.

El retrato pertenece al estado privado separado por UID/invitado. Solo una sincronización manual lo incluye en el respaldo. Una escritura fallida mantiene el diálogo y el estado anterior. Cancelar o cambiar de cuenta invalida el procesamiento pendiente. Personas antiguas sin imagen siguen siendo compatibles.

Los chats nuevos comienzan en modo historia cinematográfica. Los chats existentes conservan sus preferencias. Las instrucciones separan personalidad, emoción y relación, refuerzan vocabulario y decisiones propios, respuesta a la acción inmediata, progresión concreta y agencia del usuario. La afinidad no se interpreta como amor ni consentimiento. Conversación, Novela y Aventura siguen disponibles. Se mantiene el contexto acotado con roles y el historial guardado.

La lectura usa párrafos, énfasis y acciones diferenciadas, con texto del modelo tratado como texto inerte. Se respetan tema y preferencias de movimiento.

## Validación y límites

Pruebas locales de almacenamiento, reglas Firebase en VM, seguridad/CSP, cuotas, modelos, roles y contexto; navegador Edge con datos sintéticos en cinco anchos (1440/1024/768/390/320), imágenes y edición de personas, cancelación, fallo de almacenamiento, separación entre cuentas y 32 grupos P1. Las respuestas de las pruebas funcionales se simulan y no certifican Firebase real ni login completo.

Una muestra real sintética de dos turnos por motor devolvió 200 e identificadores 20B/120B correctos. 20B mantuvo la voz inicialmente pero añadió una frase incoherente; 120B hizo avanzar la acción de la ventana y conservó la voz, aunque contradijo un dato del canon. Por eso no se cambia el motor global ni se promete memoria perfecta. 120B sigue seleccionable desde Perfil. Son cuatro llamadas de muestra, no una evaluación general de calidad. La última regla de respuesta inmediata se añadió después de esa comparación; no tiene comparación A/B real.

No se activan cobros ni proveedores sociales. Facebook y X quedan en pausa por pedido del dueño. No se modifican datos de testers ni el checkout de Descargas.
