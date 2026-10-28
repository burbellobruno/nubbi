# Textos contenidos, carrusel de estilos y colección única

Las filas de Chats usan una columna de texto que puede reducirse sin desplazar avatar u horario. Nombre y vista previa se recortan visualmente con puntos suspensivos; la conversación completa no se modifica.

Las siete tarjetas de estilo tienen un ancho mínimo estable y dos filas explícitas para título y descripción. El carrusel responde al ancho disponible del contenedor, también con un chat abierto. Permite desplazamiento horizontal, flechas anterior/siguiente y foco de teclado. Las flechas se ocultan si no hay desborde y respetan movimiento reducido/preferencia de animación.

Se elimina el destino y la vista Favoritos. Colección en Perfil conserva los mismos identificadores guardados en st.favs, sin migración ni borrado. El acceso antiguo go('favs') redirige a Perfil/Colección. Los corazones siguen guardando y quitando personajes; sus etiquetas hablan de colección. La navegación móvil tiene cinco elementos.

Caché pública v43. Sin cambios a proveedores, Firebase, generación, P1, respaldos o sincronización manual.

La prueba de navegador usa datos sintéticos con nombres y mensajes largos con/sin espacios, tamaño de fuente grande, temas claro/oscuro y anchos1440/1280/1024/1001/900/899/768/390/320. Comprueba límites de filas, legibilidad de tarjetas, scroll/flechas/foco, estilo elegido en creador, chat abierto, colección y conversaciones intactas y ausencia de errores/desbordamiento. No usa datos de testers ni realiza generación o login.
