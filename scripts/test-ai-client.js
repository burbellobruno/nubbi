const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const ctx={TextDecoder,Uint8Array};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/ai-client.js"),"utf8"),ctx);
function response(parts){return new Response(new ReadableStream({start(controller){parts.forEach(p=>controller.enqueue(new TextEncoder().encode(p)));controller.close();}}));}
function failure(message,status,code){const error=new Error(message);if(status!==undefined)error.status=status;if(code)error.code=code;return error;}
function capture(fn){try{fn();}catch(error){return error;}assert.fail('expected an error');}
(async()=>{
 const event=text=>'data: '+JSON.stringify({choices:[{delta:{content:text}}]});
 assert.equal((await ctx.NubbiReadSSE(response([event('Hola')+'\r\n\r', '\ndata: [DONE]']))).text,'Hola');
 assert.equal((await ctx.NubbiReadSSE(response([event('A')+'\n\n'+event('B')+'\n\ndata: [DONE]\n\n']))).text,'AB');
 await assert.rejects(ctx.NubbiReadSSE(response([event('Partial')+'\n\n'])),/interrumpió/);
 await assert.rejects(ctx.NubbiReadSSE(response(['data: {broken}\n\n'])),/inválidos/);
 await assert.rejects(ctx.NubbiReadSSE(response(['data: {"error":{"message":"Provider interrupted"}}\n\n'])),/Provider interrupted/);
 await assert.rejects(ctx.NubbiReadSSE(response(['data: {"choices":[{"finish_reason":"content_filter"}]}\n\n'])),/políticas/);

 // Age extraction: explicit units only, no guessing from the first number.
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('Nació en 1998 y tiene 29 años')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('29-year-old character')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('Age: 34')),[34]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('Mide 175 cm y vive aquí desde 1998')),[]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('Tiene 19 años y su hermana 30 años')),[19,30]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('Hace 5 años que vive acá y tiene 29 años')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('La guerra duró 5 años; tiene 29 años')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('A los 5 años se mudó; hoy tiene 29 años')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('at age 5 he moved; now 29 years old')),[29]);
 assert.deepEqual(Array.from(ctx.NubbiExtractAges('29 años')),[29]);

 // Self-age extraction: only the character's own age, not third parties.
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Tengo 17 años.')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Tiene 17 años.')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('El personaje tiene 17 años.')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Hoy tiene 17 años.')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Edad: 17')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Su hermana tiene 12 años.')),[]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges("I'm 17 years old.")),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('She is 17.')),[17]);
 assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('Her sister is 12.')),[]);

 const character={name:'Nube',desc:'Explorador, 29 años',role:'explorador',persona:'Paciente.',greeting:'Hola.',imagePrompt:'A person, 29 years old',emoji:'☁',gender:'Otro'};
 assert.equal(ctx.NubbiValidateCharacter(JSON.stringify(character)).name,'Nube');
 assert.equal(ctx.NubbiValidateCharacter(JSON.stringify({...character,desc:'Nació en 1998. Tiene 27 años',imagePrompt:'A person, 27 years old'})).name,'Nube');
 const ageError=capture(()=>ctx.NubbiValidateCharacter(JSON.stringify({...character,desc:'Explorador, 19 años'})));
 assert.equal(ageError.code,'INVALID_AGE');assert.equal(ageError.retryable,false);
 assert.throws(()=>ctx.NubbiValidateCharacter(JSON.stringify({...character,imagePrompt:'A person, 12 years old'})),/21 años/);
 assert.throws(()=>ctx.NubbiValidateCharacter(JSON.stringify({...character,desc:'Explorador sin edad'})),/edad explícita/);
 assert.throws(()=>ctx.NubbiValidateCharacter('{"name":"Incomplete"}'),/campo válido/);
 const policyError=capture(()=>ctx.NubbiValidateCharacter('No puedo ayudar con esa idea.'));
 assert.equal(policyError.code,'POLICY');assert.equal(policyError.retryable,false);

 // A contradictory self-age in persona/greeting blocks validation; third parties do not.
 const contradiction=capture(()=>ctx.NubbiValidateCharacter(JSON.stringify({...character,persona:'Tengo 17 años.'})));
 assert.equal(contradiction.code,'INVALID_AGE');assert.equal(contradiction.retryable,false);
 assert.throws(()=>ctx.NubbiValidateCharacter(JSON.stringify({...character,greeting:'Hola, tengo 17 años.'})),/21 años/);
 assert.equal(ctx.NubbiValidateCharacter(JSON.stringify({...character,persona:'Su hermana tiene 12 años.'})).name,'Nube');
 const ageIssue=ctx.NubbiCharacterAgeIssue({desc:'29 años',persona:'Tengo 17 años.'});
 assert.equal(ageIssue.code,'INVALID_AGE');
 assert.equal(ctx.NubbiCharacterAgeIssue({desc:'29 años',persona:'Su hermana tiene 12 años.'}),null);
 assert.equal(ctx.NubbiCharacterAgeIssue({desc:'19 años'}).code,'INVALID_AGE');

 // Retry policy: only transient technical failures are retried.
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('No hay conexión',0,'NETWORK')),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('servidor',500)),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('servidor',503)),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('timeout',408)),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('json_validate_failed',400)),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Bad request',400,'json_validate_failed')),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Bad request',400,'insufficient_quota')),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Bad request',400,'invalid_api_key')),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('La IA no devolvió un personaje JSON válido.',200,'INVALID_JSON')),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Falta un campo válido del personaje: name',200,'INVALID_FORMAT')),true);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Unauthorized',401)),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('Forbidden',403)),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('rate limit exceeded',429)),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('You have no credits remaining',400)),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('rechazó por políticas',400,'POLICY')),false);
 assert.equal(ctx.NubbiIsRetryableCharacterError(failure('edad inválida',200,'INVALID_AGE')),false);

 const valid=JSON.stringify(character);
 let calls=0;
 const recovered=await ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;if(calls===1)throw failure('temporal',500);return valid;},{wait:async()=>{}});
 assert.equal(recovered.name,'Nube');assert.equal(calls,2);

 calls=0;
 await assert.rejects(ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;throw failure('rechazó por políticas',200,'POLICY');},{wait:async()=>{}}),/políticas/);
 assert.equal(calls,1);

 for(const status of [401,403,429]){
  calls=0;
  await assert.rejects(ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;throw failure('error',status);},{wait:async()=>{}}));
  assert.equal(calls,1,'status '+status+' must not retry');
 }

 calls=0;
 const repaired=await ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;return calls===1?'not json':valid;},{wait:async()=>{}});
 assert.equal(repaired.name,'Nube');assert.equal(calls,2);

 calls=0;
 await assert.rejects(ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;return JSON.stringify({...character,desc:'19 años'});},{wait:async()=>{}}),/21 años/);
 assert.equal(calls,1,'age validation must not retry');

 calls=0;
 await assert.rejects(ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;return JSON.stringify({...character,persona:'Tengo 17 años.'});},{wait:async()=>{}}),/21 años/);
 assert.equal(calls,1,'self-age contradiction must not retry');

 calls=0;
 await assert.rejects(ctx.NubbiGenerateCharacter('prompt',async()=>{calls++;throw failure('caído',502);},{wait:async()=>{}}),/caído/);
 assert.equal(calls,2);

 // Cloudflare and Forge keep independent selections and reject foreign IDs.
 const profile={imgModelCloudflare:'@cf/leonardo/lucid-origin',imgModelForge:'Counterfeit-V3.0_fp16'};
 assert.equal(ctx.NubbiImageModelForProvider(profile,'cloudflare'),'@cf/leonardo/lucid-origin');
 assert.equal(ctx.NubbiImageModelForProvider(profile,'forge'),'Counterfeit-V3.0_fp16');
 assert.equal(ctx.NubbiImageModelForProvider(profile,'huggingface'),'');
 assert.equal(ctx.NubbiImageModelForProvider({imgModel:'@cf/black-forest-labs/flux-1-schnell'},'cloudflare'),'@cf/black-forest-labs/flux-1-schnell');
 assert.equal(ctx.NubbiImageModelForProvider({imgModel:'@cf/black-forest-labs/flux-1-schnell'},'forge'),'');
 assert.equal(ctx.NubbiImageModelForProvider({imgModel:'Counterfeit-V3.0_fp16'},'forge'),'Counterfeit-V3.0_fp16');
 assert.equal(ctx.NubbiImageModelForProvider({imgModel:'Counterfeit-V3.0_fp16'},'cloudflare'),'');
 assert.equal(ctx.NubbiIsValidImageModelForProvider('cloudflare','@cf/black-forest-labs/flux-1-schnell'),true);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('cloudflare','Counterfeit-V3.0_fp16'),false);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('cloudflare','https://attacker.example/model'),false);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('forge','Counterfeit-V3.0_fp16'),true);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('forge','@cf/leonardo/lucid-origin'),false);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('forge','https://attacker.example/model'),false);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('cloudflare',''),true);
 assert.equal(ctx.NubbiIsValidImageModelForProvider('forge',''),true);

 // Saved selections are reconciled against the models the provider really offers.
 assert.equal(ctx.NubbiReconcileImageModel('cloudflare','@cf/removed',['@cf/flux','@cf/lucid'],'@cf/flux'),'@cf/flux');
 assert.equal(ctx.NubbiReconcileImageModel('cloudflare','@cf/flux',['@cf/flux','@cf/lucid'],'@cf/lucid'),'@cf/flux');
 assert.equal(ctx.NubbiReconcileImageModel('forge','',['a','b'],'b'),'b');
 assert.equal(ctx.NubbiReconcileImageModel('forge','old',['a','b'],''),'a');
 assert.equal(ctx.NubbiReconcileImageModel('forge','',[],''),'');

 console.log('AI client: SSE, edades explícitas y sin ruido, reintentos selectivos, contradicciones, modelos por proveedor y reconciliación: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
