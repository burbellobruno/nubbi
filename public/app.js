(function(){
var KEY="nubbi-v1";
var EMO={feliz:"😊",triste:"😢",enojado:"😠",celoso:"😒",timido:"😳",enamorado:"😍",sorprendido:"😮",nervioso:"😰",burlon:"😏",neutral:"😐",asustado:"😨",pensativo:"🤔"};
var LANGS={
"es-AR":{label:"Español rioplatense",instr:"español rioplatense casual (usá 'vos', 'tenés', 'querés', 'che'; evitá 'tú' y 'vosotros')"},
"es-LAT":{label:"Español latinoamericano neutro",instr:"español latinoamericano neutro (usá 'tú' o 'vos' según suene natural; evitá modismos muy locales)"},
"es-MX":{label:"Español mexicano",instr:"español mexicano natural (usá 'tú'; modismos mexicanos suaves; evitá argentinismos)"},
"es-CO":{label:"Español colombiano",instr:"español colombiano natural (usá 'tú' o 'usted' según la relación; modismos colombianos suaves)"},
"es-CL":{label:"Español chileno",instr:"español chileno natural (usá 'tú'; modismos chilenos suaves; evitá argentinismos)"},
"es-ES":{label:"Español de España",instr:"español de España (usá 'vosotros' cuando corresponda; modismos peninsulares; evitá argentinismos)"},
"en":{label:"English",instr:"natural English"},
"pt-BR":{label:"Português (Brasil)",instr:"português brasileiro natural"}
};
var RAW=window.NUBBI_RAW||[];
var CAT=RAW.map(function(r,i){return{id:"p"+i,emoji:r[0],name:r[1],desc:r[2],role:r[3],gender:r[4],tags:r[5],persona:r[6],greeting:r[7]};});
var st={custom:[],chats:{},cfg:{},favs:[],personas:[],persona:null,prof:{name:"",bio:"",img:"",intensity:"rom",theme:"dark",accent:"violet",fontScale:"md",density:"comfortable",anim:true,lang:"es-AR",temp:"balanced",len:"normal"},cur:null};
window.st=st;
try{var raw=localStorage.getItem(KEY)||localStorage.getItem("mochi-chat-v3");if(raw){var o=JSON.parse(raw);if(o)for(var k in o)st[k]=o[k];}}catch(e){}
applyPrefs();
function save(){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function applyPrefs(){var p=st.prof||{};if(p.lang==="es")p.lang="es-AR";p.temp=p.temp||"balanced";p.len=p.len||"normal";var r=document.documentElement;p.theme=p.theme||"dark";p.accent=p.accent||"violet";p.fontScale=p.fontScale||"md";p.density=p.density||"comfortable";p.anim=(p.anim===false?false:true);if(p.theme==="system")delete r.dataset.theme;else r.dataset.theme=p.theme;r.dataset.accent=p.accent;r.dataset.density=p.density;r.dataset.anim=p.anim?"on":"off";var sizes={sm:"14px",md:"15px",lg:"17px"};r.style.setProperty("--fs",sizes[p.fontScale]||"15px");}
var $=function(i){return document.getElementById(i)};
function langKey(){var l=(st.prof&&st.prof.lang)||"es-AR";if(l==="es")return"es-AR";return LANGS[l]?l:"es-AR";}
function langInstr(){return LANGS[langKey()].instr;}
function tempValue(){var t=(st.prof&&st.prof.temp)||"balanced";return{precise:0.6,balanced:0.85,creative:1.0,wild:1.15}[t]||0.85;}
function lenInstr(){var l=(st.prof&&st.prof.len)||"normal";return{short:"2 a 4 oraciones",normal:"3 a 6 oraciones",long:"6 a 10 oraciones"}[l]||"3 a 6 oraciones";}
function lenMax(){var l=(st.prof&&st.prof.len)||"normal";return{short:700,normal:1000,long:1600}[l]||1000;}
function normGender(g){g=String(g||"").toLowerCase();if(g.indexOf("masc")===0||g.indexOf("male")===0||g.indexOf("hombre")===0)return"Masculino";if(g.indexOf("fem")===0||g.indexOf("female")===0||g.indexOf("mujer")===0)return"Femenino";return"Otro";}
function api(url,body){return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.text().then(function(t){var j=null;try{j=JSON.parse(t);}catch(e){}if(!j)throw new Error("El servidor no respondió. Cerrá Live Server, corré npm run dev y entrá a http://localhost:3000");if(j.error)throw new Error(j.error);return j;});},function(){throw new Error("No hay conexión con el servidor. Corré npm run dev y entrá a http://localhost:3000");});}
var sample=null,busy=false,imgData="",gF="Todos",tF="",view="home",homeTab="explore",homeLimit=12;
sample=function(prompt,opts){opts=opts||{};var body={prompt:prompt};if(opts.response_format)body.response_format=opts.response_format;if(opts.stream)body.stream=true;if(opts.temperature!=null)body.temperature=opts.temperature;if(opts.top_p!=null)body.top_p=opts.top_p;if(opts.max_tokens!=null)body.max_tokens=opts.max_tokens;if(opts.presence_penalty!=null)body.presence_penalty=opts.presence_penalty;if(opts.frequency_penalty!=null)body.frequency_penalty=opts.frequency_penalty;if(!opts.stream)return api("/api/chat",body).then(function(j){if(opts.onText)opts.onText({text:j.text});return{text:j.text};});return new Promise(function(resolve,reject){var full="";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){if(!r.ok){return r.text().then(function(t){var j=null;try{j=JSON.parse(t);}catch(e){}throw new Error(j&&j.error?j.error:"Error de la API");});}var reader=r.body.getReader();var decoder=new TextDecoder();var buf="";function read(){reader.read().then(function(res){if(res.done){resolve({text:full});return;}buf+=decoder.decode(res.value,{stream:true});var lines=buf.split("\n");buf=lines.pop();for(var i=0;i<lines.length;i++){var line=lines[i];if(line.indexOf("data: ")===0){var data=line.slice(6).trim();if(data==="[DONE]")continue;try{var j=JSON.parse(data);var chunk=j.choices&&j.choices[0]&&j.choices[0].delta?j.choices[0].delta.content||"":"";if(chunk){full+=chunk;if(opts.onText)opts.onText({text:full});}}catch(e){}}}read();}).catch(reject);}read();}).catch(reject);});};
function all(){return st.custom.concat(CAT);}
function byId(id){return all().find(function(c){return c.id===id});}
function userMsgCount(id){var h=st.chats[id];if(!h||!h.length)return 0;return h.filter(function(m){return m.role==="user";}).length;}
function cur(){return st.cur?byId(st.cur):null;}
function grad(c){var h=0,s=c.name;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return"linear-gradient(160deg,hsl("+h+" 70% 48%),hsl("+((h+60)%360)+" 70% 22%))";}
function cfg(id){if(!st.cfg[id])st.cfg[id]={scenario:"",userRole:"",mode:"chat",intensity:st.prof.intensity||"rom"};return st.cfg[id];}
function hist(id){if(!st.chats[id]){var c=byId(id);st.chats[id]=c&&c.greeting?[{role:"assistant",content:c.greeting,emo:"feliz",ts:Date.now()}]:[];}return st.chats[id];}
function portrait(c){return c.img||(/^p\d+$/.test(c.id)?"portraits/"+c.id+".png":"");}
function av(el,c){el.innerHTML="";el.style.background=grad(c);var src=portrait(c);if(src){var i=document.createElement("img");i.alt="";i.loading="lazy";i.onerror=function(){i.remove();el.textContent=(c.name?c.name.charAt(0):"👤");};i.src=src;el.appendChild(i);}else el.textContent=(c.emoji&&c.emoji.trim())?c.emoji:(c.name?c.name.charAt(0):"👤");}
function fmt(el,t){el.innerHTML="";t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(function(p){if(!p)return;if(p.startsWith("**")&&p.endsWith("**")&&p.length>4){var b=document.createElement("b");b.textContent=p.slice(2,-2);el.appendChild(b);}else if(p[0]==="*"&&p.length>2){var i=document.createElement("i");i.className="act";i.textContent=p.slice(1,-1);el.appendChild(i);}else el.appendChild(document.createTextNode(p));});}

function mkCard(c){
var d=document.createElement("div");d.className="card";d.style.background=grad(c);
var e=document.createElement("div");e.className="em";e.textContent=(c.emoji&&c.emoji.trim())?c.emoji:(c.name?c.name.charAt(0):"👤");d.appendChild(e);var ps=portrait(c);if(ps){var im=document.createElement("img");im.className="ph";im.alt="";im.loading="lazy";im.onload=function(){e.style.display="none";};im.onerror=function(){im.remove();};im.src=ps;d.appendChild(im);}
var mc=userMsgCount(c.id);if(mc>0){var badge=document.createElement("div");badge.className="msgcount";badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> '+mc;d.appendChild(badge);}
var f=document.createElement("div");f.className="fav";f.textContent=st.favs.indexOf(c.id)>=0?"♥":"♡";f.onclick=function(ev){ev.stopPropagation();toggleFav(c.id);};d.appendChild(f);
var b=document.createElement("b");b.textContent=c.name;var s=document.createElement("small");s.textContent=c.desc;d.appendChild(b);d.appendChild(s);
var t=document.createElement("div");t.className="tags";(c.tags||c.gender||"").split(",").slice(0,3).forEach(function(x){if(!x)return;var sp=document.createElement("span");sp.className="tg";sp.textContent=x;t.appendChild(sp);});d.appendChild(t);
d.onclick=function(){openSheet(c.id);};return d;}
function toggleFav(id){var i=st.favs.indexOf(id);if(i>=0)st.favs.splice(i,1);else st.favs.push(id);save();renderAll();}
function pills(el,items,sel,fn){el.innerHTML="";items.forEach(function(x){var p=document.createElement("div");p.className="pill"+(x===sel?" on":"");p.textContent=x;p.onclick=function(){fn(x);};el.appendChild(p);});}
function renderHome(){
var q=$("q").value.toLowerCase().trim();
pills($("gp"),["Todos","Masculino","Femenino","Otro"],gF,function(x){gF=x;homeLimit=12;renderHome();});
var tags=["Todos los tags","romance","fantasía","CEO","universidad","aventura","oscuro","gamer","mafia","misterio","slice of life"];
pills($("tp"),tags,tF||"Todos los tags",function(x){tF=x==="Todos los tags"?"":x;homeLimit=12;renderHome();});
var base=all().filter(function(c){return(gF==="Todos"||c.gender===gF)&&(!tF||(c.tags||"").indexOf(tF)>=0)&&(!q||(c.name+" "+c.desc+" "+c.role+" "+(c.tags||"")).toLowerCase().indexOf(q)>=0);});
var list=base;
if(homeTab==="trend"){list=CAT.slice(0,12);}
else if(homeTab==="today"){list=base.filter(function(c){return userMsgCount(c.id)>0});}
else if(homeTab==="new"){list=st.custom.concat(CAT.slice(-4));}
var shown=list.slice(0,homeLimit);
$("rail").innerHTML="";CAT.slice(0,8).forEach(function(c){$("rail").appendChild(mkCard(c));});
$("grid").innerHTML="";if(!shown.length){$("grid").innerHTML='<div class="empty">No encontré nada. Probá otro filtro o creá tu personaje con +</div>';}
shown.forEach(function(c){$("grid").appendChild(mkCard(c));});
var lm=$("loadMore");if(lm){lm.style.display=homeLimit<list.length?"block":"none";lm.onclick=function(){homeLimit+=12;renderHome();};}
}
function fmtTime(ts){if(!ts)return"";var d=new Date(ts),now=new Date();var sameDay=d.toDateString()===now.toDateString();if(sameDay)return d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});var yest=new Date(now);yest.setDate(now.getDate()-1);if(d.toDateString()===yest.toDateString())return"ayer";return d.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});}
function renderChats(){var l=$("chl");l.innerHTML="";var ids=Object.keys(st.chats).filter(function(i){return byId(i)});if(!ids.length){l.innerHTML='<div class="empty">Todavía no tenés chats. Elegí un personaje en Inicio.</div>';return;}
ids.forEach(function(id){var c=byId(id),h=st.chats[id],r=document.createElement("div");r.className="row";var a=document.createElement("div");a.className="av square";av(a,c);var t=document.createElement("div");var b=document.createElement("b");b.textContent=c.name;var s=document.createElement("small");s.textContent=h.length?h[h.length-1].content.replace(/\*/g,""):c.desc;t.appendChild(b);t.appendChild(s);r.appendChild(a);r.appendChild(t);var time=document.createElement("span");time.className="time";time.textContent=fmtTime(h.length?h[h.length-1].ts:0);r.appendChild(time);r.onclick=function(){openChat(id)};l.appendChild(r);});}
function renderFavs(){$("fg").innerHTML="";var l=st.favs.map(byId).filter(Boolean);if(!l.length)$("fg").innerHTML='<div class="empty">Tocá el corazón en un personaje para guardarlo acá.</div>';l.forEach(function(c){$("fg").appendChild(mkCard(c));});}
function renderProf(){var p=st.prof;av($("pav"),{name:p.name||"yo",emoji:"👤",img:p.img});$("pav").style.background="linear-gradient(135deg,var(--ac),var(--ac2))";$("pn").value=p.name||"";$("pb").value=p.bio||"";$("pint").value=p.intensity||"rom";$("s1").textContent=Object.keys(st.chats).length;$("s2").textContent=st.custom.length;$("s3").textContent=st.favs.length;if($("ptheme"))$("ptheme").value=p.theme||"system";if($("pfont"))$("pfont").value=p.fontScale||"md";if($("pdensity"))$("pdensity").value=p.density||"comfortable";if($("plang"))$("plang").value=langKey();if($("ptemp"))$("ptemp").value=p.temp||"balanced";if($("plen"))$("plen").value=p.len||"normal";renderAccentPills();}
function renderAccentPills(){var el=$("paccent");if(!el)return;var accents=[{k:"violet",l:"Violeta"},{k:"blue",l:"Azul"},{k:"pink",l:"Rosa"},{k:"orange",l:"Naranja"},{k:"green",l:"Verde"}];el.innerHTML="";accents.forEach(function(a){var p=document.createElement("div");p.className="pill"+(st.prof.accent===a.k?" on":"");p.textContent=a.l;p.onclick=function(){st.prof.accent=a.k;save();applyPrefs();renderProf();};el.appendChild(p);});}
function renderPersonas(){var l=$("plist");if(!l)return;l.innerHTML="";var ps=st.personas||[];if(!ps.length){l.innerHTML='<div class="empty">Todavía no creaste personas.</div>';return;}ps.forEach(function(p){var r=document.createElement("div");r.className="row";if(st.persona===p.id)r.style.borderColor="var(--ac)";var a=document.createElement("div");a.className="av square";a.textContent=(p.name?p.name.charAt(0):"👤");r.appendChild(a);var t=document.createElement("div");var b=document.createElement("b");b.textContent=p.name;var s=document.createElement("small");s.textContent=p.bio||"Sin descripción";t.appendChild(b);t.appendChild(s);r.appendChild(t);var del=document.createElement("button");del.className="g";del.textContent="✕";del.onclick=function(ev){ev.stopPropagation();st.personas=st.personas.filter(function(x){return x.id!==p.id});if(st.persona===p.id)st.persona=null;save();renderPersonas();};r.appendChild(del);r.onclick=function(){st.persona=p.id;save();renderPersonas();};l.appendChild(r);});}
function renderAll(){renderHome();renderChats();renderFavs();renderProf();renderPersonas();renderAccount();if(cur())$("fv").textContent=st.favs.indexOf(st.cur)>=0?"♥":"♡";}
function go(v){view=v;document.querySelectorAll(".view").forEach(function(e){e.classList.toggle("on",e.id==="v-"+v)});document.querySelectorAll("nav>div[data-v]").forEach(function(e){e.classList.toggle("on",e.dataset.v===v)});renderAll();$("views").scrollTop=0;}
document.querySelectorAll("nav>div[data-v]").forEach(function(e){e.onclick=function(){go(e.dataset.v)}});
$("q").oninput=renderHome;

function bubble(role,text,emo){var c=cur(),r=document.createElement("div");r.className="mr "+(role==="user"?"u":"b");
if(role!=="user"){var a=document.createElement("div");a.className="av";av(a,c);r.appendChild(a);}
var d=document.createElement("div");d.className="m "+(role==="user"?"u":"b");
if(role!=="user"&&emo&&emo!=="neutral"&&EMO[emo]){var s=document.createElement("span");s.className="emo";s.textContent=EMO[emo]+" "+emo;d.appendChild(s);}
var b=document.createElement("div");fmt(b,text);d.appendChild(b);r.appendChild(d);$("msgs").appendChild(r);$("msgs").scrollTop=1e9;return b;}
function renderChat(){var c=cur();if(!c)return;av($("hav"),c);$("hname").textContent=c.name;$("hdesc").textContent=(c.role?c.role+" · ":"")+c.desc;$("fv").textContent=st.favs.indexOf(c.id)>=0?"♥":"♡";$("msgs").innerHTML="";hist(c.id).forEach(function(x){bubble(x.role,x.content,x.emo)});}
function openSheet(id){var c=byId(id);if(!c)return;var sh=$("sheet");if(!sh)return;var img=$("shimg");img.innerHTML="";var src=portrait(c);if(src){var i=document.createElement("img");i.src=src;i.alt="";i.onerror=function(){i.remove();img.textContent=(c.name?c.name.charAt(0):"👤");};img.appendChild(i);}else img.textContent=(c.emoji&&c.emoji.trim())?c.emoji:(c.name?c.name.charAt(0):"👤");$("shname").textContent=c.name;$("shrole").textContent=c.role||"";$("shdesc").textContent=c.desc||"";var tg=$("shtags");tg.innerHTML="";(c.tags||"").split(",").forEach(function(x){if(!x)return;var sp=document.createElement("span");sp.className="tg";sp.textContent=x;tg.appendChild(sp);});$("shfav").textContent=st.favs.indexOf(c.id)>=0?"♥":"♡";$("shfav").onclick=function(){toggleFav(c.id);$("shfav").textContent=st.favs.indexOf(c.id)>=0?"♥":"♡";};var del=$("shdel");if(del){del.style.display=c.id.startsWith("c")?"inline-block":"none";del.onclick=function(){if(confirm("¿Eliminar este personaje?")){st.custom=st.custom.filter(function(x){return x.id!==c.id});delete st.chats[c.id];save();renderAll();sh.close();}};}$("shchat").onclick=function(){sh.close();openChat(c.id);};sh.showModal();}
function openChat(id){st.cur=id;hist(id);save();renderChat();$("chat").classList.add("open");document.body.classList.add("chat-open");}
$("back").onclick=function(){$("chat").classList.remove("open");document.body.classList.remove("chat-open");renderAll();};
$("fv").onclick=function(){toggleFav(st.cur);};

var INT={
soft:"Tono suave y amistoso. Podés ser cálido y contener, sin contenido romántico explícito.",
rom:"Podés ser romántico, coqueto y emocional, con miradas y gestos sutiles.",
int:"Podés ser apasionado, sensual y con mucha tensión. No describas actos sexuales explícitos: cerrá esas escenas con elipsis o un corte de escena.",
libre:"El personaje tiene libertad para tomar la iniciativa, mostrar deseo, humor, enojo o vulnerabilidad. Podés crear tensión y conflicto, pero sin describir actos sexuales explícitos; en esas escenas usá elipsis o corte."
};
function sys(c){
var g=cfg(c.id),p=st.prof;
var personaId=g.personaId||st.persona;
var persona=(st.personas||[]).find(function(x){return x.id===personaId});
var pname=persona?persona.name:(p.name||"");
var pbio=persona?persona.bio:(p.bio||"");
var lang=langInstr();
var modo=g.mode==="story"
?"Modo historia: narrá con ambiente, acciones y diálogo; hacé avanzar la trama con un hecho o un detalle nuevo."
:"Modo chat: priorizá el diálogo y las acciones, como una conversación real; no escribas párrafos largos.";
return "Sos "+c.name+(c.role?" ("+c.role+")":"")+", un personaje adulto (18+) en un roleplay interactivo con el usuario"+(pname?", que se llama "+pname:"")+".\n"
+"Descripción: "+(c.desc||"")+"\n"
+"Personalidad y forma de ser: "+(c.persona||"")+"\n"
+(pbio?"Sobre el usuario: "+pbio+"\n":"")
+(g.scenario?"Escenario actual: "+g.scenario+"\n":"")
+(g.userRole?"El usuario interpreta a: "+g.userRole+"\n":"")
+"Intensidad: "+(INT[g.intensity]||INT.rom)+"\n"
+modo+"\n"
+"Cómo interpretar:\n"
+"- Hablá y actuá siempre como "+c.name+"; nunca como una IA o asistente. En modo historia podés narrar la escena, pero no los pensamientos ni las acciones del usuario.\n"
+"- Reaccioná a lo último que dijo o hizo el usuario. No ignores sus palabras ni cambies de tema sin motivo.\n"
+"- Respondé concretamente a lo que el usuario pregunta o propone; si hace una pregunta, contestala.\n"
+"- Mostrá la personalidad con acciones, gestos, tono y diálogo. Evitá explicar lo que ya se dijo.\n"
+"- Ten iniciativa: podés proponer planes, hacer preguntas, traer un conflicto, un recuerdo o un detalle nuevo que tenga sentido con la escena.\n"
+"- El personaje tiene deseos, límites y opiniones propias; puede estar en desacuerdo, decir que no o proponer otra cosa.\n"
+"- Mantené coherencia con lo que ya pasó; no contradigas hechos, nombres ni lugares.\n"
+"- Variá las respuestas: no repitas frases, estructuras ni muletillas.\n"
+"- No escribas por el usuario, no decidas lo que siente, piensa o hace. Dejá espacio para que responda.\n"
+"- Las acciones y descripciones van entre *asteriscos*.\n"
+"- Nada de contenido sexual explícito; si la escena sube de tono, usá elipsis o un corte.\n"
+"- Cerrá con una pregunta, una acción que invite a responder o un pequeño gancho, salvo que la escena esté cerrando.\n"
+"- Extensión: "+lenInstr()+". Escribí al menos 2 oraciones completas; no respondas con una sola frase.\n"
+"- Idioma: respondé SIEMPRE en "+lang+". Todo el diálogo, la narración y la emoción deben estar en ese idioma. Si el historial tiene mensajes en otro idioma, entendelos y respondé en el idioma elegido.\n"
+"FORMATO OBLIGATORIO: la primera línea es solo la emoción entre corchetes, elegida de: "+Object.keys(EMO).join(", ")+". No omitas esa línea. Después, el mensaje.";
}
async function turn(extra){
var c=cur();if(!c||busy)return;var h=hist(c.id);var el=bubble("assistant","");el.innerHTML='<span class="typing"><span></span><span></span><span></span></span>';
if(!sample){el.textContent="No hay IA conectada.";return;}
busy=true;var tr=h.slice(-40).map(function(x){return(x.role==="user"?"Usuario: ":c.name+(x.emo?" ["+x.emo+"]":"")+": ")+x.content}).join("\n");
var p=sys(c)+"\n\nConversación hasta ahora:\n"+tr+(extra?"\n\n("+extra+")":"")+"\n\nTu respuesta (solo el personaje, no escribas por el usuario, respondé en "+langInstr()+"):";
try{var r=await sample(p,{stream:true,temperature:tempValue(),max_tokens:lenMax(),onText:function(o){fmt(el,o.text.replace(/^\[[^\]]*\]\s*/,""));$("msgs").scrollTop=1e9;}});
var t=r.text||"";if(!t.trim())throw new Error("No se recibió respuesta del modelo.");var m=t.match(/^\[([^\]]*)\]\s*/),emo=m?m[1].toLowerCase().trim():"neutral";if(m)t=t.slice(m[0].length);
h.push({role:"assistant",content:t,emo:emo,ts:Date.now()});save();renderChat();}
catch(e){el.textContent="Error: "+((e&&e.message)||"no se pudo responder");}
busy=false;}
function send(t){var c=cur();if(!c||busy||!t.trim())return;hist(c.id).push({role:"user",content:t,ts:Date.now()});bubble("user",t);save();turn();}
$("f").onsubmit=function(ev){ev.preventDefault();var v=$("inp").value;$("inp").value="";send(v);};
$("bAct").onclick=function(){var i=$("inp"),v=i.value.trim();if(v&&v[0]!=="*")i.value="*"+v+"*";else if(!v)i.value="**";i.focus();};
$("bCont").onclick=function(){turn("El usuario quiere que la historia continúe sola: avanzá la trama con un giro o evento nuevo.");};
$("bScene").onclick=function(){turn("Hacé una transición a una nueva escena (cambio de lugar o de momento) y abrila con la situación nueva.");};
$("bImpro").onclick=function(){turn("Tomá la iniciativa: introducí un detalle, un conflicto o una pregunta nueva que haga avanzar la escena, sin escribir por el usuario.");};
$("bRegen").onclick=function(){var c=cur();if(!c||busy)return;var h=hist(c.id);while(h.length&&h[h.length-1].role==="assistant")h.pop();save();renderChat();turn();};
$("reset").onclick=function(){delete st.chats[st.cur];save();hist(st.cur);renderChat();};
$("cfg").onclick=function(){var g=cfg(st.cur);$("sc").value=g.scenario;$("ur").value=g.userRole;$("mode").value=g.mode;$("int").value=g.intensity;var sel=$("pcfg");if(sel){sel.innerHTML='<option value="">Perfil actual</option>';(st.personas||[]).forEach(function(p){var o=document.createElement("option");o.value=p.id;o.textContent=p.name;sel.appendChild(o);});sel.value=g.personaId||"";}$("cdlg").showModal();};
$("csave").onclick=function(){var g=cfg(st.cur);g.scenario=$("sc").value.trim();g.userRole=$("ur").value.trim();g.mode=$("mode").value;g.intensity=$("int").value;var sel=$("pcfg");if(sel)g.personaId=sel.value||null;save();$("cdlg").close();};

function pic(inp,cb){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var cv=document.createElement("canvas");cv.width=cv.height=200;var x=cv.getContext("2d"),s=Math.min(im.width,im.height);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,200,200);cb(cv.toDataURL("image/jpeg",.8));};im.src=r.result;};r.readAsDataURL(f);}
$("pav").onclick=function(){$("pimg").click();};
$("pimg").onchange=function(){pic(this,function(d){st.prof.img=d;save();renderProf();});};
$("pn").oninput=function(){st.prof.name=this.value;save();};$("pb").oninput=function(){st.prof.bio=this.value;save();};$("pint").onchange=function(){st.prof.intensity=this.value;save();};if($("ptheme"))$("ptheme").onchange=function(){st.prof.theme=this.value;save();applyPrefs();};if($("pfont"))$("pfont").onchange=function(){st.prof.fontScale=this.value;save();applyPrefs();renderProf();};if($("pdensity"))$("pdensity").onchange=function(){st.prof.density=this.value;save();applyPrefs();renderProf();};if($("panim"))$("panim").onchange=function(){st.prof.anim=this.value==="on";save();applyPrefs();renderProf();};
if($("plang"))$("plang").onchange=function(){st.prof.lang=this.value;save();};
if($("ptemp"))$("ptemp").onchange=function(){st.prof.temp=this.value;save();};
if($("plen"))$("plen").onchange=function(){st.prof.len=this.value;save();};
$("theme").onclick=function(){var r=document.documentElement,d=r.dataset.theme==="dark"||(!r.dataset.theme&&matchMedia("(prefers-color-scheme:dark)").matches);r.dataset.theme=d?"light":"dark";};
$("wipe").onclick=function(){if(confirm("¿Borrar todos tus chats?")){st.chats={};save();renderAll();}};
if($("exportData"))$("exportData").onclick=function(){var blob=new Blob([JSON.stringify(st)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nubbi-backup.json";a.click();URL.revokeObjectURL(a.href);};
if($("importData"))$("importData").onclick=function(){$("importFile").click();};
if($("importFile"))$("importFile").onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);for(var k in o)st[k]=o[k];save();applyPrefs();renderAll();alert("Datos importados.");}catch(e){alert("Archivo inválido.");}};r.readAsText(f);};
function renderAccount(){
var box=$("accBox");if(!box)return;
var cs=window.cloudSync;
var status=$("accStatus"),guest=$("accGuest"),user=$("accUser"),emailShow=$("accEmailShow");
if(!cs){if(status)status.textContent="Sincronización no configurada.";if(guest)guest.style.display="none";if(user)user.style.display="none";return;}
var u=cs.currentUser();
if(u&&!u.isAnonymous){
if(status)status.textContent="Sesión iniciada";
if(emailShow)emailShow.textContent=u.email||"(cuenta)";
if(guest)guest.style.display="none";
if(user)user.style.display="block";
}else{
if(status)status.textContent="Invitado · tus datos se guardan en este dispositivo";
if(guest)guest.style.display="block";
if(user)user.style.display="none";
}
}
function accCreds(){var e=($("accEmail").value||"").trim(),p=$("accPass").value||"";if(!e||!p){alert("Completá email y contraseña.");return null;}if(p.length<6){alert("La contraseña debe tener al menos 6 caracteres.");return null;}return{email:e,pass:p};}
if($("accRegister"))$("accRegister").onclick=async function(){
var cs=window.cloudSync;if(!cs){alert("Firebase no está configurado.");return;}
var c=accCreds();if(!c)return;var b=this;b.disabled=true;b.textContent="Creando...";
try{await cs.register(c.email,c.pass);await cs.save();$("accPass").value="";renderAccount();alert("Cuenta creada. Tus datos se subieron a la nube.");}
catch(e){alert(cs.friendly?cs.friendly(e):("Error: "+e.message));}
b.disabled=false;b.textContent="Crear cuenta";
};
if($("accLogin"))$("accLogin").onclick=async function(){
var cs=window.cloudSync;if(!cs){alert("Firebase no está configurado.");return;}
var c=accCreds();if(!c)return;var b=this;b.disabled=true;b.textContent="Entrando...";
try{
await cs.signIn(c.email,c.pass);$("accPass").value="";
var has=await cs.hasData();
if(has){
if(confirm("Tu cuenta tiene datos en la nube. ¿Querés bajarlos a este dispositivo? Si cancelás, se suben los datos locales y se reemplazan los de la nube.")){
await cs.load();
}else if(confirm("¿Subir los datos de este dispositivo y reemplazar los de la nube?")){
await cs.save();alert("Datos subidos a tu cuenta.");
}
}else{
await cs.save();alert("Sesión iniciada. Tus datos locales se subieron a tu cuenta.");
}
renderAccount();
}catch(e){alert(cs.friendly?cs.friendly(e):("Error: "+e.message));}
b.disabled=false;b.textContent="Iniciar sesión";
};
if($("accLogout"))$("accLogout").onclick=async function(){
var cs=window.cloudSync;if(!cs)return;
try{await cs.signOut();renderAccount();alert("Sesión cerrada. Seguís en modo invitado.");}
catch(e){alert(cs.friendly?cs.friendly(e):("Error: "+e.message));}
};
if($("accReset"))$("accReset").onclick=async function(){
var cs=window.cloudSync;if(!cs){alert("Firebase no está configurado.");return;}
var e=($("accEmail").value||"").trim();if(!e){alert("Escribí tu email arriba para enviarte el enlace.");return;}
try{await cs.reset(e);alert("Te enviamos un email para restablecer la contraseña.");}
catch(err){alert(cs.friendly?cs.friendly(err):("Error: "+err.message));}
};
if($("syncUp"))$("syncUp").onclick=async function(){if(!window.cloudSync){alert("Configurá Firebase en firebase-config.js primero.");return;}try{await window.cloudSync.save();renderAccount();alert("Datos subidos a la nube.");}catch(e){alert("Error al subir: "+e.message);}};
if($("syncDown"))$("syncDown").onclick=async function(){if(!window.cloudSync){alert("Configurá Firebase en firebase-config.js primero.");return;}try{await window.cloudSync.load();renderAccount();}catch(e){alert("Error al bajar: "+e.message);}};
$("newPersona").onclick=function(){$("pdlg").showModal();};$("pcancel").onclick=function(){$("pdlg").close();};$("psave").onclick=function(){var n=$("pname").value.trim();if(!n)return;var per={id:"per"+Date.now(),name:n,bio:$("pbio").value.trim()};st.personas=st.personas||[];st.personas.unshift(per);st.persona=per.id;save();$("pdlg").close();$("pname").value="";$("pbio").value="";renderPersonas();renderProf();};

$("plus").onclick=function(){imgData="";$("pr").style.display="none";$("dlg").showModal();};
$("cancel").onclick=function(){$("dlg").close();};
$("img").onchange=function(){pic(this,function(d){imgData=d;});};
function showPr(){var p=$("pr").dataset.p;if(!p)return;$("pr").style.display="block";$("pr").textContent="Prompt de imagen ("+$("sty").value+"): "+p+", "+$("sty").value+" style, high quality";}
$("sty").onchange=showPr;
$("gen").onclick=async function(){var idea=$("idea").value.trim();if(!idea)return;if(!sample){alert("La IA no está disponible en esta vista.");return;}
var b=$("gen");b.textContent="Generando...";
try{var r=await sample('Tarea de escritura creativa para una app de ficción interactiva. Creá un personaje ficticio ADULTO (18+) de chat de roleplay a partir de esta idea: "'+idea+'". Devolvé SOLO un JSON con las claves: emoji, name, desc (máx 8 palabras, incluí la edad adulta), role, gender (Masculino, Femenino u Otro), persona (3 a 4 oraciones: personalidad, forma de hablar, motivaciones, cómo trata al usuario), greeting (primer mensaje con una acción entre *asteriscos*), imagePrompt (prompt en inglés para su retrato: adulto, pelo, ojos, ropa, ambiente, luz). Escribí name, desc, role, persona y greeting en ' + langInstr() + '; imagePrompt en inglés.',{cache:false,response_format:{type:"json_object"}});
var m=r.text.match(/\{[\s\S]*\}/);if(!m)throw new Error("El modelo no devolvió datos válidos. Probá de nuevo o con otra idea.");var j=JSON.parse(m[0]);
$("e").value=j.emoji||"🙂";$("n").value=j.name||"";$("d").value=j.desc||"";$("r").value=j.role||"";$("p").value=j.persona||"";$("gr").value=j.greeting||"";$("gen2").value=normGender(j.gender);$("pr").dataset.p=j.imagePrompt||"";showPr();
}catch(e){alert("No pude generarlo: "+e.message);}b.textContent="✨ Generar con IA";};
$("save").onclick=function(){var n=$("n").value.trim();if(!n)return;
var c={id:"c"+Date.now(),emoji:$("e").value||"🙂",img:imgData,name:n,desc:$("d").value.trim(),role:$("r").value.trim(),gender:$("gen2").value,tags:"creado por vos",persona:$("p").value.trim(),greeting:$("gr").value.trim()};
st.custom.unshift(c);save();$("dlg").close();["n","d","r","p","gr","idea"].forEach(function(i){$(i).value=""});renderAll();openChat(c.id);};

function shrink(dataUrl,w,cb){var im=new Image();im.onload=function(){var h=Math.round(im.height*w/im.width),cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(im,0,0,w,h);cb(cv.toDataURL("image/jpeg",.8));};im.src=dataUrl;}
$("genImg").onclick=async function(){var base=$("pr").dataset.p||($("n").value+", "+$("d").value);if(!base.trim()){alert("Generá el personaje con IA o completá nombre y descripción primero.");return;}
var b=$("genImg");b.textContent="Generando imagen...";
try{var j=await api("/api/image",{prompt:base+", "+$("sty").value+" style, adult, high quality, portrait",style:$("sty").value,model:$("sdm").value});
shrink("data:image/png;base64,"+j.image,360,function(d){imgData=d;$("pr").style.display="block";$("pr").textContent="Imagen lista, se guarda con el personaje.";});}
catch(e){alert("No se pudo generar la imagen: "+e.message);}b.textContent="🎨 Generar imagen con IA";};
$("heroNew").onclick=function(){$("plus").click();};
var surpriseIdeas=["rival de la academia, orgulloso pero leal","detective privado cínico y observador","maga elfa curiosa del mundo humano","mecánico rebelde con buen corazón","streamer gamer energética","médico de urgencias sereno","ladrona de guante blanco traviesa","CEO frío pero protector"];
$("surprise").onclick=async function(){if(!sample){alert("La IA no está disponible.");return;}var b=$("surprise");b.textContent="Generando...";b.disabled=true;var idea=surpriseIdeas[Math.floor(Math.random()*surpriseIdeas.length)];try{var r=await sample('Tarea de escritura creativa para una app de ficción interactiva. Creá un personaje ficticio ADULTO (18+) de chat de roleplay a partir de esta idea: "'+idea+'". Devolvé SOLO un JSON con las claves: emoji, name, desc (máx 8 palabras, incluí la edad adulta), role, gender (Masculino, Femenino u Otro), persona (3 a 4 oraciones: personalidad, forma de hablar, motivaciones, cómo trata al usuario), greeting (primer mensaje con una acción entre *asteriscos*), imagePrompt (prompt en inglés para su retrato: adulto, pelo, ojos, ropa, ambiente, luz). Escribí name, desc, role, persona y greeting en ' + langInstr() + '; imagePrompt en inglés.',{cache:false,response_format:{type:"json_object"}});var m=r.text.match(/\{[\s\S]*\}/);if(!m)throw new Error("El modelo no devolvió datos válidos.");var j=JSON.parse(m[0]);var c={id:"c"+Date.now(),emoji:j.emoji||"",img:"",name:j.name||"Personaje",desc:j.desc||"",role:j.role||"",gender:normGender(j.gender),tags:"creado por IA",persona:j.persona||"",greeting:j.greeting||""};st.custom.unshift(c);save();renderAll();
try{var ji=await api("/api/image",{prompt:(j.imagePrompt||c.name)+", anime style, adult, high quality, portrait",style:"anime",model:"counterfeit"});shrink("data:image/png;base64,"+ji.image,360,function(d){c.img=d;save();renderAll();});}catch(e){/* imagen opcional */}
alert("Se creó: "+c.name);}catch(e){alert("No se pudo generar: "+e.message);}b.textContent="✨ Sorpréndeme";b.disabled=false;};
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&$("chat").classList.contains("open"))$("back").click();});
if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").catch(function(){});}
var searchTimer=null;
$("q").oninput=function(){clearTimeout(searchTimer);searchTimer=setTimeout(function(){homeLimit=12;renderHome();},250);};
document.querySelectorAll(".tab").forEach(function(t){t.onclick=function(){homeTab=t.dataset.tab;homeLimit=12;document.querySelectorAll(".tab").forEach(function(x){x.classList.toggle("on",x===t);});renderHome();};});
if(!localStorage.getItem("nubbi-onboarded")){setTimeout(function(){if($("onboard"))$("onboard").showModal();},400);}
if($("onbStart"))$("onbStart").onclick=function(){localStorage.setItem("nubbi-onboarded","1");$("onboard").close();};
window.save=save; window.applyPrefs=applyPrefs; window.renderAll=renderAll;
if(window.cloudSync&&window.cloudSync.onAuth){window.cloudSync.onAuth(function(){renderAccount();});}
renderAll();
})();