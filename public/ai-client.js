/* Streaming parser, character validation and provider-specific model helpers. No provider credentials. */
(function(root){
"use strict";
root.NUBBI_MIN_AGE=21;
function characterError(message,code,retryable){var e=new Error(message);e.code=code;e.retryable=!!retryable;return e;}
// Normalize typography, not character data. Existing saved characters are never rewritten.
root.NubbiNormalizeAgeText=function(text){return String(text||"").normalize("NFKC").replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"').replace(/[‐‑‒–—−]/g,"-");};
root.NubbiStripAgeNoise=function(text){
 return root.NubbiNormalizeAgeText(text)
  .replace(/\b(?:hace|desde hace|dentro de|en|tras|durante)\s+(?:más de\s+|menos de\s+|unos\s+|unas\s+|casi\s+)?\d+\s*(?:años|anos)\b/gi," ")
  .replace(/\b(?:a|desde|hasta|cuando tenía)\s+(?:los?\s+)?\d+\s*(?:años|anos)\b/gi," ")
  .replace(/\b(?:duró|duraba|lleva|llevaba|pasó|pasaron|esperó|trabajó|vivió)\s+(?:unos\s+|casi\s+)?\d+\s*(?:años|anos)\b/gi," ")
  .replace(/\b\d+\s*(?:years?|yrs?)\s+(?:ago|later|before|after)\b/gi," ")
  .replace(/\b(?:at|since|until|after|before|for|during)\s+(?:the\s+)?age\s+(?:of\s+)?\d+\b/gi," ")
  .replace(/\bwhen\s+(?:i|he|she|they)\s+(?:was|were)\s+\d+\b/gi," ");
};
function collectAges(source,patterns){var found=[];patterns.forEach(function(pattern){var match;while((match=pattern.exec(source))){var age=Number(match[1].replace(",","."));if(found.indexOf(age)<0)found.push(age);}});return found;}
root.NubbiExtractAges=function(text){
 return collectAges(root.NubbiStripAgeNoise(text),[
  /(?:^|[^\w])(-?\d+(?:[.,]\d+)?)\s*(?:años|anos)\b/gi,
  /(?:^|[^\w])(-?\d+(?:[.,]\d+)?)\s*[ -]?(?:years?[ -]*old|yrs?[ -]*old|y\/o)\b/gi,
  /\b(?:age|aged|edad)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)\b/gi]);
};
// Only explicitly attributed third-party quotations are ignored. Direct dialogue is checked.
function ownAgeText(text){
 var source=root.NubbiStripAgeNoise(text);
 var relative="(?:(?:su|mi|tu|her|his|my|their)\\s+(?:herman[oa]|hij[oa]|sobrin[oa]|prim[oa]|amig[oa]|madre|padre|sister|brother|daughter|son|friend|mother|father))";
 var quote='(?:«[^»]*»|"[^"\\n]*")';
 source=source.replace(new RegExp(quote+'\\s*[,;]?\\s*(?:(?:dice|dijo|recuerda|recuerda que|says|said|recalls)\\s+)?'+relative,'gi')," ");
 source=source.replace(new RegExp(relative+'\\s+(?:dice|dijo|cuenta|says|said|recalls)\\s*:?\\s*'+quote,'gi')," ");
 return source.replace(new RegExp(relative+'\\s+(?:tiene|tenía|is|was)\\s+\\d+(?:\\s*(?:años|anos|years?[ -]*old))?','gi')," ");
}
root.NubbiExtractSelfAges=function(text){
 return collectAges(ownAgeText(text),[
  /\b(?:yo\s+)?tengo\s+(-?\d+(?:[.,]\d+)?)\s*(?:años|anos)?\b/gim,
  /(?:^|[.!?;]\s*)\s*[«"*]?(?:(?:él|ella|el personaje|la personaje|el protagonista|la protagonista|hoy|actualmente|ahora)\s+)?tiene\s+(-?\d+(?:[.,]\d+)?)\s*(?:años|anos)?\b/gim,
  /\b(?:today|currently|now)?\s*(?:she|he|they|the character)(?:\s+(?:is|are)|'s|'re)\s+(-?\d+(?:[.,]\d+)?)(?:\s*years?[ -]*old)?\b/gim,
  /\bI(?:'m| am)\s+(-?\d+(?:[.,]\d+)?)(?:\s*years?[ -]*old)?\b/gim,
  /\b(?:él|ella|el personaje|la protagonista)\s+tiene\s+(-?\d+(?:[.,]\d+)?)\s*(?:años|anos)?\b/gim,
  /\b(?:hoy|actualmente|ahora)\s*,?\s*tiene\s+(-?\d+(?:[.,]\d+)?)\s*(?:años|anos)?\b/gim,
  /\b(?:aged|edad\s*[:=]?|age\s*[:=]?)\s*(-?\d+(?:[.,]\d+)?)\b/gim]);
};
function ageIssue(ages,required){
 if(required&&!ages.length)return {code:"INVALID_AGE",message:"Indica una edad explícita de 21 años o más (por ejemplo, '29 años')."};
 if(ages.some(function(a){return !Number.isSafeInteger(a)||a<root.NUBBI_MIN_AGE;}))return {code:"INVALID_AGE",message:"La edad del personaje debe ser de 21 años o más."};
 if(ages.some(function(a){return a!==ages[0];}))return {code:"INVALID_AGE",message:"Las edades del personaje son contradictorias. Usa la misma edad en la descripción, personalidad, saludo e imagen."};
 return null;
}
root.NubbiImageAgeIssue=function(prompt){return ageIssue(root.NubbiExtractAges(prompt),true);};
root.NubbiCharacterAgeIssue=function(fields){
 fields=fields||{};
 var desc=root.NubbiExtractAges(ownAgeText(fields.desc)),issue=ageIssue(desc,true);if(issue)return issue;
 var ages=desc.concat(root.NubbiExtractSelfAges(fields.desc),root.NubbiExtractSelfAges(fields.persona),root.NubbiExtractSelfAges(fields.greeting));
 if(fields.imagePrompt){var image=root.NubbiExtractAges(fields.imagePrompt);issue=ageIssue(image,true);if(issue)return issue;ages=ages.concat(image);}
 return ageIssue(ages,true);
};
// Legacy image generation accepts an explicit user declaration without rewriting the character.
root.NubbiImageCharacterDescription=function(character,declaredAge){
 character=character||{};var desc=String(character.desc||"");
 if(declaredAge!==undefined&&declaredAge!==null&&String(declaredAge).trim()!=="")desc+="; Edad: "+String(declaredAge).trim();
 var issue=root.NubbiCharacterAgeIssue({desc:desc,persona:character.persona,greeting:character.greeting});
 if(issue)throw characterError(issue.message,"INVALID_AGE",false);
 return desc;
};
root.NubbiValidateCharacter=function(text){
 var cleaned=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
 if(cleaned.charAt(0)!=="{"&&/no puedo (?:ayudar|generar|crear)|i (?:can't|cannot|won't)|pol[ií]tica|content policy|policy violation|refusal/i.test(cleaned))throw characterError("El proveedor rechazó la idea por sus políticas de contenido.","POLICY",false);
 var data;try{data=JSON.parse(cleaned);}catch(e){throw characterError("La IA no devolvió un personaje JSON válido.","INVALID_JSON",true);}
 if(!data||typeof data!=="object"||Array.isArray(data))throw characterError("El formato del personaje no es válido.","INVALID_JSON",true);
 var result={},limits={name:80,desc:300,role:80,persona:5000,greeting:2000,imagePrompt:1600};
 Object.keys(limits).forEach(function(key){if(typeof data[key]!=="string"||!data[key].trim()||data[key].length>limits[key])throw characterError("Falta un campo válido del personaje: "+key,"INVALID_FORMAT",true);result[key]=data[key].trim();});
 var ageIssue=root.NubbiCharacterAgeIssue(result);
 if(ageIssue)throw characterError(ageIssue.message,"INVALID_AGE",false);
 result.emoji=typeof data.emoji==="string"?data.emoji.slice(0,16):"☁";
 result.gender=typeof data.gender==="string"?data.gender.slice(0,20):"Otro";
 return result;
};
root.NubbiIsRetryableCharacterError=function(error){
 if(!error)return false;
 var code=String(error.code||"").toUpperCase(),status=Number(error.status),message=String(error.message||"");
 if(/POLICY|AUTH|QUOTA|RATE|INVALID_AGE/.test(code))return false;
 if(error.retryable===true)return true;
 if(status===401||status===403||status===429)return false;
 if(status===400&&(/response_format|json/i.test(message)||/JSON|SCHEMA|VALIDATION/i.test(code)))return true;
 if(status===408||(status>=500&&status!==501))return true;
 if(code==="NETWORK"||code==="BAD_RESPONSE"||code==="INVALID_JSON"||code==="INVALID_FORMAT")return true;
 if(/pol[ií]tica|content[_ -]?filter|refusal|rechaz|no puedo (?:ayudar|generar|crear)|cuota|quota|no credits|sin cr[eé]ditos|too many requests|rate limit|l[ií]mite de|unauthorized|forbidden|invalid[_ ]api|401|403|429/i.test(message))return false;
 if(/no devolvió|json|formato|conexi[oó]n|interrump|network|failed to fetch|timeout|tard[oó]|502|503|504/i.test(message))return true;
 return false;
};
root.NubbiGenerateCharacter=async function(prompt,request,options){
 options=options||{};
 var attempts=Math.max(1,Math.min(3,Number(options.attempts)||2));
 var wait=options.wait||function(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});};
 var last=null;
 for(var attempt=0;attempt<attempts;attempt++){
  try{return root.NubbiValidateCharacter(await request(prompt,attempt));}
  catch(error){last=error;if(attempt<attempts-1&&root.NubbiIsRetryableCharacterError(error)){await wait(700);continue;}break;}
 }
 throw last;
};
root.NubbiImageModelForProvider=function(profile,provider){
 profile=profile||{};
 var legacy=String(profile.imgModel||"");
 if(provider==="cloudflare"){var cf=String(profile.imgModelCloudflare||"");return cf||(/^@cf\//i.test(legacy)?legacy:"");}
 if(provider==="forge"){var forge=String(profile.imgModelForge||"");return forge||(legacy&&!/^@cf\//i.test(legacy)?legacy:"");}
 return "";
};
root.NubbiReconcileImageModel=function(provider,saved,available,preferred){
 saved=String(saved||"");preferred=String(preferred||"");
 var list=(available||[]).map(function(value){return String(value||"");}).filter(Boolean);
 if(saved&&list.indexOf(saved)>=0)return saved;
 if(preferred&&list.indexOf(preferred)>=0)return preferred;
 return list[0]||"";
};
root.NubbiIsValidImageModelForProvider=function(provider,model){
 model=String(model||"").trim();if(!model)return true;
 if(provider==="cloudflare")return /^@cf\/[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)+$/i.test(model);
 if(provider==="forge")return !/^@cf\//i.test(model)&&!/:\/\//.test(model)&&!/\.\./.test(model)&&model.length<=160;
 return false;
};
root.NubbiReadSSE=async function(response,onText){
 if(!response.body)throw new Error("El proveedor no entregó una respuesta.");
 var reader=response.body.getReader(),decoder=new TextDecoder(),buffer="",full="",complete=false,finished=false;
 function event(frame){
  var data=frame.split(/\r?\n/).filter(function(line){return line.indexOf("data:")===0;}).map(function(line){return line.slice(5).trimStart();}).join("\n");
  if(!data)return;if(data.trim()==="[DONE]"){complete=true;return;}
  var j;try{j=JSON.parse(data);}catch(e){throw new Error("El proveedor envió datos incompletos o inválidos.");}
  if(j.error)throw new Error(typeof j.error==="string"?j.error:j.error.message||"Se interrumpió la generación.");
  var choice=j.choices&&j.choices[0];if(!choice)return;
  if(choice.finish_reason==="content_filter"||choice.delta&&choice.delta.refusal)throw new Error("El proveedor rechazó esta solicitud por sus políticas de contenido.");
  if(choice.finish_reason)finished=true;
  var chunk=choice.delta&&choice.delta.content||"";if(chunk){full+=chunk;if(full.length>200000)throw new Error("La respuesta superó el tamaño permitido.");if(onText)onText({text:full});}
 }
 try{
  while(!complete){var part=await reader.read();buffer+=decoder.decode(part.value||new Uint8Array(),{stream:!part.done});
   var match;while((match=/\r?\n\r?\n/.exec(buffer))){var frame=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);event(frame);if(complete)break;}
   if(buffer.length>200000)throw new Error("La respuesta superó el tamaño permitido.");
   if(part.done){if(buffer.trim())event(buffer);break;}
  }
  if(!complete&&!finished)throw new Error("La conexión se interrumpió antes de terminar. Puedes regenerar la respuesta.");
  return {text:full};
 }finally{await reader.cancel().catch(function(){});reader.releaseLock();}
};
})(typeof module!=="undefined"&&module.exports?module.exports:(typeof window!=="undefined"?window:globalThis));
