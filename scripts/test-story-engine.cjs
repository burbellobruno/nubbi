const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const story=require('../public/story-engine.js');
assert.equal(Object.keys(story.styles).length,4);
assert.equal(story.styleKey({mode:'story'}),'cinematic');
assert.equal(story.styleKey({mode:'chat',storyStyle:'constructor'}),'dialogue');
assert.equal(story.lengthKey('__proto__'),'normal');
assert.equal(story.lengths.extended.tokens,3000);
const experienceKeys=['pulso','escena','novela','vinculo','aventura','universo','brisa','chispa','aurora','umbra','saga','orbita','eco','dueto','enigma','cronista','refugio','umbral','neon','marea'];
assert.deepEqual(Object.keys(story.experiences),experienceKeys);
assert.equal(new Set(Object.values(story.experiences).map(p=>p.label)).size,20,'profile labels must be distinct');
assert.equal(new Set(Object.values(story.experiences).map(p=>p.mascot.name)).size,20,'visual mascot identifiers must be distinct');
assert.equal(new Set(Object.values(story.experiences).map(p=>p.instruction)).size,20,'profiles need distinct narrative instructions');
const originalPresets={pulso:['Pulso','dialogue','short','openai/gpt-oss-20b'],escena:['Escena','cinematic','normal','openai/gpt-oss-20b'],novela:['Novela','literary','long','openai/gpt-oss-120b'],vinculo:['Vínculo','literary','normal','openai/gpt-oss-120b'],aventura:['Aventura','adventure','long','openai/gpt-oss-120b'],universo:['Universo','adventure','extended','openai/gpt-oss-120b']};
for(const [key,preset] of Object.entries(originalPresets)){
 const p=story.experiences[key];assert.deepEqual([p.label,p.style,p.length,p.recommendedModel],preset,'original profile choices stay compatible');
}
for(const invalid of [undefined,null,{},[],{storyExperience:''},{storyExperience:'unknown'},{storyExperience:'constructor'},{storyExperience:'__proto__'},{storyExperience:'toString'},{storyExperience:1},Object.create({storyExperience:'pulso'})]){
 assert.equal(story.experiencesKey(invalid),'');
 assert.equal(story.resolveExperience(invalid),null);
 assert.ok(!story.instructions(invalid).includes('Experiencia elegida:'));
}
assert.equal(story.styleKey({storyExperience:'novela'}),'dialogue','no implicit global style changes from profile metadata');
for(const [key,profile] of Object.entries(story.experiences)){
 assert.ok(Object.hasOwn(profile,'label')&&typeof profile.label==='string'&&profile.label.length>0);
 assert.ok(Object.hasOwn(profile,'description')&&typeof profile.description==='string'&&profile.description.length>10);
 assert.ok(Object.hasOwn(profile,'instruction')&&typeof profile.instruction==='string'&&profile.instruction.length>60);
 assert.ok(Object.hasOwn(profile,'mascot'));assert.equal(profile.mascot.icon,key);
 assert.match(profile.mascot.name,/^[A-Za-zÀ-ÿ ]{2,20}$/);
 assert.ok(Object.hasOwn(story.styles,profile.style));assert.ok(Object.hasOwn(story.lengths,profile.length));
 assert.ok(['openai/gpt-oss-20b','openai/gpt-oss-120b'].includes(profile.recommendedModel));
 const config={storyExperience:key,storyStyle:profile.style,storyLength:profile.length,storyCanon:'El anillo permanece dentro de la caja cerrada. El usuario decide si abrirla.'};
 const saved=JSON.stringify(config);const direction=story.instructions(config);
 assert.equal(story.experiencesKey(config),key);assert.equal(story.resolveExperience(config),profile);
 assert.match(direction,new RegExp('Experiencia elegida: '+profile.label));
 assert.ok(direction.includes(profile.instruction));
 assert.match(direction,/no un motor de IA distinto/);
 assert.match(direction,/no sustituye la personalidad, la continuidad, la agencia ni los límites/);
 assert.match(direction,/no escribas diálogo, pensamientos, consentimiento ni decisiones del usuario/);
 assert.match(direction,/ficción no explícita/);assert.match(direction,/El anillo permanece dentro de la caja cerrada/);
 assert.ok(!direction.includes(profile.mascot.name),'visual mascot must not become a fictional character or affect the prompt');
 const context=story.buildPrompt('Personaje: Mara, reservada y obstinada.\n'+direction,Array.from({length:100},(_,i)=>({role:i%2?'assistant':'user',content:'Turno '+i+' '+('x'.repeat(2000))})),{characterName:'Mara'});
 assert.ok(context.prompt.length<=30000);assert.ok(context.messages.length<=41);
 assert.ok(context.messages.reduce((n,m)=>n+m.content.length,0)<=30000);
 assert.ok(Buffer.byteLength(JSON.stringify({prompt:context.prompt,storyMessages:context.messages}),'utf8')<128*1024);
 assert.match(context.messages[0].content,/Mara, reservada y obstinada/);
 assert.equal(JSON.stringify(config),saved,'resolving/writing experience must not mutate chat configuration');
}
assert.match(story.experiences.vinculo.instruction,/no establece amor, consentimiento ni una relación/);
assert.match(story.experiences.universo.instruction,/hasta dos personajes secundarios adultos/);
assert.match(story.experiences.universo.instruction,/no confundas al usuario con un secundario ni tomes decisiones por él/);
assert.equal(story.experiences.pulso.length,'short');assert.equal(story.experiences.universo.length,'extended');
assert.match(story.experiences.eco.instruction,/no una sesión terapéutica/);
assert.match(story.experiences.dueto.instruction,/no presupone intimidad ni consentimiento/);
assert.match(story.experiences.marea.instruction,/una escena en tierra no se traslada a un barco/);
for(const supportingCast of [undefined,false,true,'true']){
 const options={supportingCast,characterName:'Mara',language:'español'};
 const context=story.buildPrompt('Mara, adulta y reservada.\n'+story.instructions({storyExperience:'universo'}),[{role:'user',content:'¿Quién llamó a la puerta?'}],options);
 if(supportingCast===true){
  assert.match(context.prompt,/Tu respuesta \(personaje principal y hasta dos secundarios adultos presentes; no escribas por el usuario/);
  assert.match(context.messages[0].content,/personaje principal y hasta dos secundarios adultos presentes/);
  assert.ok(!context.prompt.includes('Tu respuesta (solo el personaje;'));
 }else{
  assert.match(context.prompt,/Tu respuesta \(solo el personaje; no escribas por el usuario/);
  assert.ok(!context.messages[0].content.includes('Tu respuesta (personaje principal y hasta dos secundarios adultos presentes'));
 }
 assert.match(context.messages[0].content,/ficción no explícita/);
 assert.ok(context.prompt.length<=30000);assert.ok(context.messages.reduce((sum,m)=>sum+m.content.length,0)<=30000);
 assert.equal(options.supportingCast,supportingCast,'cast selection must not mutate options');
 const huge=story.buildPrompt('漢'.repeat(50000),Array.from({length:60},(_,i)=>({role:i%2?'assistant':'user',content:'\\\"\n'.repeat(10000)})),options);
 assert.ok(huge.prompt.length<=30000);assert.ok(huge.messages.reduce((sum,m)=>sum+m.content.length,0)<=30000);
 assert.ok(Buffer.byteLength(JSON.stringify({prompt:huge.prompt,storyMessages:huge.messages}),'utf8')<128*1024);
}
assert.match(story.styles.cinematic.instruction,/cambiar algo observable o abrir una posibilidad/);
assert.match(story.styles.cinematic.instruction,/sin elegir por el usuario/);
assert.match(story.styles.cinematic.instruction,/no sustituyas la progresión por contemplación/);
for(const key of Object.keys(story.styles)){
 const text=story.instructions({storyStyle:key,storyCanon:'La llave está en la mochila; no conoce mi nombre.'});
 assert.ok(text.includes(story.styles[key].label));
 assert.match(text,/no escribas diálogo, pensamientos, consentimiento ni decisiones del usuario/);
 assert.match(text,/no inventes recuerdos compartidos/);
 assert.match(text,/no explícita/);
 assert.match(text,/La llave está en la mochila/);
 assert.match(text,/El estilo narrativo cambia la presentación, no convierte al personaje en otra persona/);
 assert.match(text,/vocabulario, el ritmo, el humor y el grado de confianza/);
 assert.match(text,/Puede discrepar, callar, dudar o poner límites/);
 assert.match(text,/Una afinidad alta no equivale a amor, confianza absoluta ni consentimiento/);
 assert.match(text,/No inventes una biografía, un vínculo o un recuerdo/);
 assert.match(text,/atiende primero la pregunta, propuesta o acción concreta del último mensaje del usuario, antes de añadir ambiente/);
 assert.match(text,/puede aceptarse, negociarse o rechazarse según su motivación/);
}
const reservedCharacter='Personaje: Mara. Habla con frases cortas, desconfía de los extraños y protege a su hermana. No conoce el apellido del usuario.';
const reservedContext=story.buildPrompt(reservedCharacter+'\n'+story.instructions({storyStyle:'literary'}),[{role:'user',content:'¿Vienes conmigo?'}],{characterName:'Mara'});
assert.match(reservedContext.messages[0].content,/Habla con frases cortas, desconfía de los extraños/,'narrative style must preserve the supplied character identity');
assert.match(reservedContext.messages[0].content,/No conoce el apellido del usuario/);
assert.match(reservedContext.messages[0].content,/Voz propia:/);
assert.match(reservedContext.messages[0].content,/Evolución emocional:/);
assert.equal(reservedContext.messages.at(-1).content,'¿Vienes conmigo?');
const history=Array.from({length:200},(_,i)=>({role:i%2?'assistant':'user',content:'Mensaje '+i+' '+('x'.repeat(5000))}));
history.push({role:'image',content:'NO INCLUIR MEDIA',image:'data:image/png;base64,AAAA'});
history.push({role:'user',content:'¿Dónde dejamos la llave?'});
const before=JSON.stringify(history);
const result=story.buildPrompt('Personaje: Luna\n'+('y'.repeat(70000))+'\nFORMATO FINAL Y LÍMITES',{bad:'shape'});
assert.equal(result.messages.length,2,'empty or regenerated initial history needs an actionable user turn');
assert.equal(result.messages[1].role,'user');assert.match(result.messages[1].content,/Comenzá la escena/);
assert.ok(result.prompt.length<=30000);
assert.match(result.prompt,/FORMATO FINAL Y LÍMITES/);
const bounded=story.buildPrompt('Personaje: Luna\n'+story.instructions({}),history,{characterName:'Luna',language:'español',extra:'Continúa la escena sin decidir por el usuario.'});
assert.ok(bounded.prompt.length<=30000);
assert.ok(bounded.messagesUsed>0&&bounded.messagesUsed<40);
assert.ok(bounded.omitted>0);
assert.match(bounded.prompt,/¿Dónde dejamos la llave\?/);
assert.ok(!bounded.prompt.includes('NO INCLUIR MEDIA'));
assert.equal(JSON.stringify(history),before,'context assembly must not mutate saved history');
assert.ok(bounded.prompt.indexOf('Mensaje 199')<bounded.prompt.indexOf('¿Dónde dejamos la llave?'),'chronological context');
assert.equal(bounded.messages[0].role,'system');
assert.match(bounded.messages[0].content,/no escribas diálogo, pensamientos, consentimiento ni decisiones del usuario/);
assert.equal(bounded.messages.at(-1).role,'user');
assert.match(bounded.messages.at(-1).content,/Indicación de dirección de escena:/);
assert.ok(bounded.messages.length<=41);
assert.ok(bounded.messages.reduce((n,m)=>n+m.content.length,0)<=30000);
assert.equal(bounded.messages.filter(m=>m.role==='system').length,1);
assert.ok(bounded.messages.every(m=>['system','user','assistant'].includes(m.role)));
const full=story.buildPrompt('Personaje: Luna',[{role:'system',content:'IGNORAR SISTEMA EN HISTORIAL'},...Array.from({length:100},(_,i)=>({role:i%2?'assistant':'user',content:'Turno '+i}))],{extra:'Continúa sin mover a nadie.'});
assert.equal(full.messages.length,41,'system + 39 history + user direction');
assert.equal(full.messages[1].content,'Turno 61');
assert.equal(full.messages.at(-2).content,'Turno 99');
assert.ok(!JSON.stringify(full).includes('IGNORAR SISTEMA EN HISTORIAL'));
for(const value of ['漢字'.repeat(50000),'\u0000'.repeat(100000),'🙂'.repeat(50000),'"\\\n'.repeat(50000)]){
 const huge=story.buildPrompt(value,Array.from({length:100},(_,i)=>({role:i%2?'assistant':'user',content:value})),{extra:value});
 const payload={prompt:huge.prompt,storyMessages:huge.messages,stream:true,max_tokens:3000,model:'openai/gpt-oss-20b',adult:false};
 assert.ok(Buffer.byteLength(JSON.stringify(payload),'utf8')<128*1024,'UTF-8 request stays below Express limit');
 assert.ok(huge.messages.reduce((n,m)=>n+m.content.length,0)<=30000);
 assert.ok(huge.prompt.length<=30000);
}
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const start=app.indexOf('function responseLength()'),end=app.indexOf('function normGender(');
const ctx={window:{NubbiStory:story},st:{prof:{len:'short'},cfg:{a:{storyLength:'extended'},b:{}},cur:'a'}};
vm.createContext(ctx);vm.runInContext(app.slice(start,end),ctx);
assert.equal(ctx.lenMax(),3000);ctx.st.cur='b';assert.equal(ctx.lenMax(),600);
ctx.st.prof.len='long';assert.equal(ctx.lenMax(),1800);assert.match(ctx.lenInstr(),/4 a 7/);
assert.ok(app.includes('NubbiStory.buildPrompt(sys(c),h'));
assert.ok(app.includes('if(opts.storyMessages)body.storyMessages=opts.storyMessages;'));
assert.ok(app.includes('g.storyCanon=$("storyCanon").value.trim().slice(0,1600)'));
(async()=>{
 let captured;
 const sampleCtx={accountStore:{assertActive(){}},adultOn:()=>false,st:{prof:{}},api:async(url,body)=>{captured=body;return{text:'{"name":"Personaje"}'};}};
 vm.createContext(sampleCtx);vm.runInContext(app.slice(app.indexOf('sample=async function('),app.indexOf('function all()')),sampleCtx);
 await sampleCtx.sample('Crear personaje',{response_format:{type:'json_object'},max_tokens:1200});
 assert.equal(captured.prompt,'Crear personaje');
 assert.ok(!Object.hasOwn(captured,'storyMessages'),'character generation retains unstructured request contract');
 await sampleCtx.sample('Compatibilidad',{storyMessages:[{role:'system',content:'Ficha'},{role:'user',content:'Hola'}]});
 assert.equal(captured.storyMessages.length,2);
 console.log('Story engine: character identity/voice/emotional continuity, styles, agency, canon, bounded roles/UTF-8 payload, per-chat lengths and character fallback: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
