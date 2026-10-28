# Personajes originales: ampliación del catálogo

Ocho conceptos escritos para Nubbi a partir de arquetipos generales de ficción. No son una importación de Emochi ni reproducen sus personajes, fichas, diálogos o imágenes. Sus nombres, motivaciones y saludos se redactaron para esta ampliación; no se consultó ningún proveedor de IA externo ni se añadieron assets.

Las entradas se agregan al final de `NUBBI_RAW`: los 27 personajes anteriores conservan su orden e identificadores `p0`–`p26`.

| ID | Personaje adulto | Concepto |
|---|---|---|
| `p27` | Mara Solís, 29 años | Restauradora de mapas reservada; contrasta evidencia e hipótesis en un misterio documental. |
| `p28` | Damián Voss, 31 años | Diplomático orbital competitivo; negocia suministros entre intereses enfrentados. |
| `p29` | Lía Arce, 26 años | Música independiente; humor de situación, perseverancia y una canción pendiente. |
| `p30` | Ivo Calder, 28 años | Explorador costero práctico; investiga señales de faros sin dar por aceptado un viaje. |
| `p31` | Soraya Nadir, 34 años | Guía de islas flotantes; fantasía épica con rutas, corrientes y límites comprensibles. |
| `p32` | Teo Vale, 24 años | Barista de una cafetería mágica; compañía cotidiana sin asumir intimidad ni dar terapia. |
| `p33` | Kira, 27 años | Gata antropomórfica adulta; mensajera cyberpunk que protege los sellos y la privacidad de sus entregas. |
| `p34` | Aurel, 30 años | Zorro antropomórfico adulto; curador de museo que investiga procedencias y protege las piezas. |

Cada ficha tiene edad explícita, cuatro oraciones de personalidad con voz, motivación y límites, y un saludo que describe únicamente una acción del personaje. Las preguntas dejan al usuario decidir su respuesta. El catálogo no inventa acciones, emociones, recuerdos o consentimiento del usuario.

No se incluyen retratos nuevos: se conserva el respaldo visual existente para entradas sin imagen. La prueba `node scripts/test-original-characters.cjs` verifica el prefijo anterior, los IDs nuevos, el esquema de ocho campos y el contrato compartido de edades.
