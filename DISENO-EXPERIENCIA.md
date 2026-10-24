# Nueva experiencia visual

La capa visual está en `public/experience.css` y `public/experience.js`, después de los estilos y scripts existentes. No requiere dependencias nuevas ni cambia el servidor.

## Incluye

- Inicio con encabezado nuevo, chats recientes y filtros plegables.
- Tarjetas de catálogo legibles, dos etiquetas visibles y acceso con teclado.
- Herramientas del chat agrupadas, campo de mensaje multilínea (Enter envía, Shift+Enter añade una línea), imágenes ampliables y controles de ambiente en Escena.
- Memoria con tarjetas editables, controles de confianza y afinidad, explicación del significado de afinidad y motivo del cambio con variación numérica.
- Creador con pasos nombrados, vista previa de datos y foto subida, errores accesibles y botones fijos al pie. En Revisión hay Atrás, Cancelar y Guardar.
- Animación SVG propia inspirada en las dos nubes del icono: se encuentran, se acercan y se acurrucan. Se muestra una vez por sesión y se puede repetir desde Perfil.
- Entrada automática tras 6,5 segundos, botón Entrar, Escape y respeto por la preferencia de movimiento reducido. La intro no sustituye ni evita la confirmación de mayoría de edad.
- Audio original proporcionado por el usuario, conservado sin conversión en `public/nubbi-intro.mp3`. El archivo recibido terminaba en `.wav`, pero contiene audio MPEG con cabecera ID3. Se intenta reproducir a los 2,35 segundos del encuentro. Si el navegador bloquea el sonido automático, el botón Escuchar «Nubbi» lo reproduce con interacción directa. Entrar y Escape detienen el audio.
- Service worker `nubbi-v16`, con los recursos nuevos y el audio disponibles sin conexión tras la primera carga.

## Probar

1. Ejecuta `npm run dev`. Al entrar en una pestaña nueva, observa la intro y prueba Escuchar, Entrar y Escape.
2. Confirma la mayoría de edad por separado. En Perfil, vuelve a reproducir la intro.
3. En Inicio, abre Filtros y orden; navega las tarjetas con Tab y Enter.
4. Abre un chat, escribe varias líneas y comprueba Enter/Shift+Enter. Prueba Herramientas y Escena → Ambiente del chat.
5. En Memoria, modifica los valores y edita un recuerdo. Envía «Gracias»: verifica el motivo y el incremento real; regenerar no debe puntuarlo otra vez.
6. En el creador, prueba los tres pasos, una foto local y el campo Nombre vacío. El pie debe permanecer accesible en pantalla pequeña.
7. Verifica temas claro/oscuro, pantalla móvil, teclado y movimiento reducido. La generación de imágenes requiere cuenta, cuota y proveedor configurados como antes.

No se ha completado aquí la migración de todos los textos históricos al español neutro. Los textos nuevos sí usan tuteo.
