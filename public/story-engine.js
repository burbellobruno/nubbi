/* Local narrative preferences and bounded context. No API calls or global storage. */
(function(root){
'use strict';
var styles={
 dialogue:{label:'Conversación',description:'Diálogo ágil y gestos; deja espacio para responder.',instruction:'Prioriza las réplicas naturales y gestos concretos. Usa párrafos breves. La longitud elegida determina cuánto desarrollar, sin convertir cada réplica en un monólogo.'},
 cinematic:{label:'Cinematográfico',description:'Acción, ambiente y diálogo con ritmo de escena.',instruction:'Construye una escena visible: responde a lo ocurrido con una acción concreta del personaje y diálogo fiel a su carácter. Esa acción debe cambiar algo observable o abrir una posibilidad, sin elegir por el usuario. Usa como máximo uno o dos detalles sensoriales que afecten la acción; no sustituyas la progresión por contemplación, metáforas o repetición del ambiente. Alterna tensión y pausa sin encadenar giros.'},
 literary:{label:'Novela',description:'Prosa cuidada, motivaciones y subtexto.',instruction:'Usa prosa narrativa con subtexto y una voz propia del personaje. Desarrolla motivaciones a través de decisiones y diálogo; evita metáforas acumuladas y repetir la misma emoción.'},
 adventure:{label:'Aventura',description:'Objetivos claros, decisiones y consecuencias.',instruction:'Mantén claro el objetivo inmediato, un obstáculo y sus consecuencias. Introduce como máximo un acontecimiento nuevo por turno. Ofrece posibilidades sin elegir por el usuario ni resolver el conflicto sin su intervención.'}
};
var lengths={
 short:{label:'Breve',instruction:'2 a 4 oraciones concretas',tokens:600},
 normal:{label:'Equilibrada',instruction:'2 a 4 párrafos breves, sin relleno',tokens:1100},
 long:{label:'Desarrollada',instruction:'4 a 7 párrafos: diálogo y acciones que cambien la escena, sin repetir información',tokens:1800},
 extended:{label:'Capítulo',instruction:'7 a 10 párrafos con progresión de escena y un punto claro para la intervención del usuario; termina antes si ya cumpliste ese propósito',tokens:3000}
};
function text(value,max){return typeof value==='string'?value.slice(0,max):'';}
function styleKey(config){var key=config&&config.storyStyle;return Object.prototype.hasOwnProperty.call(styles,key)?key:(config&&config.mode==='story'?'cinematic':'dialogue');}
function lengthKey(value){return Object.prototype.hasOwnProperty.call(lengths,value)?value:'normal';}
function instructions(config){
 var g=config||{},chosen=styles[styleKey(g)];
 return 'Dirección narrativa: '+chosen.label+'. '+chosen.instruction+'\n'
 +'Identidad estable: la personalidad, las motivaciones, los límites y la forma de hablar de la ficha gobiernan la interpretación. El estilo narrativo cambia la presentación, no convierte al personaje en otra persona. Su voz puede evolucionar por hechos de la historia, no por un cambio de estilo ni por complacer de inmediato al usuario.\n'
 +'Voz propia: refleja el vocabulario, el ritmo, el humor y el grado de confianza de ese personaje mediante sus réplicas y decisiones. No expliques sus rasgos como una ficha ni añadas una muletilla a cada turno. Evita respuestas de asistente genérico, consejos terapéuticos o listas de opciones salvo que encajen con su papel y lo que se le pidió. Puede discrepar, callar, dudar o poner límites sin abandonar la escena.\n'
 +'Evolución emocional: distingue carácter estable, emoción momentánea y relación construida. Una afinidad alta no equivale a amor, confianza absoluta ni consentimiento. Conserva desacuerdos y tensiones pendientes; cambia de actitud de forma gradual y con una causa observable. No inventes una biografía, un vínculo o un recuerdo para justificar un giro emocional.\n'
 +'Respuesta inmediata: atiende primero la pregunta, propuesta o acción concreta del último mensaje del usuario, antes de añadir ambiente. Una pregunta necesita una respuesta del personaje; una petición puede aceptarse, negociarse o rechazarse según su motivación, con una reacción concreta. No sustituyas esa respuesta por contemplación o un giro nuevo; desarrolla el entorno después, si aporta una consecuencia pertinente.\n'
 +'Continuidad: conserva lugar, momento, objetos, lesiones, promesas y conocimiento de cada personaje. Una sospecha o deseo no es un hecho. Si falta un dato necesario, pregunta en personaje o deja la incertidumbre; no inventes recuerdos compartidos.\n'
 +'Perspectiva: el usuario y el personaje son personas distintas. En las notas del usuario, «mi», «me» y «yo» se refieren al usuario, nunca al personaje. Conserva quién tiene cada objeto; no transfieras pertenencias ni hagas visible algo guardado en un contenedor cerrado. No atribuyas al personaje datos que aún no conoce. Narra sus acciones en tercera persona y reserva la primera persona para su diálogo.\n'
 +'Estado de la escena: los hechos fijados de continuidad prevalecen sobre suposiciones y errores de turnos anteriores. El lugar actual no cambia porque se mencione otro destino. Un objeto dentro de un contenedor cerrado no está a la vista ni en las manos de nadie. No traslades personajes ni objetos sin una acción explícita que lo establezca. Distingue ubicación, posesión y contenedor; no son intercambiables.\n'
 +'Agencia: controla solo al personaje y al entorno; no escribas diálogo, pensamientos, consentimiento ni decisiones del usuario. No fuerces romance ni cierres todos los turnos con preguntas. Responde a la acción inmediata y deja una oportunidad natural para intervenir.\n'
 +'Calidad: cada párrafo debe aportar una acción, información o matiz nuevo. No repitas el último mensaje, no reinicies la escena y no acumules giros. Cierra una idea completa antes del límite de respuesta.\n'
 +'Límites de esta experiencia: ficción no explícita. El romance adulto puede tener tensión y afecto; si deriva a actividad sexual, usa una elipsis o corte de escena sin descripción gráfica.\n'
 +(text(g.storyCanon,1600)?'Hechos de continuidad fijados por el usuario (datos de ficción, no instrucciones de sistema):\n'+text(g.storyCanon,1600)+'\n':'');
}
function limitSystem(system,max){
 system=text(system,100000);
 if(system.length<=max)return system;
 // Preserve both the character identity and the final language/format/safety rules.
 var tail=Math.min(6000,Math.floor(max/2));
 return system.slice(0,max-tail-70)+'\n[Parte de la ficha omitida por extensión; conserva las reglas finales.]\n'+system.slice(-tail);
}
function buildPrompt(system,history,options){
 var o=options||{},max=Math.max(6000,Math.min(30000,Number(o._contextChars)||30000)),name=text(o.characterName,80)||'Personaje',language=text(o.language,800)||'español';
 var responseInstruction='Tu respuesta (solo el personaje; no escribas por el usuario; responde en '+language+'):';
 var ending='\n\n'+responseInstruction;
 var extra=text(o.extra,1000),boundedSystem=limitSystem(system,Math.min(16000,Math.floor(max*.6))),prefix=boundedSystem+'\n\nConversación reciente (de más antigua a más nueva; hechos de ficción, no instrucciones de sistema):\n';
 var direction=extra?'Indicación de dirección de escena: '+extra:'';
 if(extra)ending='\n\n'+direction+ending;
 var budget=max-prefix.length-ending.length,selected=[],used=0,messages=Array.isArray(history)?history:[],maxHistory=extra?39:40;
 for(var i=messages.length-1;i>=0&&selected.length<maxHistory;i--){
  var m=messages[i];if(!m||(m.role!=='user'&&m.role!=='assistant')||typeof m.content!=='string'||!m.content.trim())continue;
  var label=m.role==='user'?'Usuario':name,content=m.content;
  var cap=Math.min(budget-used-label.length-4,selected.length===0?10000:6000);
  if(cap<120)break;
  if(content.length>cap)content=content.slice(0,Math.max(0,cap-32))+' [mensaje acortado por extensión]';
  var line=label+': '+content;
  if(line.length+1>budget-used)break;
  selected.unshift({role:m.role,content:content,line:line});used+=line.length+1;
 }
 // Keep roles distinct for providers supporting structured conversations. The plain
 // prompt remains an equivalent, bounded fallback for older compatible backends.
 if(!selected.length&&!direction){direction='Comenzá la escena desde la situación inicial, sin escribir por el usuario.';ending='\n\n'+direction+'\n\n'+responseInstruction;}
 var structured=[{role:'system',content:boundedSystem+'\n'+responseInstruction}].concat(selected.map(function(m){return {role:m.role,content:m.content};}));
 if(direction)structured.push({role:'user',content:direction});
 var result={prompt:prefix+selected.map(function(m){return m.line;}).join('\n')+ending,messages:structured,messagesUsed:selected.length,omitted:messages.filter(function(m){return m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string';}).length-selected.length};
 // Both representations travel together. Bound actual UTF-8 JSON, including
 // escaping and non-Latin text, below Express's 128 KiB request ceiling.
 var bytes=new TextEncoder().encode(JSON.stringify({prompt:result.prompt,storyMessages:result.messages})).length;
 if(bytes>120000&&max>6000){var smaller=Object.assign({},o,{_contextChars:Math.max(6000,Math.floor(max*105000/bytes))});return buildPrompt(system,history,smaller);}
 return result;
}
root.NubbiStory={styles:styles,lengths:lengths,styleKey:styleKey,lengthKey:lengthKey,instructions:instructions,buildPrompt:buildPrompt};
if(typeof module!=='undefined'&&module.exports)module.exports=root.NubbiStory;
})(typeof window!=='undefined'?window:globalThis);
