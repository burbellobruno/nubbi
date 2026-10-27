# Motores y dirección de imágenes de Nubbi

Revisión del 27 de octubre de 2026. Se comparan integración, licencia y coste; no se afirma una superioridad visual sin imágenes reales del mismo conjunto de prueba.

## Decisión implementada

Se incorpora **FLUX.2 klein 4B** como alternativa explícita marcada «candidato», conservando las elecciones guardadas y el automático existente. La API Cloudflare requiere multipart incluso para texto: prompt, dimensiones y semilla; el modelo usa cuatro pasos fijos. No se envían referencias privadas ni se habilitan cobros. [Especificación oficial](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/).

Sus pesos 4B tienen licencia Apache 2.0; eso no convierte el alojamiento en gratuito ilimitado. Cloudflare ofrece 10.000 neuronas diarias compartidas: Klein 4B factura 26,05 por mosaico de salida de 512² frente a 636 de Lucid, más pasos para este último. La disponibilidad y la cuota dependen de la cuenta. [Modelo del autor](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) · [Tarifas oficiales](https://developers.cloudflare.com/workers-ai/platform/pricing/).

| Ruta | Uso que vale la pena evaluar | Condición real |
| --- | --- | --- |
| FLUX.2 klein 4B / Cloudflare | Generalista para comparar estilos y composición con menor consumo que Lucid | Integrado como candidato; sin comparación visual real certificada |
| Lucid Origin / Cloudflare | Ilustración, anime, manhwa y semirrealismo | Ya integrado; consumo alto, no especializado en todos los estilos |
| FLUX.1 schnell / Cloudflare | Borradores rápidos y fotografía | Ya integrado; mantenerlo como alternativa económica |
| Animagine XL 4.0 | Anime y adaptación ilustrada de romance masculino/manhwa | Pesos gratuitos; requiere GPU/alojamiento y pruebas específicas |
| Modelo especializado furry | Anatomía y especies antropomórficas | Verificar licencia de cada versión y probarlo antes de recomendarlo para producción |

Para esa última ruta, [Neta Lumina](https://huggingface.co/neta-art/Neta-Lumina) documenta anime y furry y publica el modelo bajo Apache 2.0. Su instalación indicada requiere ComfyUI y al menos 8 GB de VRAM, por encima de los 6 GB de esta PC; también hay que revisar las condiciones de sus componentes. [NoobAI XL 1.1](https://huggingface.co/Laxhar/noobai-XL-1.1/raw/main/README.md) se descarta para el objetivo comercial de Nubbi: el autor prohíbe comercializar el modelo, derivados y productos generados. No se instala ninguno de ellos.

[Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) es un ajuste SDXL orientado a anime. Su ficha recomienda prompts por etiquetas, aproximadamente 28 pasos y resoluciones SDXL. No hay que confundir que un modelo exista en Hugging Face con disponer de una API gratuita de inferencia. La consulta directa actual a la tarifa de Inference Providers indica que las cuentas gratuitas no incluyen créditos; deben comprarlos o pasar a PRO. Un resultado indexado anterior todavía mostraba 0,10 USD: se prioriza la tabla actual, no esa referencia desactualizada. [Créditos HF](https://huggingface.co/docs/inference-providers/pricing).

BL es un género de romance, no una única estética. Nubbi lo interpreta como ilustración de romance masculino adulto; puede necesitar después una selección separada de acabado anime, manhwa o realista. Furry requiere mantener especie, hocico, pelaje y postura antropomórfica, no solo añadir una etiqueta genérica. Ninguno de estos motores garantiza manos, composición o identidad constantes.

## Inspiración comprobada de Emochi

La guía oficial distingue subir una imagen terminada de usar una referencia para generar otra; también permite escoger estilos y seleccionar entre resultados. No identifica el motor subyacente: no se inventa ese dato ni se copian recursos. Nubbi toma como criterio separar estilo, apariencia y momento de escena. Generar automáticamente cuatro variantes multiplicaría el consumo, por lo que esta entrega mantiene una solicitud por acción. [Modo experto de Emochi](https://guide.emochi.com/howto/expert-mode).

## Defectos corregidos en Nubbi

- El chat forzaba anime: ahora hereda el estilo del personaje o utiliza la elección explícita de esa historia.
- Editar un personaje perdía el estilo: se guarda y restaura; exportación/importación local también lo conserva. Personajes antiguos tienen fallback anime sin reescribirlos.
- El prompt de una escena agregaba «portrait»: ahora diferencia escena y retrato.
- El historial y la descripción largos podían ocultar el último hecho: se reserva espacio para identidad, entorno y momento elegido, sin borrar el historial almacenado.
- La ficha visual ignoraba el prompt de apariencia del personaje: ahora se utiliza cuando no existe una ficha personalizada.
- Cloudflare ignoraba semilla y dimensiones solicitadas: se validan antes de consumir cuota y se transmiten donde el modelo lo documenta. Una semilla no garantiza identidad.
- Una imagen tardía podía reemplazar el borrador de otro personaje: las operaciones comprueban propietario, editor y versión antes de aplicar el resultado.

## Qué falta para declarar un ganador visual

El adaptador y la experiencia pueden verificarse con proveedores simulados; la calidad requiere generación real autenticada. Comparar al menos dos semillas por estilo con los mismos personajes ficticios adultos, medir cumplimiento de rasgos, estilo, anatomía, número de sujetos y escena, y registrar modelo real, latencia y errores. No usar imágenes de testers como referencia ni confundir salud/configuración del proveedor con una generación real aprobada.

El equipo inspeccionado tiene RTX 3050 Laptop de 6 GB y unos 16 GB de RAM. No se descargaron modelos ni se instaló un servidor GPU. El uso local con optimizaciones puede investigarse, pero no demuestra capacidad para alojar una plataforma pública permanente ni elimina costes de electricidad y mantenimiento.
