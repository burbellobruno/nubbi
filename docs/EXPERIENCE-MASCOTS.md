# Mascotitas de experiencias

Veinte ilustraciones vectoriales originales de Nubbi, construidas con formas y trazos SVG manuales. No son imágenes de un modelo ni reproducciones de personajes de otras aplicaciones. El sprite `public/experience-mascots.svg` no incluye scripts, recursos externos, fuentes, filtros ni animaciones; sus fondos son transparentes.

Cada símbolo usa un lienzo `0 0 64 64`, contorno oscuro de 2,5 unidades, ojos sencillos y una silueta reconocible a 32 px. Los colores están fijados para conservar su identidad en ambos temas. La identidad no depende solo del color: cambian orejas, silueta, rostro y accesorio.

| Experiencia / ID | Nombre original | Concepto y rasgo distintivo | Color principal |
|---|---|---|---|
| pulso / `exp-pulso` | Pipa | Gatita redonda con rombo sobre la frente | Rosa `#F699C4` |
| escena / `exp-escena` | Lumo | Conejito de orejas rectas y estrella lateral | Cielo `#8DD8F5` |
| novela / `exp-novela` | Tinta | Búho con antifaz crema y penacho vegetal | Lavanda `#C2A6EF` |
| vinculo / `exp-vinculo` | Mimo | Perrito de orejas caídas con corazón | Arena `#E8B98C` |
| aventura / `exp-aventura` | Risco | Zorrito de orejas puntiagudas y pañuelo | Mandarina `#FFA86F` |
| universo / `exp-universo` | Nimbo | Criatura flotante con anillo inclinado | Azul `#92BCFF` |
| brisa / `exp-brisa` | Sopi | Nubecita irregular con brote amarillo | Menta `#B4E6D3` |
| chispa / `exp-chispa` | Firu | Pollito estrellado con mechón de rayo | Miel `#FFCF69` |
| aurora / `exp-aurora` | Irisu | Conejita de cuerno menta y mechón dorado | Malva rosa `#F3B7DA` |
| umbra / `exp-umbra` | Nocti | Murciélago de alas altas con luna | Violeta azul `#9C9BE3` |
| saga / `exp-saga` | Broli | Dragoncito con cresta y pequeñas aletas | Salvia `#91D4AD` |
| orbita / `exp-orbita` | Bumi | Osito con antena de planeta | Melocotón `#FFBB8D` |
| eco / `exp-eco` | Ruli | Carnerito nuboso con espiral dorada | Jade claro `#A8DAD1` |
| dueto / `exp-dueto` | Nali y Nilo | Dos caritas enlazadas bajo un corazón | Rosa `#F9B4BF` y azul `#A6D7F6` |
| enigma / `exp-enigma` | Velo | Mapachito con antifaz y mechón interrogante | Pervinca `#B3B9EB` |
| cronista / `exp-cronista` | Foli | Osito con gafas redondas y pluma verde | Avellana `#D5AF90` |
| refugio / `exp-refugio` | Abrí | Osito abrigado con gorrito de tejado | Crema `#F0D5AC` |
| umbral / `exp-umbral` | Dori | Duendecillo encapuchado con llave lateral | Lila `#C5ADDE` |
| neon / `exp-neon` | Biti | Robot de visor turquesa y antena rosa | Violeta `#A6A5EC` |
| marea / `exp-marea` | Ondi | Ballenita con aletas y estrella de mar | Agua `#83D9E5` |

## Uso y accesibilidad

```html
<svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <use href="/experience-mascots.svg#exp-pulso"></use>
</svg>
```

Cuando la experiencia tenga nombre visible, el dibujo es decorativo y se oculta a lectores de pantalla, como en el ejemplo. Si se usa solo, el control necesita un nombre accesible que describa la acción o experiencia, no únicamente el animal. No reemplazar el texto, estado seleccionado o foco por color. Mantener botones de al menos 44 px de área aunque el dibujo mida 32 px.

Los símbolos no se muestran directamente con `<img src="…#exp-pulso">`: usar `<svg><use>` del mismo origen. El sprite no impone estados de interacción, movimiento, audio ni preferencias. Su integración no requiere generación de imágenes, claves ni solicitudes a proveedores.
