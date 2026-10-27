(function(){
var accountStore=window.NubbiAccountStore;
if(!accountStore)throw new Error('Account isolation must initialize before app.js');
var KEY=accountStore.key();
var EMO={feliz:"😊",triste:"😢",enojado:"😠",celoso:"😒",timido:"😳",enamorado:"😍",sorprendido:"😮",nervioso:"😰",burlon:"😏",neutral:"😐",asustado:"😨",pensativo:"🤔"};
var LANGS={
"es-LAT":{label:"Español latinoamericano neutro",instr:"español latinoamericano neutro (usa 'tú'; evita modismos regionales)"},
"es-MX":{label:"Español mexicano",instr:"español mexicano natural (usa 'tú'; modismos mexicanos suaves; evita modismos regionales)"},
"es-CO":{label:"Español colombiano",instr:"español colombiano natural (usa 'tú' o 'usted' según la relación; modismos colombianos suaves)"},
"es-CL":{label:"Español chileno",instr:"español chileno natural (usa 'tú'; modismos chilenos suaves; evita modismos regionales)"},
"es-ES":{label:"Español de España",instr:"español de España (usa 'vosotros' cuando corresponda; modismos peninsulares; evita modismos regionales)"},
"en":{label:"English",instr:"natural English"},
"pt-BR":{label:"Português (Brasil)",instr:"português brasileiro natural"}
};
var RAW=window.NUBBI_RAW||[];
var CAT=RAW.map(function(r,i){return{id:"p"+i,emoji:r[0],name:r[1],desc:r[2],role:r[3],gender:r[4],tags:r[5],persona:r[6],greeting:r[7]};});
function createDefaultState(){return{custom:[],chats:{},cfg:{},favs:[],personas:[],persona:null,branches:{},prof:{name:"",bio:"",img:"",intensity:"rom",theme:"dark",accent:"violet",fontScale:"md",density:"comfortable",anim:true,lang:"es-LAT",temp:"balanced",len:"normal",adult:false},cur:null};}
var st=createDefaultState();
window.NubbiAppDefaults=createDefaultState;
function normalizePrefs(snapshot){var changed=!!migrateLangs(snapshot),defaults=createDefaultState().prof,p=snapshot.prof=Object.assign({},defaults,snapshot.prof||{});if(p.lang==="es"||p.lang==="es-AR"||!LANGS[p.lang]){p.lang="es-LAT";changed=true;}p.temp=p.temp||"balanced";p.len=p.len||"normal";p.model=p.model||"";p.adult=p.adult===true;if(["forge","cloudflare","huggingface"].indexOf(p.imgProvider)<0&&p.imgProvider!==""){p.imgProvider="";changed=true;}p.voice=p.voice||{};p.voice.enabled=p.voice.enabled!==false;p.voice.auto=!!p.voice.auto;p.voice.rate=Number(p.voice.rate)||1;p.voice.pitch=Number(p.voice.pitch)||1;p.voice.voiceURI=p.voice.voiceURI||"";p.theme=p.theme||"dark";p.accent=p.accent||"violet";p.fontScale=p.fontScale||"md";p.density=p.density||"comfortable";p.anim=(p.anim===false?false:true);return changed;}
window.NubbiNormalizePrefs=function(snapshot){normalizePrefs(snapshot);return snapshot;};
function migrateLangs(obj){if(!obj||typeof obj!=="object")return false;var changed=false;for(var k in obj){if(k==="lang"&&(obj[k]==="es-AR"||obj[k]==="es")){obj[k]="es-LAT";changed=true;}else if(obj[k]&&typeof obj[k]==="object"){if(migrateLangs(obj[k]))changed=true;}}return changed;}
window.NubbiMigrateLangs=migrateLangs;
window.st=st;
// Read only the account-scoped snapshot, never someone else's legacy data.
var accountSnapshot=accountStore.read();if(accountSnapshot)for(var k in accountSnapshot)st[k]=accountSnapshot[k];
try{migrateLangs(st);}catch(e){}
try{if(localStorage.getItem("nubbi-adult-optin-v1:"+accountStore.principal)!=="1"){st.prof=st.prof||{};st.prof.adult=false;accountStore.write(JSON.stringify(st));localStorage.setItem("nubbi-adult-optin-v1:"+accountStore.principal,"1");}}catch(e){}
applyPrefs();
var storageWarningShown=false;
function save(){try{accountStore.write(JSON.stringify(st));}catch(e){if(!storageWarningShown){storageWarningShown=true;alert("No se pudieron guardar los cambios. Exporta tus datos y libera espacio antes de continuar.");}console.warn("Nubbi: almacenamiento no disponible",e);}}
function applyPrefs(){var changed=normalizePrefs(st),p=st.prof,r=document.documentElement;if(p.theme==="system")delete r.dataset.theme;else r.dataset.theme=p.theme;r.dataset.accent=p.accent;r.dataset.density=p.density;r.dataset.anim=p.anim?"on":"off";var sizes={sm:"14px",md:"15px",lg:"17px"};r.style.setProperty("--fs",sizes[p.fontScale]||"15px");if(changed)save();}
var $=function(i){return document.getElementById(i)};
function icon(name,cls){return '<svg class="icon'+(cls?' '+cls:'')+'" aria-hidden="true" focusable="false"><use href="#i-'+name+'"></use></svg>';}
function setHeart(btn,on,label){if(!btn)return;btn.innerHTML=icon("heart",on?"is-filled":"");btn.classList.toggle("is-fav",!!on);btn.setAttribute("aria-pressed",on?"true":"false");btn.setAttribute("aria-label",label||(on?"Quitar de favoritos":"Agregar a favoritos"));}
window.NubbiIcon=icon;window.NubbiSetHeart=setHeart;
function langKey(){var l=(st.prof&&st.prof.lang)||"es-LAT";if(l==="es"||l==="es-AR")return"es-LAT";return LANGS[l]?l:"es-LAT";}
var NEUTRAL_RULE="Escribe SIEMPRE en español latinoamericano neutro: usa tuteo (tú), nunca voseo (vos, tenés, querés, sos) y ningún modismo argentino o rioplatense (che, dale, boludo, pibe, laburo, re + adjetivo).";
function langInstr(){var l=langKey(),base=LANGS[l].instr;return l==="es-LAT"?(base+". "+NEUTRAL_RULE):base;}
function adultOn(){return !!(st.prof&&st.prof.adult===true);}
function tempValue(){var t=(st.prof&&st.prof.temp)||"balanced";return{precise:0.6,balanced:0.85,creative:1.0,wild:1.15}[t]||0.85;}
function responseLength(){var g=st.cur&&st.cfg[st.cur];return g&&g.storyLength||st.prof&&st.prof.len||"normal";}
function lenInstr(){var l=responseLength(),engine=window.NubbiStory;return engine?engine.lengths[engine.lengthKey(l)].instruction:({short:"2 a 4 oraciones",normal:"2 a 4 párrafos breves",long:"4 a 7 párrafos con progresión"}[l]||"2 a 4 párrafos breves");}
function lenMax(){var l=responseLength(),engine=window.NubbiStory;return engine?engine.lengths[engine.lengthKey(l)].tokens:({short:600,normal:1100,long:1800}[l]||1100);}
function normGender(g){g=String(g||"").toLowerCase();if(g.indexOf("masc")===0||g.indexOf("male")===0||g.indexOf("hombre")===0)return"Masculino";if(g.indexOf("fem")===0||g.indexOf("female")===0||g.indexOf("mujer")===0)return"Femenino";return"Otro";}
function deepCopy(o){return JSON.parse(JSON.stringify(o));}
function voiceCfg(){var p=st.prof=st.prof||{};p.voice=p.voice||{};return p.voice;}
function stripForSpeech(t){return String(t||"").replace(/\*\*/g,"").replace(/\*/g,"").replace(/\[[^\]]*\]/g,"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,"").replace(/[#_>]/g,"").replace(/\s+/g," ").trim();}
function speak(text,id){
  if(!("speechSynthesis" in window)){alert("Tu navegador no soporta voz.");return;}
  var v=voiceCfg();if(v.enabled===false)return;
  var clean=stripForSpeech(text);if(!clean)return;
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(clean),lk=langKey();
    u.lang=lk==="en"?"en-US":lk==="pt-BR"?"pt-BR":lk;
    var voices=speechSynthesis.getVoices();
    var uri=(id&&st.cfg[id]&&st.cfg[id].voiceURI)||v.voiceURI||"";
    var vv=voices.find(function(x){return x.voiceURI===uri})||voices.find(function(x){return x.lang&&x.lang.indexOf(u.lang.slice(0,2))===0})||voices[0];
    if(vv){u.voice=vv;u.lang=vv.lang||u.lang;}
    u.rate=Number(v.rate)||1;u.pitch=Number(v.pitch)||1;
    speechSynthesis.speak(u);
  }catch(e){}
}
function initVoices(){
  var sel=$("pvoice");if(!sel||!("speechSynthesis" in window))return;
  var voices=speechSynthesis.getVoices();if(!voices.length)return;
  var cur=voiceCfg().voiceURI||"";
  sel.innerHTML='<option value="">Automática</option>';
  voices.forEach(function(v){var o=document.createElement("option");o.value=v.voiceURI;o.textContent=v.name+" ("+v.lang+")";sel.appendChild(o);});
  sel.value=cur;
}
function branchStore(id){if(!st.branches)st.branches={};if(!st.branches[id])st.branches[id]=[];return st.branches[id];}
function saveBranchSnapshot(id,name,msgs){var bc=deepCopy(cfg(id));delete bc.bg;var b={id:"br"+Date.now()+Math.floor(Math.random()*99),name:name||("Rama "+new Date().toLocaleString()),ts:Date.now(),messages:deepCopy(msgs||hist(id)),cfg:bc};var arr=branchStore(id);arr.unshift(b);if(arr.length>20)arr.length=20;save();return b;}
function firebaseToken(){try{var u=window.cloudSync&&window.cloudSync.currentUser?window.cloudSync.currentUser():null;return u&&u.getIdToken?u.getIdToken().catch(function(){return "";}):Promise.resolve("");}catch(e){return Promise.resolve("");}}
function imageAuthReady(){try{return !!(window.cloudSync&&window.cloudSync.currentUser&&window.cloudSync.currentUser()&&!window.cloudSync.isAnonymous());}catch(e){return false;}}
function api(url,body){accountStore.assertActive();var headers={"Content-Type":"application/json"};var tokenP=url.indexOf("/api/image")===0?firebaseToken():Promise.resolve("");return tokenP.then(function(t){accountStore.assertActive();if(t)headers.Authorization="Bearer "+t;return fetch(url,{method:"POST",headers:headers,body:JSON.stringify(body)});}).then(function(r){return r.text().then(function(t){var j=null;try{j=JSON.parse(t);}catch(e){}if(!j){var bad=new Error("El servidor no respondió. Cierra Live Server, ejecuta npm run dev y entra a http://localhost:3000");bad.status=r.status;bad.code="BAD_RESPONSE";throw bad;}accountStore.assertActive();if(j.error){var err=new Error(j.error);err.status=r.status;err.code=j.code||"";throw err;}return j;});},function(){var net=new Error("No hay conexión con el servidor. Ejecuta npm run dev y entra a http://localhost:3000");net.status=0;net.code="NETWORK";throw net;});}
var sample=null,busy=false,imgData="",editingId=null,gF="Todos",tF="",view="home",homeTab="explore",homeLimit=12;
sample=async function(prompt,opts){accountStore.assertActive();opts=opts||{};var body={prompt:prompt,adult:adultOn()};if(st.prof&&st.prof.model)body.model=st.prof.model;if(opts.response_format)body.response_format=opts.response_format;if(opts.stream)body.stream=true;if(opts.storyMessages)body.storyMessages=opts.storyMessages;if(opts.temperature!=null)body.temperature=opts.temperature;if(opts.top_p!=null)body.top_p=opts.top_p;if(opts.max_tokens!=null)body.max_tokens=opts.max_tokens;if(opts.presence_penalty!=null)body.presence_penalty=opts.presence_penalty;if(opts.frequency_penalty!=null)body.frequency_penalty=opts.frequency_penalty;if(!opts.stream){var j=await api("/api/chat",body);if(opts.onText)opts.onText({text:j.text});return{text:j.text};}var response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!response.ok){var error=await response.json().catch(function(){return {};});throw new Error(error.error||"No se pudo generar la respuesta.");}accountStore.assertActive();var result=await window.NubbiReadSSE(response,function(chunk){accountStore.assertActive();if(opts.onText)opts.onText(chunk);});accountStore.assertActive();return result;};
function all(){return st.custom.concat(CAT);}
function byId(id){return all().find(function(c){return c.id===id});}
function userMsgCount(id){var h=st.chats[id];if(!h||!h.length)return 0;return h.filter(function(m){return m.role==="user";}).length;}
function cur(){return st.cur?byId(st.cur):null;}
function grad(c){var h=0,s=c.name;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return"linear-gradient(160deg,hsl("+h+" 70% 48%),hsl("+((h+60)%360)+" 70% 22%))";}
function cfg(id){if(!st.cfg[id])st.cfg[id]={scenario:"",userRole:"",mode:"story",intensity:st.prof.intensity||"rom"};var g=st.cfg[id];g.instructions=g.instructions||"";g.goal=g.goal||"";g.secret=g.secret||"";g.arc=g.arc||"";g.memory=g.memory||"";g.memoryNotes=Array.isArray(g.memoryNotes)?g.memoryNotes:[];g.bg=g.bg||"";g.bubble=g.bubble||"rounded";g.bgDim=Number(g.bgDim);if(isNaN(g.bgDim))g.bgDim=0.2;g.voiceURI=g.voiceURI||"";return g;}
function hist(id){if(!st.chats[id]){var c=byId(id);st.chats[id]=c&&c.greeting?[{role:"assistant",content:c.greeting,emo:"feliz",ts:Date.now()}]:[];}return st.chats[id];}
function portrait(c){return c.img||(/^p\d+$/.test(c.id)?"portraits/"+c.id+".png":"");}
function av(el,c){el.innerHTML="";el.style.background=grad(c);var src=portrait(c);if(src){var i=document.createElement("img");i.alt="";i.loading="lazy";i.onerror=function(){i.remove();el.textContent=(c.name?c.name.charAt(0).toUpperCase():"?");};i.src=src;el.appendChild(i);}else el.textContent=(c.name?c.name.charAt(0).toUpperCase():"?");}
function fmt(el,t){el.innerHTML="";String(t||"").split(/\n\s*\n/).forEach(function(paragraph){if(!paragraph.trim())return;var block=document.createElement("p");block.className="story-paragraph";paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(function(p){if(!p)return;if(p.startsWith("**")&&p.endsWith("**")&&p.length>4){var b=document.createElement("b");b.textContent=p.slice(2,-2);block.appendChild(b);}else if(p[0]==="*"&&p.length>2){var i=document.createElement("i");i.className="act";i.textContent=p.slice(1,-1);block.appendChild(i);}else block.appendChild(document.createTextNode(p));});el.appendChild(block);});}

function mkCard(c){
var d=document.createElement("div");d.className="card";d.style.background=grad(c);
var e=document.createElement("div");e.className="em";e.textContent=(c.name?c.name.charAt(0).toUpperCase():"?");d.appendChild(e);var ps=portrait(c);if(ps){var im=document.createElement("img");im.className="ph";im.alt="";im.loading="lazy";im.onload=function(){e.style.display="none";};im.onerror=function(){im.remove();if(!c.img&&/^p(?:[0-9]|1[01])$/.test(c.id)){var slot=Number(c.id.slice(1));d.style.setProperty('--portrait-position',(slot%4)*100/3+'% '+Math.floor(slot/4)*50+'%');d.classList.add('portrait-fallback');}};im.src=ps;d.appendChild(im);}
var mc=userMsgCount(c.id);if(mc>0){var badge=document.createElement("div");badge.className="msgcount";badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> '+mc;d.appendChild(badge);}
var favOn=st.favs.indexOf(c.id)>=0;var f=document.createElement("div");f.className="fav";f.setAttribute("role","button");f.setAttribute("tabindex","0");setHeart(f,favOn,(favOn?"Quitar ":"Agregar ")+c.name+" de favoritos");f.onclick=function(ev){ev.stopPropagation();toggleFav(c.id);};f.onkeydown=function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();ev.stopPropagation();toggleFav(c.id);}};d.appendChild(f);
var b=document.createElement("b");b.textContent=c.name;var s=document.createElement("small");s.textContent=c.desc;d.appendChild(b);d.appendChild(s);
var t=document.createElement("div");t.className="tags";(c.tags||c.gender||"").split(",").slice(0,3).forEach(function(x){if(!x)return;var sp=document.createElement("span");sp.className="tg";sp.textContent=x;t.appendChild(sp);});d.appendChild(t);
d.onclick=function(){openSheet(c.id);};return d;}
function toggleFav(id){var i=st.favs.indexOf(id);if(i>=0)st.favs.splice(i,1);else st.favs.push(id);save();renderAll();}
function pills(el,items,sel,fn){el.innerHTML="";items.forEach(function(x){var p=document.createElement("button");p.type="button";p.className="pill"+(x===sel?" on":"");p.setAttribute("aria-pressed",x===sel?"true":"false");p.textContent=x;p.onclick=function(){fn(x);};el.appendChild(p);});}
function renderForYou(){
var el=$("forYou");if(!el)return;el.innerHTML="";
var tags={};
st.favs.forEach(function(id){var c=byId(id);if(!c)return;(c.tags||"").split(",").forEach(function(t){t=t.trim().toLowerCase();if(t)tags[t]=(tags[t]||0)+2;});});
Object.keys(st.chats).forEach(function(id){var c=byId(id);if(!c)return;(c.tags||"").split(",").forEach(function(t){t=t.trim().toLowerCase();if(t)tags[t]=(tags[t]||0)+1;});});
var scored=all().map(function(c){var s=0;(c.tags||"").split(",").forEach(function(t){t=t.trim().toLowerCase();s+=tags[t]||0;});if(st.favs.indexOf(c.id)>=0)s+=1;if(st.chats[c.id])s+=1;return{c:c,s:s};}).filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;});
if(!scored.length)scored=CAT.slice(0,8).map(function(c){return{c:c,s:0};});
scored.slice(0,8).forEach(function(x){el.appendChild(mkCard(x.c));});
}
function renderHome(){
var q=$("q").value.toLowerCase().trim();
pills($("gp"),["Todos","Masculino","Femenino","Otro"],gF,function(x){gF=x;homeLimit=12;renderHome();});
var tags=["Todos los tags","romance","fantasía","CEO","universidad","aventura","oscuro","gamer","mafia","misterio","slice of life","furry"];
pills($("tp"),tags,tF||"Todos los tags",function(x){tF=x==="Todos los tags"?"":x;homeLimit=12;renderHome();});
var sort=$("sort")?$("sort").value:"reco";
var origin=$("origin")?$("origin").value:"all";
var base=all().filter(function(c){
if(origin==="cat"&&CAT.indexOf(c)<0)return false;
if(origin==="mine"&&st.custom.indexOf(c)<0)return false;
if(gF!=="Todos"&&c.gender!==gF)return false;
if(tF&&(c.tags||"").indexOf(tF)<0)return false;
if(!q)return true;
return (c.name+" "+c.desc+" "+c.role+" "+(c.tags||"")+" "+(c.persona||"")+" "+(c.greeting||"")+" "+((st.cfg[c.id]&&st.cfg[c.id].scenario)||"")).toLowerCase().indexOf(q)>=0;
});
var list=base;
if(homeTab==="trend"){list=base.filter(function(c){return CAT.indexOf(c)>=0;});}
else if(homeTab==="today"){list=base.filter(function(c){return userMsgCount(c.id)>0});}
else if(homeTab==="new"){list=st.custom.concat(CAT.slice(-4)).filter(function(c){return base.indexOf(c)>=0;});}
if(sort==="az"){list=list.slice().sort(function(a,b){return String(a.name).localeCompare(String(b.name));});}
else if(sort==="chats"){list=list.slice().sort(function(a,b){return userMsgCount(b.id)-userMsgCount(a.id);});}
else if(sort==="new"){list=st.custom.filter(function(c){return list.indexOf(c)>=0;}).concat(list.filter(function(c){return st.custom.indexOf(c)<0;}).reverse());}
else if(sort==="pop"){var catOrder=CAT.filter(function(c){return list.indexOf(c)>=0;});var customOrder=list.filter(function(c){return CAT.indexOf(c)<0;});list=catOrder.concat(customOrder);}
var shown=list.slice(0,homeLimit);
$("rail").innerHTML="";CAT.slice(0,8).forEach(function(c){$("rail").appendChild(mkCard(c));});
renderForYou();
$("grid").innerHTML="";if(!shown.length){$("grid").innerHTML='<div class="empty">No encontré nada. Probá otro filtro o creá tu personaje con +</div>';}
shown.forEach(function(c){$("grid").appendChild(mkCard(c));});
var lm=$("loadMore");if(lm){lm.style.display=homeLimit<list.length?"block":"none";lm.onclick=function(){homeLimit+=12;renderHome();};}
}
function fmtTime(ts){if(!ts)return"";var d=new Date(ts),now=new Date();var sameDay=d.toDateString()===now.toDateString();if(sameDay)return d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});var yest=new Date(now);yest.setDate(now.getDate()-1);if(d.toDateString()===yest.toDateString())return"ayer";return d.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});}
function renderChats(){var l=$("chl");l.innerHTML="";var ids=Object.keys(st.chats).filter(function(i){return byId(i)});if(!ids.length){l.innerHTML='<div class="empty">Todavía no tenés chats. Elegí un personaje en Inicio.</div>';return;}
ids.forEach(function(id){var c=byId(id),h=st.chats[id],r=document.createElement("div");r.className="row";var a=document.createElement("div");a.className="av square";av(a,c);var t=document.createElement("div");var b=document.createElement("b");b.textContent=c.name;var s=document.createElement("small");s.textContent=h.length?(h[h.length-1].content===undefined?"Imagen de la escena":h[h.length-1].content).replace(/\*/g,""):c.desc;t.appendChild(b);t.appendChild(s);r.appendChild(a);r.appendChild(t);var time=document.createElement("span");time.className="time";time.textContent=fmtTime(h.length?h[h.length-1].ts:0);r.appendChild(time);r.onclick=function(){openChat(id)};l.appendChild(r);});}
function renderFavs(){$("fg").innerHTML="";var l=st.favs.map(byId).filter(Boolean);if(!l.length)$("fg").innerHTML='<div class="empty">Tocá el corazón en un personaje para guardarlo acá.</div>';l.forEach(function(c){$("fg").appendChild(mkCard(c));});}
function renderProf(){var p=st.prof;av($("pav"),{name:p.name||"yo",emoji:"👤",img:p.img});$("pav").style.background="linear-gradient(135deg,var(--ac),var(--ac2))";$("pn").value=p.name||"";$("pb").value=p.bio||"";$("pint").value=p.intensity||"rom";$("s1").textContent=Object.keys(st.chats).length;$("s2").textContent=st.custom.length;$("s3").textContent=st.favs.length;if($("ptheme"))$("ptheme").value=p.theme||"system";if($("pfont"))$("pfont").value=p.fontScale||"md";if($("pdensity"))$("pdensity").value=p.density||"comfortable";if($("plang"))$("plang").value=langKey();if($("ptemp"))$("ptemp").value=p.temp||"balanced";if($("plen"))$("plen").value=p.len||"normal";if($("pmodel"))$("pmodel").value=p.model||"";if($("padult"))$("padult").value=p.adult===true?"on":"off";var v=voiceCfg();if($("pvoice"))$("pvoice").value=v.voiceURI||"";if($("pvoicerate"))$("pvoicerate").value=v.rate||1;if($("pvoicepitch"))$("pvoicepitch").value=v.pitch||1;if($("pvoiceauto"))$("pvoiceauto").value=v.auto?"on":"off";renderAccentPills();}
function renderAccentPills(){var el=$("paccent");if(!el)return;var accents=[{k:"violet",l:"Violeta"},{k:"blue",l:"Azul"},{k:"pink",l:"Rosa"},{k:"orange",l:"Naranja"},{k:"green",l:"Verde"}];el.innerHTML="";accents.forEach(function(a){var p=document.createElement("div");p.className="pill"+(st.prof.accent===a.k?" on":"");p.textContent=a.l;p.onclick=function(){st.prof.accent=a.k;save();applyPrefs();renderProf();};el.appendChild(p);});}
function personaImageIsLocal(value){return typeof value==="string"&&value.length<=600000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
function persistPersonaList(list,selected,owner){accountStore.assertActive();if(accountStore.key()!==owner)throw new Error("La cuenta cambió. Volvé a abrir la persona.");var staged=Object.assign({},st,{personas:list,persona:selected});accountStore.write(JSON.stringify(staged));st.personas=list;st.persona=selected;}
function renderPersonas(){
 var l=$("plist");if(!l)return;l.replaceChildren();var ps=st.personas||[];if(!ps.length){l.innerHTML='<div class="empty">Todavía no creaste personas.</div>';return;}
 var owner=accountStore.key();
 ps.forEach(function(p){
  var r=document.createElement("div");r.className="row persona-row";if(st.persona===p.id)r.style.borderColor="var(--ac)";
  var a=document.createElement("div");a.className="av square persona-avatar";a.setAttribute("aria-hidden","true");a.textContent=p.name?p.name.charAt(0):"👤";
  if(personaImageIsLocal(p.img)){var im=document.createElement("img");im.src=p.img;im.alt="";im.onerror=function(){im.remove();a.textContent=p.name?p.name.charAt(0):"👤";};a.replaceChildren(im);}r.appendChild(a);
  var t=document.createElement("div");t.className="persona-copy";var b=document.createElement("b");b.textContent=p.name;var s=document.createElement("small");s.textContent=p.bio||"Sin descripción";t.append(b,s);r.appendChild(t);
  var actions=document.createElement("div");actions.className="persona-actions";
  var use=document.createElement("button");use.type="button";use.className="g persona-select";use.textContent=st.persona===p.id?"En uso":"Usar";use.setAttribute("aria-label","Usar persona "+p.name);use.setAttribute("aria-pressed",st.persona===p.id?"true":"false");
  use.onclick=function(){try{persistPersonaList(st.personas,p.id,owner);renderPersonas();}catch(error){alert("No se pudo seleccionar la persona: "+error.message);}};
  var edit=document.createElement("button");edit.type="button";edit.className="g persona-edit";edit.textContent="Editar";edit.setAttribute("aria-label","Editar persona "+p.name);edit.onclick=function(){try{if(accountStore.key()!==owner)throw new Error("La cuenta cambió.");openPersonaEditor(p);}catch(error){alert(error.message);}};
  var del=document.createElement("button");del.type="button";del.className="g icon-btn sm persona-delete";del.innerHTML=icon("close");del.setAttribute("aria-label","Eliminar persona "+p.name);del.title="Eliminar persona";
  del.onclick=function(){try{persistPersonaList(st.personas.filter(function(x){return x.id!==p.id;}),st.persona===p.id?null:st.persona,owner);renderPersonas();}catch(error){alert("No se pudo eliminar la persona: "+error.message);}};
  actions.append(use,edit,del);r.appendChild(actions);l.appendChild(r);
 });
}
function renderAll(){renderHome();renderChats();renderFavs();renderProf();renderPersonas();renderAccount();if(cur())setHeart($("fv"),st.favs.indexOf(st.cur)>=0);if(window.NubbiCommunity&&window.NubbiCommunity.render)window.NubbiCommunity.render();}
function go(v){view=v;document.querySelectorAll(".view").forEach(function(e){e.classList.toggle("on",e.id==="v-"+v)});document.querySelectorAll("nav>div[data-v]").forEach(function(e){e.classList.toggle("on",e.dataset.v===v)});renderAll();$("views").scrollTop=0;}
document.querySelectorAll("nav>div[data-v]").forEach(function(e){e.onclick=function(){go(e.dataset.v)}});
$("q").oninput=renderHome;

function bubble(role,text,emo,idx){if(role==="image"&&text===undefined)text="Imagen de la escena";var c=cur(),r=document.createElement("div");r.className="mr "+(role==="user"?"u":"b");
if(role!=="user"){var a=document.createElement("div");a.className="av";av(a,c);r.appendChild(a);}
var d=document.createElement("div");d.className="m "+(role==="user"?"u":"b");
if(role!=="user"&&emo&&emo!=="neutral"&&EMO[emo]){var s=document.createElement("span");s.className="emo";s.textContent=emo;s.setAttribute("aria-label","Emoción: "+emo);d.appendChild(s);}
var b=document.createElement("div"),message=idx!=null?hist(c.id)[idx]:null;if(role==="image"&&message&&/^data:image\/(png|jpeg|webp);base64,/i.test(message.image||"")){var picture=document.createElement("img");picture.src=message.image;picture.alt="Imagen de la escena";picture.style.maxWidth="100%";picture.style.borderRadius="12px";b.appendChild(picture);}else fmt(b,text);d.appendChild(b);
if(idx!=null){var act=document.createElement("div");act.className="mact";var ab=function(iconName,title,fn){var x=document.createElement("button");x.type="button";x.className="g icon-btn sm";x.innerHTML=icon(iconName);x.title=title;x.setAttribute("aria-label",title);x.onclick=function(ev){ev.stopPropagation();fn();};act.appendChild(x);};if(role!=="user"){ab("speaker","Leer en voz alta",function(){speak(text,st.cur);});ab("bookmark","Guardar en memoria",function(){rememberMsg(idx);});}ab("pencil","Editar",function(){editMsg(idx);});ab("branch","Crear rama desde acá",function(){branchMsg(idx);});ab("rotate","Rebobinar hasta acá",function(){rewindMsg(idx);});ab("trash","Borrar",function(){delMsg(idx);});d.appendChild(act);}
if(role==="assistant"&&idx!=null){var visualize=document.createElement("button");visualize.type="button";visualize.className="g";visualize.textContent="Visualizar este mensaje";visualize.onclick=function(){generateChatImage(idx);};d.appendChild(visualize);}r.appendChild(d);$("msgs").appendChild(r);$("msgs").scrollTop=1e9;return b;}
function renderChat(){var c=cur();if(!c)return;av($("hav"),c);$("hname").textContent=c.name;$("hdesc").textContent=(c.role?c.role+" · ":"")+c.desc;setHeart($("fv"),st.favs.indexOf(c.id)>=0);var g=cfg(c.id),md=$("msgs");md.style.background="";if(g.bg){md.style.background='linear-gradient(rgba(0,0,0,'+g.bgDim+'),rgba(0,0,0,'+g.bgDim+')), url("'+g.bg+'") center / cover no-repeat';}$("chat").dataset.bubble=g.bubble||"rounded";md.innerHTML="";hist(c.id).forEach(function(x,i){bubble(x.role,x.content,x.emo,i)});}
function editMsg(i){var c=cur();if(!c||busy)return;var h=hist(c.id),m=h[i];if(!m)return;var t=prompt("Editar mensaje:",m.content);if(t==null)return;t=t.trim();if(!t)return;m.content=t;save();renderChat();}
function delMsg(i){var c=cur();if(!c||busy)return;var h=hist(c.id),m=h[i];if(!m)return;if(!confirm("¿Borrar este mensaje?"))return;h.splice(i,1);save();renderChat();}
function rewindMsg(i){var c=cur();if(!c||busy)return;var h=hist(c.id);if(!h[i]||i>=h.length-1)return;if(!confirm("¿Rebobinar hasta este mensaje? Se borra todo lo que vino después."))return;h.splice(i+1);save();renderChat();}
function rememberMsg(i){var c=cur();if(!c||busy)return;var h=hist(c.id),m=h[i];if(!m)return;var g=cfg(c.id);g.memoryNotes=g.memoryNotes||[];g.memoryNotes.unshift({ts:Date.now(),text:m.content===undefined&&m.role==="image"?"Imagen de la escena":m.content});if(g.memoryNotes.length>50)g.memoryNotes.length=50;save();alert("Guardado en la memoria del personaje.");}
function branchMsg(i){var c=cur();if(!c||busy)return;var h=hist(c.id),m=h[i];if(!m)return;var def="Rama: "+(m.content||"").replace(/\s+/g," ").slice(0,28);var name=prompt("Nombre de la rama:",def);if(name==null)return;name=(name||def).trim()||def;saveBranchSnapshot(c.id,name,h.slice(0,i+1));alert("Rama guardada. Podés abrirla desde Ramas.");}
function openSheet(id){var c=byId(id);if(!c)return;var sh=$("sheet");if(!sh)return;var img=$("shimg");img.innerHTML="";var src=portrait(c);if(src){var i=document.createElement("img");i.src=src;i.alt="";i.onerror=function(){i.remove();img.textContent=(c.name?c.name.charAt(0).toUpperCase():"?");};img.appendChild(i);}else img.textContent=(c.name?c.name.charAt(0).toUpperCase():"?");$("shname").textContent=c.name;$("shrole").textContent=c.role||"";$("shdesc").textContent=c.desc||"";var tg=$("shtags");tg.innerHTML="";(c.tags||"").split(",").forEach(function(x){if(!x)return;var sp=document.createElement("span");sp.className="tg";sp.textContent=x;tg.appendChild(sp);});
var h=st.chats[c.id]||[];
var meta=$("shmeta");if(meta)meta.textContent=h.length+" mensajes · "+userMsgCount(c.id)+" tuyos · "+(c.id.startsWith("c")?"Creado por vos":"Personaje del catálogo");
var greet=$("shgreet");if(greet){greet.style.display=c.greeting?"block":"none";greet.innerHTML="";if(c.greeting)fmt(greet,c.greeting);}
var sim=$("shsimilar");if(sim){sim.innerHTML="";var ctags=(c.tags||"").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);var sims=all().filter(function(x){return x.id!==c.id;}).map(function(x){var s=0;(x.tags||"").split(",").forEach(function(t){if(ctags.indexOf(t.trim().toLowerCase())>=0)s++;});return{x:x,s:s};}).filter(function(o){return o.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,4);if(!sims.length)sims=CAT.filter(function(x){return x.id!==c.id;}).slice(0,3).map(function(x){return{x:x,s:0};});sims.forEach(function(o){var b=document.createElement("button");b.type="button";b.className="g";b.textContent=o.x.name;b.onclick=function(){sh.close();setTimeout(function(){openSheet(o.x.id);},0);};sim.appendChild(b);});}
setHeart($("shfav"),st.favs.indexOf(c.id)>=0,(st.favs.indexOf(c.id)>=0?"Quitar ":"Agregar ")+c.name+" de favoritos");$("shfav").onclick=function(){toggleFav(c.id);setHeart($("shfav"),st.favs.indexOf(c.id)>=0,(st.favs.indexOf(c.id)>=0?"Quitar ":"Agregar ")+c.name+" de favoritos");};
var custom=c.id.startsWith("c");
var del=$("shdel");if(del){del.style.display=custom?"inline-block":"none";del.onclick=function(){if(confirm(c.pubMine?"¿Eliminar este personaje? También se eliminará de la comunidad.":"¿Eliminar este personaje?")){if(window.NubbiCommunity&&window.NubbiCommunity.unpublishByLocal)window.NubbiCommunity.unpublishByLocal(c.id);st.custom=st.custom.filter(function(x){return x.id!==c.id});st.favs=st.favs.filter(function(x){return x!==c.id});delete st.chats[c.id];delete st.cfg[c.id];if(st.branches)delete st.branches[c.id];if(st.cur===c.id){st.cur=null;$("chat").classList.remove("open");document.body.classList.remove("chat-open");}save();renderAll();sh.close();}};}
var ed=$("shedit");if(ed){ed.style.display=custom?"inline-block":"none";ed.onclick=function(){sh.close();openEdit(c.id);};}
var pub=$("shpub");if(pub){var canPub=custom&&!!window.NubbiCommunity;pub.style.display=canPub?"inline-block":"none";pub.textContent=c.pubMine?"Actualizar en comunidad":"Publicar en comunidad";pub.onclick=function(){sh.close();if(window.NubbiCommunity)window.NubbiCommunity.publish(c.id);};}
var share=$("shshare");if(share)share.onclick=function(){shareChar(c);};
$("shchat").textContent=h.length?"Continuar chat":"Chatear";$("shchat").onclick=function(){sh.close();openChat(c.id);};sh.showModal();}
function shareChar(c){var data={nubbiChar:1,emoji:c.emoji||"",name:c.name||"",desc:c.desc||"",role:c.role||"",gender:c.gender||"Otro",tags:c.tags||"importado",persona:c.persona||"",greeting:c.greeting||"",imagePrompt:c.imagePrompt||"",imageStyle:normalizeImageStyle(c.imageStyle)};var code=JSON.stringify(data);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(function(){alert("Código del personaje copiado. Pegalo en Perfil → Importar personaje.");},function(){prompt("Copiá este código:",code);});}else prompt("Copiá este código:",code);}
function importChar(){var code=prompt("Pegá el código del personaje (JSON):");if(!code)return;try{var o=JSON.parse(code);if(!o||!o.name)throw new Error("El código no tiene nombre.");var c={id:"c"+Date.now()+Math.floor(Math.random()*999),emoji:o.emoji||"🙂",img:"",name:o.name,desc:o.desc||"",role:o.role||"",gender:normGender(o.gender),tags:o.tags||"importado",persona:o.persona||"",greeting:o.greeting||"",imagePrompt:o.imagePrompt||"",imageStyle:normalizeImageStyle(o.imageStyle)};var ageIssue=window.NubbiCharacterAgeIssue(c);if(ageIssue)throw new Error(ageIssue.message);st.custom.unshift(c);save();renderAll();alert("Personaje importado: "+c.name);}catch(e){alert("No se pudo importar: "+e.message);}}
function openEdit(id){var c=byId(id);if(!c)return;editingId=id;beginCharacterImageEditor();showWzError("");imgData=c.img||"";$("pr").style.display="none";$("pr").textContent="";$("imagePrompt").value=c.imagePrompt||"";$("idea").value="";$("e").value=c.emoji||"";$("n").value=c.name||"";$("d").value=c.desc||"";$("r").value=c.role||"";$("p").value=c.persona||"";$("gr").value=c.greeting||"";$("gen2").value=normGender(c.gender);$("sty").value=normalizeImageStyle(c.imageStyle);$("dlg").querySelector("h3").textContent="Editar personaje";if($("iprov"))$("iprov").value=((st.prof&&st.prof.imgProvider)==="forge")?"forge":"cloudflare";fillImageEngine(true);$("dlg").showModal();}
function openChat(id){if("speechSynthesis" in window)speechSynthesis.cancel();st.cur=id;hist(id);save();renderChat();$("chat").classList.add("open");document.body.classList.add("chat-open");}
window.NubbiOpenChat=function(id){if(byId(id))openChat(id);};
$("back").onclick=function(){if("speechSynthesis" in window)speechSynthesis.cancel();$("chat").classList.remove("open");document.body.classList.remove("chat-open");renderAll();};
$("fv").onclick=function(){toggleFav(st.cur);};

var INT={
soft:"Tono suave y amistoso. Podés ser cálido y contener, sin contenido romántico explícito.",
rom:"Podés ser romántico, coqueto y emocional, con miradas y gestos sutiles.",
int:"Podés ser apasionado, sensual y con mucha tensión. No describas actos sexuales explícitos: cerrá esas escenas con elipsis o un corte de escena.",
libre:"El personaje tiene libertad para tomar la iniciativa, mostrar deseo, humor, enojo o vulnerabilidad. Podés crear tensión y conflicto, pero sin describir actos sexuales explícitos; en esas escenas usá elipsis o corte."
};
// Both routes share non-explicit narrative boundaries; provider selection is preserved.
var INT_ADULT=INT;
var imageBusy=false;
var CHARACTER_IMAGE_STYLES=["anime","webtoon","manhwa","manga","bl","realista","3d","semi-realista","furry","pintura digital"];
function normalizeImageStyle(value){return CHARACTER_IMAGE_STYLES.indexOf(value)>=0?value:"anime";}
var characterImageVersion=0,characterImageOwner=null;
function resetCharacterImageButton(){var button=$("genImg");if(button){button.disabled=false;button.innerHTML=icon("image")+'<span>Generar imagen con IA</span>';}}
function beginCharacterImageEditor(){accountStore.assertActive();characterImageVersion++;characterImageOwner=accountStore.key();$("img").value="";resetCharacterImageButton();}
function characterImageTicket(){accountStore.assertActive();if(!$("dlg").open||!characterImageOwner||accountStore.key()!==characterImageOwner)throw new Error("La edición cambió. Volvé a abrir el personaje.");return{version:++characterImageVersion,owner:characterImageOwner,editor:editingId};}
function characterImageTicketIsCurrent(ticket){try{return $("dlg").open&&ticket.version===characterImageVersion&&ticket.owner===characterImageOwner&&ticket.editor===editingId&&accountStore.key()===ticket.owner;}catch(error){return false;}}
$("dlg").addEventListener("close",function(){if($("dlg").open)return;characterImageVersion++;characterImageOwner=null;imgData="";$("img").value="";resetCharacterImageButton();});
function visualProfile(c){return String(cfg(c.id).visualProfile||c.imagePrompt||[c.name,c.desc,c.role].filter(Boolean).join("; ")).slice(0,700);}
function editVisualProfile(){var c=cur();if(!c)return;var value=prompt("Describe la apariencia constante del personaje (cabello, ojos, ropa y rasgos):",visualProfile(c));if(value===null)return;cfg(c.id).visualProfile=value.trim().slice(0,700);save();}
function stableImageSeed(id){var hash=0;for(var i=0;i<id.length;i++)hash=(Math.imul(hash,31)+id.charCodeAt(i))|0;return hash>>>1;}
function compressChatImage(url){return new Promise(function(resolve,reject){var im=new Image();im.onerror=function(){reject(new Error("No se pudo leer la imagen."));};im.onload=function(){try{var scale=Math.min(1,640/im.width),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(im.width*scale));canvas.height=Math.max(1,Math.round(im.height*scale));canvas.getContext("2d").drawImage(im,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",0.8));}catch(e){reject(e);}};im.src=url;});}
async function generateChatImage(index){
 var c=cur();if(!c||imageBusy)return;if(!imageAuthReady()){alert("Inicia sesión con una cuenta para generar imágenes.");return;}
 var id=c.id,g=cfg(id),h=hist(id),focus=Number.isInteger(index)&&h[index]&&h[index].role==="assistant"?h[index]:null;
 var scene;
 try{var imageDesc=window.NubbiImageCharacterDescription(c,g.imageCharacterAge),ages=window.NubbiExtractAges(imageDesc);if(!ages.length)throw new Error("Indica una edad explícita de 18 años o más.");scene="Character age declaration: "+ages[0]+" years old\n"+window.NubbiBuildImageScene(c,g,h,focus);}catch(e){alert(e.message+" Abre Escena y revisa los datos del personaje para imágenes.");return;}
 var button=$("bImage");imageBusy=true;if(button){button.disabled=true;button.textContent="Generando imagen…";}
 try{var provider=st.prof.imgProvider||"";if(!provider){var catalog=await loadImageProviders();accountStore.assertActive();provider=catalog&&catalog.defaultProvider||"";}var style=normalizeImageStyle(g.imageStyle||c.imageStyle),j=await api("/api/image",{prompt:buildImagePrompt(scene,style,c.tags,"scene"),style:style,tags:c.tags||"",provider:provider,model:window.NubbiImageModelForProvider(st.prof,provider),adult:adultOn(),width:640,height:896,seed:stableImageSeed(id)});var image=await compressChatImage("data:"+(j.mime||"image/png")+";base64,"+j.image);accountStore.assertActive();
 if(st.chats[id]!==h){alert("La historia cambió durante la generación. No se agregó la imagen.");return;}
 h.push({role:"image",image:image,content:"Imagen de la escena",ts:Date.now()});save();if(st.cur===id)renderChat();
 }catch(e){alert("No se pudo generar la imagen: "+e.message);}finally{imageBusy=false;if(button){button.disabled=false;button.textContent="Crear imagen";}}
}
var chatActions=$("bMemory")&&$("bMemory").parentElement;
if(chatActions){[["bVisual","Ficha visual",editVisualProfile],["bImage","Crear imagen",function(){generateChatImage();}]].forEach(function(spec){var button=document.createElement("button");button.id=spec[0];button.type="button";button.className="g";button.textContent=spec[1];button.onclick=spec[2];chatActions.appendChild(button);});}
function relationshipCfg(id){
 var g=cfg(id);g.autoMem=Array.isArray(g.autoMem)?g.autoMem:[];
 var r=g.relation=g.relation&&typeof g.relation==="object"?g.relation:{};
 ["trust","affinity"].forEach(function(k){var v=Number(r[k]);r[k]=r[k]==null||!Number.isFinite(v)?50:Math.max(0,Math.min(100,v));});
 r.mood=typeof r.mood==="string"?r.mood:"neutral";r.lastEvent=typeof r.lastEvent==="string"?r.lastEvent:"";r.auto=r.auto!==false;return g;
}
function captureExplicitMemory(id,message){
 var g=relationshipCfg(id),text=String(message||"").trim().replace(/\s+/g," ");
 if(text.length>400||!/^(?:recuerda que|record[aá] que|acordate que|no olvides que|mi nombre es|me llamo|mi cumplea[nñ]os es|vivo en)\s+.+/i.test(text))return;
 var fact=text.slice(0,220);if(g.autoMem.some(function(n){return n&&String(n.text).toLowerCase()===fact.toLowerCase();}))return;
 g.autoMem.unshift({text:fact,ts:Date.now()});g.autoMem=g.autoMem.slice(0,20);
}
function evolveRelationship(id,message,emotion){
 var r=relationshipCfg(id).relation;if(!r.auto)return;
 r.mood=Object.prototype.hasOwnProperty.call(EMO,emotion)?emotion:"neutral";
 if(typeof message!=="string")return;
 var t=message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim(),trust=0,affinity=0,reason="";
 // Only unambiguous standalone statements affect scores; no substring matching.
 if(/^(?:gracias|te agradezco|confio en ti|puedes contar conmigo)[.!¡ ]*$/.test(t)){trust=2;affinity=1;reason="Apoyo y agradecimiento";}
 else if(/^(?:perdon|lo siento|disculpame)[.!¡ ]*$/.test(t)){trust=1;reason="Disculpa";}
 else if(/^(?:te odio|no confio en ti|mentiroso|mentirosa|traidor|traidora)[.!¡ ]*$/.test(t)){trust=-2;affinity=-2;reason="Conflicto o desconfianza";}
 else if(/^(?:te quiero|te aprecio|me importas|te amo)[.!¡ ]*$/.test(t)){affinity=2;reason="Expresión de afecto";}
 if(!reason)return;var oldTrust=r.trust,oldAffinity=r.affinity;r.trust=Math.max(0,Math.min(100,r.trust+trust));r.affinity=Math.max(0,Math.min(100,r.affinity+affinity));var changes=[];if(r.trust!==oldTrust)changes.push("confianza "+(r.trust>oldTrust?"+":"")+(r.trust-oldTrust));if(r.affinity!==oldAffinity)changes.push("afinidad "+(r.affinity>oldAffinity?"+":"")+(r.affinity-oldAffinity));r.lastEvent=reason+(changes.length?" · "+changes.join(" · "):"");
}
function renderRelationship(){
 var g=relationshipCfg(st.cur),panel=$("relationshipPanel");
 if(!panel){panel=document.createElement("section");panel.id="relationshipPanel";$("mem").insertAdjacentElement("afterend",panel);}
 panel.innerHTML="<h4>Relación y recuerdos</h4>";
 ["trust","affinity"].forEach(function(k){var label=document.createElement("label"),range=document.createElement("input"),value=document.createElement("span");label.textContent=k==="trust"?"Confianza: ":"Afinidad: ";range.type="range";range.min="0";range.max="100";range.value=g.relation[k];value.textContent=range.value+"/100";range.oninput=function(){g.relation[k]=Number(range.value);value.textContent=range.value+"/100";save();};label.appendChild(value);label.appendChild(range);panel.appendChild(label);});
 var toggle=document.createElement("input"),label=document.createElement("label");toggle.type="checkbox";toggle.checked=g.relation.auto;toggle.onchange=function(){g.relation.auto=toggle.checked;save();};label.appendChild(toggle);label.appendChild(document.createTextNode(" Evolución automática"));panel.appendChild(label);
 var explanation=document.createElement("p");explanation.className="note";explanation.textContent="La afinidad representa cercanía, no necesariamente romance. Los cambios automáticos son aproximados.";panel.appendChild(explanation);
 var mood=document.createElement("p");mood.className="relationship-event";mood.textContent="Emoción: "+g.relation.mood+(g.relation.lastEvent?" · "+g.relation.lastEvent:"");panel.appendChild(mood);
 g.autoMem.forEach(function(n,i){var row=document.createElement("div"),text=document.createElement("p"),edit=document.createElement("button"),del=document.createElement("button");row.className="memory-card";text.textContent=String(n.text);row.appendChild(text);edit.type="button";edit.className="g";edit.textContent="Editar";edit.onclick=function(){var value=prompt("Editar recuerdo:",n.text);if(value===null||!value.trim())return;n.text=value.trim().slice(0,220);save();renderRelationship();};del.type="button";del.className="g";del.textContent="Eliminar";del.onclick=function(){g.autoMem.splice(i,1);save();renderRelationship();};row.appendChild(edit);row.appendChild(del);panel.appendChild(row);});
}
function sys(c){
var g=relationshipCfg(c.id),p=st.prof,adult=adultOn();
var personaId=g.personaId||st.persona;
var persona=(st.personas||[]).find(function(x){return x.id===personaId});
var pname=persona?persona.name:(p.name||"");
var pbio=persona?persona.bio:(p.bio||"");
var pextra="";
if(persona){var pp=[];if(persona.age)pp.push("Edad: "+persona.age);if(persona.pronouns)pp.push("Pronombres: "+persona.pronouns);if(persona.appearance)pp.push("Apariencia: "+persona.appearance);if(persona.relation)pp.push("Relación con "+c.name+": "+persona.relation);pextra=pp.join(". ");}
var memText=[g.memory||"",(g.memoryNotes||[]).concat(g.autoMem).map(function(n){return "- "+n.text;}).join("\n")].filter(Boolean).join("\n").slice(0,3000);
var lang=langInstr();
var modo=window.NubbiStory?window.NubbiStory.instructions(g):(g.mode==="story"
?"Modo historia: narrá con ambiente, acciones y diálogo; hacé avanzar la trama con un hecho o un detalle nuevo."
:"Modo chat: priorizá el diálogo y las acciones, como una conversación real; respetá la longitud elegida.");
var intText=(adult?INT_ADULT:INT)[g.intensity]||(adult?INT_ADULT.rom:INT.rom);
var adultRules="- Todos los personajes tienen 18 años o más y el usuario es adulto (18+). No escribas contenido sexual explícito; si la escena sube de tono, usá elipsis o un corte.\n"
+"- Nunca sexualices a personas no adultas ni a personajes que aparenten no ser adultos; no sexualices personas reales ni situaciones no consentidas. Los personajes antropomórficos adultos pueden participar en historias no explícitas como cualquier otro personaje.\n";
return "Sos "+c.name+(c.role?" ("+c.role+")":"")+", un personaje adulto (18+) en un roleplay interactivo con el usuario"+(pname?", que se llama "+pname:"")+".\n"
+"Descripción: "+(c.desc||"")+"\n"
+"Estado actual de la relación (orientativo, no reemplaza la personalidad): confianza "+g.relation.trust+"/100; afinidad "+g.relation.affinity+"/100; emoción "+g.relation.mood+". La afinidad no implica amor ni consentimiento. Reaccioná gradualmente a los hechos de la historia; no fuerces sentimientos ni decisiones del usuario.\n"
+"Personalidad y forma de ser: "+(c.persona||"")+"\n"
+(pbio?"Sobre el usuario: "+pbio+"\n":"")
+(pextra?"Datos del usuario: "+pextra+"\n":"")
+(g.scenario?"Escenario actual: "+g.scenario+"\n":"")
+(g.userRole?"El usuario interpreta a: "+g.userRole+"\n":"")
+(memText?"Memoria de la historia (tenela en cuenta y no la contradigas):\n"+memText+"\n":"")
+(g.instructions?"Instrucciones del usuario para este chat: "+g.instructions+"\n":"")
+(g.goal?"Objetivo del personaje en la historia: "+g.goal+"\n":"")
+(g.secret?"Secreto del personaje (revelalo de a poco, no lo digas de golpe): "+g.secret+"\n":"")
+(g.arc?"Arco de la historia: "+g.arc+"\n":"")
+"Intensidad: "+intText+"\n"
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
+adultRules
+"- Cerrá con una oportunidad natural para responder; no es obligatorio terminar cada turno con una pregunta ni un suspenso artificial.\n"
+"- Extensión: "+lenInstr()+". Escribí al menos 2 oraciones completas; no respondas con una sola frase.\n"
+"- Idioma: respondé SIEMPRE en "+lang+". Todo el diálogo, la narración y la emoción deben estar en ese idioma. Si el historial tiene mensajes en otro idioma, entendelos y respondé en el idioma elegido.\n"
+"FORMATO OBLIGATORIO: la primera línea es solo la emoción entre corchetes, elegida de: "+Object.keys(EMO).join(", ")+". No omitas esa línea. Después, el mensaje.";
}
async function turn(extra,relationshipMessage){
var c=cur();if(!c||busy)return;var h=hist(c.id);var el=bubble("assistant","");el.innerHTML='<span class="typing"><span></span><span></span><span></span></span>';
if(!sample){el.textContent="No hay IA conectada.";return;}
busy=true;var tr=h.filter(function(x){return x.role==="user"||x.role==="assistant";}).slice(-40).map(function(x){return(x.role==="user"?"Usuario: ":c.name+(x.emo?" ["+x.emo+"]":"")+": ")+x.content}).join("\n");
var storyContext=window.NubbiStory?window.NubbiStory.buildPrompt(sys(c),h,{characterName:c.name,language:langInstr(),extra:extra}):null;
var p=storyContext?storyContext.prompt:sys(c)+"\n\nConversación hasta ahora:\n"+tr+(extra?"\n\n("+extra+")":"")+"\n\nTu respuesta (solo el personaje, no escribas por el usuario, respondé en "+langInstr()+"):";
try{var r=await sample(p,{stream:true,storyMessages:storyContext?storyContext.messages:undefined,temperature:tempValue(),max_tokens:lenMax(),onText:function(o){fmt(el,o.text.replace(/^\[[^\]]*\]\s*/,""));$("msgs").scrollTop=1e9;}});
var t=r.text||"";if(!t.trim())throw new Error("No se recibió respuesta del modelo.");var m=t.match(/^\[([^\]]*)\]\s*/),emo=m?m[1].toLowerCase().trim():"neutral";if(m)t=t.slice(m[0].length);
h.push({role:"assistant",content:t,emo:emo,ts:Date.now()});evolveRelationship(c.id,relationshipMessage,emo);save();renderChat();if(voiceCfg().auto)speak(t,c.id);}
catch(e){el.textContent="Error: "+((e&&e.message)||"no se pudo responder");}
busy=false;}
function send(t){var c=cur();if(!c||busy||!t.trim())return;if("speechSynthesis" in window)speechSynthesis.cancel();hist(c.id).push({role:"user",content:t,ts:Date.now()});captureExplicitMemory(c.id,t);bubble("user",t);save();turn(null,t);}
$("f").onsubmit=function(ev){ev.preventDefault();var v=$("inp").value;$("inp").value="";send(v);};
$("bAct").onclick=function(){var i=$("inp"),v=i.value.trim();if(v&&v[0]!=="*")i.value="*"+v+"*";else if(!v)i.value="**";i.focus();};
$("bCont").onclick=function(){turn("El usuario quiere que la historia continúe sola: avanzá la trama con un giro o evento nuevo.");};
$("bScene").onclick=function(){turn("Hacé una transición a una nueva escena (cambio de lugar o de momento) y abrila con la situación nueva.");};
$("bImpro").onclick=function(){turn("Tomá la iniciativa: introducí un detalle, un conflicto o una pregunta nueva que haga avanzar la escena, sin escribir por el usuario.");};
$("bRegen").onclick=function(){var c=cur();if(!c||busy)return;var h=hist(c.id);while(h.length&&h[h.length-1].role==="assistant")h.pop();save();renderChat();turn();};
if($("bMemory"))$("bMemory").onclick=openMemory;
if($("bDirector"))$("bDirector").onclick=director;
if($("bRamas"))$("bRamas").onclick=function(){if(!st.cur)return;renderBranches();$("brdlg").showModal();};
if($("bExport"))$("bExport").onclick=exportChat;
if($("dAgain"))$("dAgain").onclick=async function(){var b=this;b.disabled=true;b.textContent="Pensando...";try{await director();}finally{b.disabled=false;b.textContent="Otras opciones";}};
if($("dClose"))$("dClose").onclick=function(){$("ddlg").close();};
if($("brSave"))$("brSave").onclick=function(){var c=cur();if(!c)return;var name=prompt("Nombre de la rama:","Rama "+new Date().toLocaleString());if(name==null)return;saveBranchSnapshot(c.id,name||"Rama",hist(c.id));renderBranches();};
if($("brClose"))$("brClose").onclick=function(){$("brdlg").close();};
if($("memSave"))$("memSave").onclick=function(){var g=cfg(st.cur);g.memory=$("mem").value.trim();save();$("mdlg").close();};
if($("memCancel"))$("memCancel").onclick=function(){$("mdlg").close();};
if($("memClear"))$("memClear").onclick=function(){if(!confirm("¿Borrar la memoria y restablecer la relación de este chat?"))return;var g=cfg(st.cur);g.memory="";g.memoryNotes=[];g.autoMem=[];g.relation={trust:50,affinity:50,mood:"neutral",lastEvent:"",auto:true};save();$("mem").value="";renderMemNotes();renderRelationship();};
if($("memSum"))$("memSum").onclick=async function(){var c=cur();if(!c||busy)return;var h=hist(c.id);if(h.length<2){alert("Todavía no hay suficiente conversación para resumir.");return;}var b=this,old=b.innerHTML;b.disabled=true;b.innerHTML=icon("sparkles")+'<span>Resumiendo...</span>';var conv=h.slice(-50).map(function(x){return(x.role==="user"?"Usuario: ":c.name+": ")+x.content;}).join("\n");var p="Resumí esta conversación de roleplay en 6 a 10 viñetas breves. Incluí nombres, relaciones, lugares, promesas, secretos y cambios importantes. No inventes nada. Escribí en "+langInstr()+".\n\nConversación:\n"+conv;try{var r=await sample(p,{temperature:0.4,max_tokens:700});$("mem").value=(r.text||"").trim();}catch(e){alert("No se pudo resumir: "+e.message);}b.disabled=false;b.innerHTML=old;};
function renderMemNotes(){var el=$("memNotes");if(!el)return;var g=cfg(st.cur);el.innerHTML="";var notes=g.memoryNotes||[];if(!notes.length){el.innerHTML='<div class="note">Todavía no guardaste recuerdos sueltos.</div>';return;}notes.forEach(function(n,i){var row=document.createElement("div");row.className="row";var t=document.createElement("div");t.textContent=n.text;var del=document.createElement("button");del.className="g icon-btn sm";del.type="button";del.innerHTML=icon("close");del.setAttribute("aria-label","Eliminar recuerdo");del.title="Eliminar recuerdo";del.onclick=function(){g.memoryNotes.splice(i,1);save();renderMemNotes();};row.appendChild(t);row.appendChild(del);el.appendChild(row);});}
function openMemory(){var c=cur();if(!c)return;var g=relationshipCfg(c.id);if($("mem"))$("mem").value=g.memory||"";renderMemNotes();renderRelationship();if($("mdlg"))$("mdlg").showModal();}
function renderDirector(opts){var el=$("dopts");if(!el)return;el.innerHTML="";if(!opts||!opts.length){el.innerHTML='<div class="note">No se generaron opciones. Probá de nuevo.</div>';return;}opts.forEach(function(o){var b=document.createElement("button");b.type="button";b.className="g";b.textContent=o;b.onclick=function(){if($("ddlg").open)$("ddlg").close();send(o);};el.appendChild(b);});}
async function director(){var c=cur();if(!c||busy)return;if(!sample){alert("La IA no está disponible.");return;}var g=cfg(c.id),h=hist(c.id);var b=$("bDirector");if(b){b.disabled=true;b.innerHTML=icon("film")+'<span>Pensando...</span>';}var tr=h.slice(-14).map(function(x){return(x.role==="user"?"Usuario: ":c.name+": ")+x.content;}).join("\n");var p="Sos el director de una historia interactiva de roleplay. Personaje: "+c.name+".\nEscenario: "+(g.scenario||"libre")+"\nObjetivo: "+(g.goal||"avanzar la historia")+"\nConversación:\n"+tr+"\n\nProponé exactamente 3 próximos giros o acciones posibles para el usuario, breves (máximo 14 palabras cada uno). Devolvé SOLO JSON: {\"options\":[\"opción 1\",\"opción 2\",\"opción 3\"]}. No escribas la respuesta del personaje. Escribí en "+langInstr()+".";try{var r=await sample(p,{temperature:0.9,max_tokens:500,response_format:{type:"json_object"}});var m=(r.text||"").match(/\{[\s\S]*\}/);if(!m)throw new Error("El modelo no devolvió opciones.");var j=JSON.parse(m[0]);var opts=Array.isArray(j.options)?j.options:[];opts=opts.map(function(x){return String(x).trim();}).filter(Boolean).slice(0,3);if(!opts.length)throw new Error("No se generaron opciones.");renderDirector(opts);if($("ddlg")&&!$("ddlg").open)$("ddlg").showModal();}catch(e){alert("No se pudo generar el director: "+e.message);}if(b){b.disabled=false;b.innerHTML=icon("film")+'<span>Director</span>';}}
function renderBranches(){var el=$("brlist");if(!el)return;el.innerHTML="";var list=branchStore(st.cur);if(!list.length){el.innerHTML='<div class="empty">No hay ramas guardadas. Usá el botón de rama en un mensaje o "Guardar rama actual".</div>';return;}list.forEach(function(b){var row=document.createElement("div");row.className="row";var t=document.createElement("div");var n=document.createElement("b");n.textContent=b.name||"Rama";var s=document.createElement("small");s.textContent=(b.messages?b.messages.length:0)+" mensajes · "+new Date(b.ts).toLocaleString();t.appendChild(n);t.appendChild(s);row.appendChild(t);var open=document.createElement("button");open.className="g";open.type="button";open.textContent="Abrir";open.onclick=function(){openBranch(b);};row.appendChild(open);var del=document.createElement("button");del.className="g icon-btn sm";del.type="button";del.innerHTML=icon("close");del.setAttribute("aria-label","Eliminar rama");del.title="Eliminar rama";del.onclick=function(){if(!confirm("¿Eliminar esta rama?"))return;var arr=branchStore(st.cur),pos=arr.indexOf(b);if(pos>=0)arr.splice(pos,1);save();renderBranches();};row.appendChild(del);el.appendChild(row);});}
function openBranch(b){var c=cur();if(!c||!b)return;if(!confirm("¿Abrir esta rama? La historia actual se guarda como rama."))return;var h=hist(c.id);if(h.length)saveBranchSnapshot(c.id,"Actual "+new Date().toLocaleString(),h);var arr=branchStore(c.id),pos=arr.indexOf(b);if(pos>=0)arr.splice(pos,1);var old=cfg(c.id),nc=deepCopy(b.cfg||{});nc.bg=old.bg;nc.bubble=old.bubble||nc.bubble;nc.bgDim=old.bgDim;st.chats[c.id]=deepCopy(b.messages||[]);st.cfg[c.id]=nc;cfg(c.id);save();renderChat();renderBranches();if($("brdlg").open)$("brdlg").close();}
function exportChat(){var c=cur();if(!c)return;var h=hist(c.id);var md="# "+c.name+"\n\n"+(c.desc||"")+"\n\n"+h.map(function(m){return(m.role==="user"?"**Vos:** ":"**"+c.name+":** ")+m.content;}).join("\n\n");var blob=new Blob([md],{type:"text/markdown;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nubbi-"+String(c.name).replace(/[^\w\-]+/g,"-").toLowerCase()+".md";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
$("reset").onclick=function(){if("speechSynthesis" in window)speechSynthesis.cancel();delete st.chats[st.cur];save();hist(st.cur);renderChat();};
function initStoryControls(){
 var engine=window.NubbiStory,anchor=$("mode");if(!engine||!anchor)return;
 var section=document.createElement("section");section.className="story-controls";section.setAttribute("aria-labelledby","storyControlsTitle");
 var title=document.createElement("h4");title.id="storyControlsTitle";title.textContent="Dirección de la historia";section.appendChild(title);
 function select(id,label,items){var lab=document.createElement("label"),sel=document.createElement("select");lab.htmlFor=id;lab.textContent=label;sel.id=id;Object.keys(items).forEach(function(key){var option=document.createElement("option");option.value=key;option.textContent=items[key].label;sel.appendChild(option);});section.appendChild(lab);section.appendChild(sel);return sel;}
 var styles=select("storyStyle","Estilo narrativo",engine.styles),lengths=Object.assign({'':{label:'Usar preferencia de Perfil'}},engine.lengths);select("storyLength","Extensión para este chat",lengths);
 var note=document.createElement("p");note.id="storyStyleDescription";note.className="note";styles.setAttribute("aria-describedby",note.id);styles.onchange=function(){note.textContent=engine.styles[engine.styleKey({storyStyle:styles.value})].description;};section.appendChild(note);
 var lab=document.createElement("label"),canon=document.createElement("textarea");lab.htmlFor="storyCanon";lab.textContent="Hechos de continuidad";canon.id="storyCanon";canon.maxLength=1600;canon.rows=3;canon.placeholder="Ej.: seguimos en el faro; la llave está en mi mochila; todavía no conoce mi nombre.";section.appendChild(lab);section.appendChild(canon);
 var help=document.createElement("p");help.className="note";help.textContent="Estos son estilos de escritura del modelo elegido en Perfil, no motores nuevos. Los hechos se guardan solo en este chat y sus ramas. Las respuestas largas tardan más; no garantizan mayor calidad.";section.appendChild(help);anchor.insertAdjacentElement("afterend",section);
 var profile=$("plen");if(profile&&!Array.from(profile.options).some(function(o){return o.value==='extended';})){var option=document.createElement("option");option.value='extended';option.textContent='Capítulo';profile.appendChild(option);}
}
initStoryControls();
$("cfg").onclick=function(){var g=cfg(st.cur);$("sc").value=g.scenario||"";$("imageCharacterAge").value=g.imageCharacterAge||"";$("ur").value=g.userRole||"";$("mode").value=g.mode||"chat";if($("chatImageStyle"))$("chatImageStyle").value=g.imageStyle?normalizeImageStyle(g.imageStyle):"";$("int").value=g.intensity||"rom";if($("storyStyle")){$("storyStyle").value=window.NubbiStory.styleKey(g);$("storyStyle").onchange();$("storyLength").value=g.storyLength||"";$("storyCanon").value=g.storyCanon||"";}if($("ci"))$("ci").value=g.instructions||"";if($("cgoal"))$("cgoal").value=g.goal||"";if($("csecret"))$("csecret").value=g.secret||"";if($("carc"))$("carc").value=g.arc||"";if($("cbubble"))$("cbubble").value=g.bubble||"rounded";if($("cdim"))$("cdim").value=(g.bgDim==null?0.2:g.bgDim);var sel=$("pcfg");if(sel){sel.innerHTML='<option value="">Perfil actual</option>';(st.personas||[]).forEach(function(p){var o=document.createElement("option");o.value=p.id;o.textContent=p.name;sel.appendChild(o);});sel.value=g.personaId||"";}$("cdlg").showModal();};
$("csave").onclick=function(){var g=cfg(st.cur),declaredAge=$("imageCharacterAge").value;if(declaredAge){try{window.NubbiImageCharacterDescription(cur(),declaredAge);}catch(e){alert(e.message);return;}}g.imageCharacterAge=declaredAge;g.scenario=$("sc").value.trim();g.userRole=$("ur").value.trim();g.mode=$("mode").value;if($("chatImageStyle")){if($("chatImageStyle").value)g.imageStyle=normalizeImageStyle($("chatImageStyle").value);else delete g.imageStyle;}g.intensity=$("int").value;if($("storyStyle")){g.storyStyle=$("storyStyle").value;g.storyLength=$("storyLength").value;g.storyCanon=$("storyCanon").value.trim().slice(0,1600);}if($("ci"))g.instructions=$("ci").value.trim().slice(0,600);if($("cgoal"))g.goal=$("cgoal").value.trim();if($("csecret"))g.secret=$("csecret").value.trim();if($("carc"))g.arc=$("carc").value.trim();if($("cbubble"))g.bubble=$("cbubble").value;if($("cdim"))g.bgDim=Number($("cdim").value);var sel=$("pcfg");if(sel)g.personaId=sel.value||null;save();renderChat();$("cdlg").close();};
if($("cbg"))$("cbg").onchange=function(){var input=this;bgPic(input,function(d){var g=cfg(st.cur);g.bg=d;save();renderChat();input.value="";});};
if($("cbgClear"))$("cbgClear").onclick=function(){var g=cfg(st.cur);g.bg="";save();renderChat();};
if($("cdim"))$("cdim").oninput=function(){var g=cfg(st.cur);g.bgDim=Number(this.value);save();if(g.bg){var md=$("msgs");md.style.background='linear-gradient(rgba(0,0,0,'+g.bgDim+'),rgba(0,0,0,'+g.bgDim+')), url("'+g.bg+'") center / cover no-repeat';}};
if($("cbubble"))$("cbubble").onchange=function(){var g=cfg(st.cur);g.bubble=this.value;save();renderChat();};

function pic(inp,cb){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var cv=document.createElement("canvas");cv.width=cv.height=200;var x=cv.getContext("2d"),s=Math.min(im.width,im.height);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,200,200);cb(cv.toDataURL("image/jpeg",.8));};im.src=r.result;};r.readAsDataURL(f);}
function bgPic(inp,cb){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var w=Math.min(720,im.width),h=Math.round(im.height*w/im.width);var cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(im,0,0,w,h);cb(cv.toDataURL("image/jpeg",.65));};im.src=r.result;};r.readAsDataURL(f);}
$("pav").onclick=function(){$("pimg").click();};
$("pimg").onchange=function(){pic(this,function(d){st.prof.img=d;save();renderProf();});};
$("pn").oninput=function(){st.prof.name=this.value;save();};$("pb").oninput=function(){st.prof.bio=this.value;save();};$("pint").onchange=function(){st.prof.intensity=this.value;save();};if($("padult"))$("padult").onchange=function(){st.prof.adult=this.value==="on";save();renderProf();};if($("ptheme"))$("ptheme").onchange=function(){st.prof.theme=this.value;save();applyPrefs();};if($("pfont"))$("pfont").onchange=function(){st.prof.fontScale=this.value;save();applyPrefs();renderProf();};if($("pdensity"))$("pdensity").onchange=function(){st.prof.density=this.value;save();applyPrefs();renderProf();};if($("panim"))$("panim").onchange=function(){st.prof.anim=this.value==="on";save();applyPrefs();renderProf();};
if($("plang"))$("plang").onchange=function(){st.prof.lang=this.value;save();};
if($("ptemp"))$("ptemp").onchange=function(){st.prof.temp=this.value;save();};
if($("plen"))$("plen").onchange=function(){st.prof.len=this.value;save();};
if($("pmodel"))$("pmodel").onchange=function(){st.prof.model=this.value;save();};
if($("pvoice"))$("pvoice").onchange=function(){voiceCfg().voiceURI=this.value;save();};
if($("pvoicerate"))$("pvoicerate").oninput=function(){voiceCfg().rate=Number(this.value)||1;save();};
if($("pvoicepitch"))$("pvoicepitch").oninput=function(){voiceCfg().pitch=Number(this.value)||1;save();};
if($("pvoiceauto"))$("pvoiceauto").onchange=function(){voiceCfg().auto=this.value==="on";save();};
if($("pvoicetest"))$("pvoicetest").onclick=function(){speak("Hola. Esta es mi voz. ¿Te gusta cómo suena?");};
if("speechSynthesis" in window){speechSynthesis.onvoiceschanged=initVoices;initVoices();}
$("theme").onclick=function(){var r=document.documentElement,d=r.dataset.theme==="dark"||(!r.dataset.theme&&matchMedia("(prefers-color-scheme:dark)").matches);r.dataset.theme=d?"light":"dark";};
$("wipe").onclick=function(){if(confirm("¿Borrar todos tus chats?")){if("speechSynthesis" in window)speechSynthesis.cancel();st.chats={};save();renderAll();}};
if($("exportData"))$("exportData").onclick=function(){var blob=new Blob([JSON.stringify(st)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nubbi-backup.json";a.click();URL.revokeObjectURL(a.href);};
if($("importData"))$("importData").onclick=function(){$("importFile").click();};
if($("importFile"))$("importFile").onchange=function(){
 var f=this.files[0];if(!f)return;var owner=accountStore.key();
 if(!confirm('¿Reemplazar TODOS los datos de esta cuenta con el archivo? Los campos ausentes volverán a sus valores iniciales. No se subirá a Firebase. Es obligatorio guardar una copia recuperable antes de reemplazar datos existentes.'))return;
 var r=new FileReader();r.onerror=function(){alert('No se pudo leer el respaldo. Los datos no cambiaron.');};
 r.onload=function(){try{
  if(accountStore.key()!==owner)throw new Error('La cuenta cambió.');
  var o=accountStore.validate(r.result);accountStore.replace(JSON.stringify(o),'file');location.reload();
 }catch(e){alert('No se importó el respaldo: '+e.message);}};r.readAsText(f);
};
if($("importChar"))$("importChar").onclick=importChar;
function renderAccount(){
var box=$("accBox");if(!box)return;
var cs=window.cloudSync;
var status=$("accStatus"),guest=$("accGuest"),user=$("accUser"),emailShow=$("accEmailShow");
if(!cs){if(status)status.textContent="Sincronización no configurada.";if(guest)guest.style.display="none";if(user)user.style.display="none";return;}
var u=cs.currentUser();
if(u&&!u.isAnonymous){
if(status)status.textContent="Cuenta privada · datos locales separados · sincronización manual";
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
 var cs=window.cloudSync;if(!cs){alert('Firebase no está configurado.');return;}
 var c=accCreds();if(!c)return;var b=this;b.disabled=true;b.textContent='Creando...';
 try{await cs.register(c.email,c.pass);$('accPass').value='';
  // Explicit reload also handles anonymous->registered linking (same Firebase UID).
  accountStore.lock();location.reload();
 }catch(e){alert(cs.friendly?cs.friendly(e):('Error: '+e.message));b.disabled=false;b.textContent='Crear cuenta';}
};
if($("accLogin"))$("accLogin").onclick=async function(){
 var cs=window.cloudSync;if(!cs){alert('Firebase no está configurado.');return;}
 var c=accCreds();if(!c)return;var b=this;b.disabled=true;b.textContent='Entrando...';
 try{await cs.signIn(c.email,c.pass);$('accPass').value='';
  // Nothing uploads or downloads on sign-in. Use explicit sync controls afterward.
  accountStore.lock();location.reload();
 }catch(e){alert(cs.friendly?cs.friendly(e):('Error: '+e.message));b.disabled=false;b.textContent='Iniciar sesión';}
};
if($("accLogout"))$("accLogout").onclick=async function(){
 var cs=window.cloudSync;if(!cs)return;
 try{await cs.signOut();accountStore.lock();location.reload();}catch(e){alert(cs.friendly?cs.friendly(e):('Error: '+e.message));}
};
if($("accReset"))$("accReset").onclick=async function(){
var cs=window.cloudSync;if(!cs){alert("Firebase no está configurado.");return;}
var e=($("accEmail").value||"").trim();if(!e){alert("Escribí tu email arriba para enviarte el enlace.");return;}
try{await cs.reset(e);alert("Te enviamos un email para restablecer la contraseña.");}
catch(err){alert(cs.friendly?cs.friendly(err):("Error: "+err.message));}
};
if($("syncUp"))$("syncUp").onclick=async function(){
 if(!window.cloudSync){alert('Configurá Firebase primero.');return;}
 if(!confirm('¿Subir los datos de ESTA cuenta y reemplazar su copia de Firebase? Descargá/exportá un respaldo antes de continuar.'))return;
 try{await window.cloudSync.save();renderAccount();alert('Datos subidos a la nube.');}catch(e){alert('Error al subir: '+e.message);}
};
if($("syncDown"))$("syncDown").onclick=async function(){
 if(!window.cloudSync){alert('Configurá Firebase primero.');return;}
 if(!confirm('¿Reemplazar los datos locales de ESTA cuenta con su respaldo de Firebase? Nubbi intentará guardar una copia de recuperación antes.'))return;
 try{if(await window.cloudSync.load())location.reload();}catch(e){alert('Error al bajar: '+e.message);}
};
// Explicit migration: the original nubbi-v1 key and guest copy are never deleted.
(function accountImportControls(){
 var host=document.querySelector('#v-prof .prof');if(!host)return;
 var section=document.createElement('section');section.className='appearance-controls nb-account-migration';
 var title=document.createElement('h4');title.textContent='Privacidad y datos de esta cuenta';section.appendChild(title);
 var note=document.createElement('p');note.className='note';note.textContent=(accountStore.principal==='guest'?'Estás en el espacio de invitado de este navegador.':'Estás en el espacio privado de la cuenta iniciada.')+' No se copian ni suben datos al iniciar sesión. Los datos anteriores no tienen propietario identificado: importalos solo si te pertenecen.';section.appendChild(note);
 function addImport(source,label){
  if(!accountStore.hasSource(source))return;
  var b=document.createElement('button');b.type='button';b.className='g';b.textContent=label;b.dataset.accountImport=source;
  b.onclick=function(){
   if(!confirm('¿Importar TODOS esos datos al espacio actual y reemplazar su historial, personajes y ajustes locales? No se borrará el origen. Se intentará guardar una copia de recuperación del destino.'))return;
   try{accountStore.importSource(source);location.reload();}
   catch(e){alert('No se pudo importar: '+e.message);}
  };
  section.appendChild(b);
 }
 addImport('legacy','Importar datos anteriores de Nubbi');
 if(accountStore.principal!=='guest')addImport('guest','Importar datos de invitado');
 var recoveries=accountStore.listRecoveries();
 if(recoveries.length){
  var recovery=document.createElement('button');recovery.type='button';recovery.className='g';
  recovery.textContent='Restaurar copia de recuperación ('+recoveries.length+')';
  recovery.onclick=function(){
   if(!confirm('¿Restaurar la copia anterior más reciente de ESTA cuenta? El estado actual también quedará respaldado antes de reemplazarlo.'))return;
   try{accountStore.restoreRecovery(recoveries[0]);location.reload();}
   catch(e){alert('No se pudo restaurar: '+e.message);}
  };
  section.appendChild(recovery);
 }
 host.appendChild(section);
 // Tell returning users why old data is not shown until they assign ownership.
 var hasOwnData=(st.custom||[]).length || Object.keys(st.chats||{}).length || (st.favs||[]).length;
 if(!hasOwnData&&accountStore.hasSource('legacy')){
  var home=document.getElementById('v-home');
  if(home){
   var callout=document.createElement('section');callout.className='appearance-controls nb-legacy-notice';
   var copy=document.createElement('p');copy.textContent='Encontramos datos anteriores en este navegador. No los importamos automáticamente para evitar mezclarlos entre cuentas.';
   var open=document.createElement('button');open.type='button';open.className='g';open.textContent='Revisar mis datos anteriores';
   open.onclick=function(){go('prof');section.scrollIntoView({block:'start'});};
   callout.append(copy,open);home.insertBefore(callout,home.firstChild);
  }
 }
})();
var personaEditId=null,personaEditOwner=null,personaEditVersion=0,personaDraftImage="",personaImageURL=null;
function personaImageStatus(text){$("pimageStatus").textContent=text||"";}
function renderPersonaImagePreview(){var has=personaImageIsLocal(personaDraftImage),preview=$("pimagePreview");preview.hidden=!has;if(has)preview.src=personaDraftImage;else preview.removeAttribute("src");$("pimagePlaceholder").hidden=has;$("premoveimage").disabled=!has;}
function personaEditorIsCurrent(version,owner){try{return $("pdlg").open&&version===personaEditVersion&&owner===personaEditOwner&&accountStore.key()===owner;}catch(error){return false;}}
function clearPersonaImageURL(){if(personaImageURL){URL.revokeObjectURL(personaImageURL);personaImageURL=null;}}
function openPersonaEditor(persona){
 accountStore.assertActive();clearPersonaImageURL();personaEditVersion++;personaEditOwner=accountStore.key();personaEditId=persona?persona.id:null;personaDraftImage=persona&&personaImageIsLocal(persona.img)?persona.img:"";
 var fields={pname:"name",pbio:"bio",page:"age",ppron:"pronouns",papp:"appearance",prel:"relation"};Object.keys(fields).forEach(function(id){$(id).value=persona&&persona[fields[id]]!=null?persona[fields[id]]:"";});
 $("pdlgTitle").textContent=persona?"Editar persona":"Nueva persona";$("pimage").value="";$("psave").disabled=false;$("psave").textContent=persona?"Guardar cambios":"Guardar";personaImageStatus("");renderPersonaImagePreview();if(!$("pdlg").open)$("pdlg").showModal();$("pname").focus();
}
function readPersonaImage(file,isCurrent){
 return Promise.resolve().then(async function(){
  if(!file||!file.size)throw new Error("Elegí una imagen JPEG, PNG o WebP.");if(file.size>8*1024*1024)throw new Error("La imagen debe pesar 8 MB o menos.");
  if(file.type&&["image/jpeg","image/png","image/webp"].indexOf(file.type)<0)throw new Error("Solo se admiten imágenes JPEG, PNG o WebP.");
  var bytes=new Uint8Array(await file.slice(0,32).arrayBuffer()),png=bytes.length>=24&&[137,80,78,71,13,10,26,10].every(function(x,i){return bytes[i]===x;}),jpeg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=bytes.length>=16&&String.fromCharCode.apply(null,bytes.slice(0,4))==="RIFF"&&String.fromCharCode.apply(null,bytes.slice(8,12))==="WEBP";
  if(!png&&!jpeg&&!webp)throw new Error("El archivo no contiene una imagen JPEG, PNG o WebP válida.");
  if(png){var view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w>8192||h>8192||w*h>24000000)throw new Error("La imagen supera 8192 píxeles por lado o 24 megapíxeles.");}
  if(!isCurrent())throw new Error("La edición se canceló o la cuenta cambió.");
  return new Promise(function(resolve,reject){
   var image=new Image(),url=URL.createObjectURL(file),timer;personaImageURL=url;
   function clean(){clearTimeout(timer);image.onload=image.onerror=null;URL.revokeObjectURL(url);if(personaImageURL===url)personaImageURL=null;}
   function fail(message){clean();reject(new Error(message));}
   image.onload=function(){
    try{if(!isCurrent())throw new Error("La edición se canceló o la cuenta cambió.");var w=image.naturalWidth,h=image.naturalHeight;if(!w||!h||w>8192||h>8192||w*h>24000000)throw new Error("La imagen supera 8192 píxeles por lado o 24 megapíxeles.");var canvas=document.createElement("canvas");canvas.width=canvas.height=512;var context=canvas.getContext("2d");if(!context)throw new Error("No pude preparar esta imagen.");context.fillStyle="#ffffff";context.fillRect(0,0,512,512);var side=Math.min(w,h);context.drawImage(image,(w-side)/2,(h-side)/2,side,side,0,0,512,512);var data=canvas.toDataURL("image/jpeg",.82);if(!personaImageIsLocal(data))throw new Error("La imagen preparada es demasiado grande. Probá otra imagen.");clean();resolve(data);}catch(error){fail(error.message||"No pude preparar esta imagen.");}
   };
   image.onerror=function(){fail("No pude leer esta imagen. Probá otro archivo.");};timer=setTimeout(function(){fail("La imagen tardó demasiado en abrirse. Probá una más pequeña.");},15000);image.src=url;
  });
 });
}
$("newPersona").onclick=function(){try{openPersonaEditor(null);}catch(error){alert(error.message);}};
$("pcancel").onclick=function(){$("pdlg").close();};
$("pdlg").addEventListener("close",function(){if($("pdlg").open)return;personaEditVersion++;personaEditOwner=null;personaEditId=null;personaDraftImage="";clearPersonaImageURL();$("pimage").value="";$("psave").disabled=false;renderPersonaImagePreview();personaImageStatus("");});
$("pimage").onchange=async function(){
 var file=this.files&&this.files[0];if(!file)return;clearPersonaImageURL();var version=++personaEditVersion,owner=personaEditOwner;$("psave").disabled=true;personaImageStatus("Preparando imagen en este dispositivo…");
 try{var result=await readPersonaImage(file,function(){return personaEditorIsCurrent(version,owner);});if(!personaEditorIsCurrent(version,owner))return;personaDraftImage=result;renderPersonaImagePreview();personaImageStatus("Imagen lista. Se guardará con esta persona cuando pulses Guardar.");}
 catch(error){if(personaEditorIsCurrent(version,owner))personaImageStatus(error.message);}
 finally{if(personaEditorIsCurrent(version,owner)){$("psave").disabled=false;$("pimage").value="";}}
};
$("premoveimage").onclick=function(){personaEditVersion++;clearPersonaImageURL();personaDraftImage="";$("pimage").value="";$("psave").disabled=false;renderPersonaImagePreview();personaImageStatus("Imagen quitada del borrador. Guardá para aplicar el cambio.");};
$("psave").onclick=function(){
 if(this.disabled)return;try{
  if(!personaEditorIsCurrent(personaEditVersion,personaEditOwner))throw new Error("La cuenta cambió. Cerrá y volvé a abrir la persona.");var n=$("pname").value.trim();if(!n){personaImageStatus("Escribí un nombre para la persona.");$("pname").focus();return;}
  var age=$("page").value.trim();if(age&&(!Number.isSafeInteger(Number(age))||Number(age)<18)){personaImageStatus("La edad debe ser un número entero de 18 años o más.");$("page").focus();return;}
  var existing=personaEditId&&(st.personas||[]).find(function(p){return p.id===personaEditId;});if(personaEditId&&!existing)throw new Error("Esta persona ya no existe. Volvé a crearla.");
  var per=Object.assign({},existing||{},{id:existing?existing.id:"per"+Date.now()+Math.random().toString(36).slice(2,7),name:n,bio:$("pbio").value.trim(),age:age,pronouns:$("ppron").value.trim(),appearance:$("papp").value.trim(),relation:$("prel").value.trim()});if(personaDraftImage)per.img=personaDraftImage;else delete per.img;
  var next=existing?st.personas.map(function(p){return p.id===existing.id?per:p;}):[per].concat(st.personas||[]);persistPersonaList(next,existing?st.persona:per.id,personaEditOwner);$("pdlg").close();renderPersonas();renderProf();
 }catch(error){personaImageStatus("No se pudo guardar: "+error.message);}
};

$("plus").onclick=function(){editingId=null;beginCharacterImageEditor();showWzError("");imgData="";$("pr").style.display="none";$("pr").textContent="";$("imagePrompt").value="";$("dlg").querySelector("h3").textContent="Crear personaje";["n","d","r","p","gr","idea"].forEach(function(i){if($(i))$(i).value="";});$("e").value="🦇";$("gen2").value="Masculino";if($("genStatus"))$("genStatus").textContent="";$("save").textContent="Guardar";if($("iprov"))$("iprov").value=(st.prof&&st.prof.imgProvider)||"";fillImageEngine(true);$("dlg").showModal();};
$("cancel").onclick=function(){if($("genStatus"))$("genStatus").textContent="";$("save").textContent="Guardar";$("dlg").close();};
$("img").onchange=function(){if(!this.files||!this.files[0])return;try{var ticket=characterImageTicket();resetCharacterImageButton();pic(this,function(d){if(!characterImageTicketIsCurrent(ticket))return;imgData=d;$("pr").style.display="block";$("pr").textContent="Imagen subida, se guarda con el personaje.";});}catch(error){showWzError(error.message);}};
$("imagePrompt").oninput=showPr;
function showPr(){var p=$("imagePrompt").value;if(!p){$("pr").style.display="none";$("pr").textContent="";return;}$("pr").style.display="block";$("pr").textContent="Prompt de imagen ("+$("sty").value+"): "+buildImagePrompt(p,$("sty").value,"");}
$("sty").onchange=function(){showPr();updateStyleWarning();};
function setGenStatus(t,err){var el=$("genStatus");if(!el)return;el.textContent=t||"";el.style.color=err?"#ff8a8a":"";}
function showWzError(msg){var e=$("wzErr");if(e){e.textContent=msg||"";e.style.display=msg?"block":"none";if(msg&&e.scrollIntoView)e.scrollIntoView({block:"nearest"});}else alert(msg||"");}
var imageProvidersCache=null;
function loadImageProviders(force){if(imageProvidersCache&&!force)return Promise.resolve(imageProvidersCache);return fetch("/api/image/models").then(function(r){return r.json();}).then(function(j){imageProvidersCache=j;return j;}).catch(function(){return null;});}
function fillImageEngine(force){
 var psel=$("iprov"),msel=$("sdm"),note=$("imageEngineNote");
 if(!psel||!msel)return;
 var preferred=psel.value||((st.prof&&st.prof.imgProvider)||"");
 loadImageProviders(force).then(function(j){
  if(!j){if(note)note.textContent="No pude consultar los proveedores de imagen.";return;}
  var provs=j.providers||{};
  psel.querySelectorAll('option[data-unavailable]').forEach(function(o){o.remove();});psel.disabled=false;
  Array.prototype.forEach.call(psel.options,function(o){
   var p=provs[o.value]||{};
   o.disabled=!p.available;
   if(o.value==="cloudflare")o.textContent="Cloudflare · modelos alojados"+(p.available?"":" (no configurado)");
   if(o.value==="forge")o.textContent="Forge · mis modelos"+(p.available?" ("+p.models.length+")":" (no disponible)");
   if(o.value==="huggingface")o.textContent="HuggingFace · "+((p.model)||"HF_IMAGE_MODEL")+(p.available?"":" (no configurado)");
  });
  var chosen=preferred||j.defaultProvider||"";
  if(!provs[chosen]||!provs[chosen].available)chosen=j.defaultProvider||"";
  if(!provs[chosen]||!provs[chosen].available)chosen=provs.cloudflare&&provs.cloudflare.available?"cloudflare":provs.huggingface&&provs.huggingface.available?"huggingface":provs.forge&&provs.forge.available?"forge":"";
  psel.value=chosen;
  if(!chosen){var absent=document.createElement('option');absent.value='';absent.dataset.unavailable='1';absent.textContent='Sin proveedores configurados';psel.appendChild(absent);psel.value='';psel.disabled=true;msel.replaceChildren();var unavailable=document.createElement('option');unavailable.value='';unavailable.textContent='No disponible';msel.appendChild(unavailable);msel.disabled=true;if(note)note.textContent='La generación de imágenes no está configurada. Podés subir un retrato o guardar tu personaje sin imagen.';return;}
  var prov=provs[chosen]||{};
  msel.innerHTML="";
  if(chosen==="cloudflare"){
   var automatic=document.createElement('option');automatic.value='auto';automatic.textContent='Según el estilo · ilustración o foto';msel.appendChild(automatic);
   (prov.models||[{title:prov.model,name:prov.model}]).forEach(function(model){var option=document.createElement("option");option.value=model.title;option.textContent=model.name+(model.consumption==="alto"?" · mayor consumo":"");msel.appendChild(option);});msel.disabled=false;
   var cfOptions=Array.from(msel.options).map(function(o){return o.value;});var cfSaved=window.NubbiImageModelForProvider(st.prof,"cloudflare");var cfModel=window.NubbiReconcileImageModel("cloudflare",cfSaved,cfOptions,'auto');if(cfModel)msel.value=cfModel;if(prov.available&&cfModel&&cfSaved!==cfModel){st.prof.imgModelCloudflare=cfModel;save();}
   if(note)note.textContent="Los modelos comparten la cuota de Cloudflare. Lucid y Phoenix consumen más; su disponibilidad depende de la cuenta. No generan imágenes explícitas.";
  }else if(chosen==="huggingface"){
   var oh=document.createElement("option");oh.value=prov.model||"";oh.textContent=prov.model||"HF_IMAGE_MODEL";msel.appendChild(oh);msel.disabled=true;
   if(note)note.textContent=prov.available?"HuggingFace usará el modelo configurado en HF_IMAGE_MODEL.":(prov.error||"HuggingFace no está configurado.");
  }else{
   (prov.models||[]).forEach(function(m){var op=document.createElement("option");op.value=m.title;op.textContent=m.name||m.title;msel.appendChild(op);});msel.disabled=!prov.available;
   var forgeOptions=Array.from(msel.options).map(function(o){return o.value;});var forgeSaved=window.NubbiImageModelForProvider(st.prof,"forge");var forgeModel=window.NubbiReconcileImageModel("forge",forgeSaved,forgeOptions,"");if(forgeModel)msel.value=forgeModel;if(prov.available&&forgeModel&&forgeSaved!==forgeModel){st.prof.imgModelForge=forgeModel;save();}
   if(note)note.textContent=prov.available?"Forge usará el checkpoint elegido. Para Render, Forge tiene que estar expuesto por un túnel.":(prov.error||"Forge no está disponible.");
  }
  if(!msel.value&&msel.options.length)msel.selectedIndex=0;
  updateStyleWarning();
 });
}
if($("iprov"))$("iprov").onchange=function(){st.prof.imgProvider=this.value;save();fillImageEngine(true);};
if($("sdm"))$("sdm").onchange=function(){var provider=$("iprov")?$("iprov").value:"",model=this.value;if((provider==="cloudflare"||provider==="forge")&&!window.NubbiIsValidImageModelForProvider(provider,model)){if(typeof showWzError==="function")showWzError("El modelo elegido no corresponde al proveedor seleccionado.");this.value=window.NubbiImageModelForProvider(st.prof,provider);return;}if(provider==="cloudflare")st.prof.imgModelCloudflare=model;else if(provider==="forge")st.prof.imgModelForge=model;save();updateStyleWarning();};
function waitMs(ms){return new Promise(function(r){setTimeout(r,ms);});}
function charPrompt(idea){var min=window.NUBBI_MIN_AGE||18;return 'Tarea de escritura creativa para una app de ficción interactiva. Creá un personaje ficticio ADULTO ('+min+'+) de chat de roleplay a partir de esta idea. El personaje y cualquier persona involucrada deben tener '+min+' años o más; nunca generes un personaje que no sea adulto ni sexualices a personas no adultas. Si la idea sugiere una persona no adulta, convertíla en adulta o rechazá la idea: "'+idea+'". Devolvé SOLO un JSON con las claves: emoji, name, desc (máx 8 palabras, incluí la edad exacta en el formato "29 años"), role, gender (Masculino, Femenino u Otro), persona (3 a 4 oraciones: personalidad, forma de hablar, motivaciones, cómo trata al usuario), greeting (primer mensaje con una acción entre *asteriscos*), imagePrompt (prompt en inglés para su retrato: indicá la misma edad en el formato "29 years old", adulto, pelo, ojos, ropa, ambiente, luz). Escribí name, desc, role, persona y greeting en ' + langInstr() + '; imagePrompt en inglés. Todos los campos deben ser strings no vacíos.';}
async function genCharJSON(idea){
 return window.NubbiGenerateCharacter(charPrompt(idea),function(prompt,attempt){
  var opts={cache:false,max_tokens:1200};
  if(attempt===0)opts.response_format={type:"json_object"};
  return sample(prompt,opts).then(function(r){return r.text;});
 },{attempts:2,wait:waitMs});
}
$("gen").onclick=async function(){
var idea=$("idea").value.trim();
if(!idea){setGenStatus("Escribí una idea para que la IA cree el personaje.",true);$("idea").focus();return;}
if(!sample){alert("La IA no está disponible en esta vista.");return;}
var b=$("gen");b.innerHTML=icon("sparkles")+'<span>Generando...</span>';b.disabled=true;setGenStatus("La IA está creando el personaje...");
try{
var j=await genCharJSON(idea);
$("e").value=j.emoji||"🙂";$("n").value=j.name||"";$("d").value=j.desc||"";$("r").value=j.role||"";$("p").value=j.persona||"";$("gr").value=j.greeting||"";$("gen2").value=normGender(j.gender);$("imagePrompt").value=j.imagePrompt||"";showPr();
setGenStatus("Borrador listo. Revisá los datos y tocá Guardar personaje.");
$("save").textContent="Guardar personaje";$("save").focus();
}catch(e){var msg=e.message||"Error desconocido";setGenStatus("No se pudo generar: "+msg,true);alert("No pude generarlo: "+msg);}
b.innerHTML=icon("sparkles")+'<span>Generar con IA</span>';b.disabled=false;
};
$("save").onclick=function(){try{showWzError("");var n=$("n").value.trim();if(!n){showWzError("Escribe un nombre para guardar.");return;}
var ageIssue=window.NubbiCharacterAgeIssue({desc:$("d").value,persona:$("p").value,greeting:$("gr").value,imagePrompt:$("imagePrompt").value||""});if(ageIssue){showWzError(ageIssue.message);return;}
var data={emoji:$("e").value||"🙂",img:imgData,name:n,desc:$("d").value.trim(),role:$("r").value.trim(),gender:$("gen2").value,tags:"creado por ti",persona:$("p").value.trim(),greeting:$("gr").value.trim(),imagePrompt:$("imagePrompt").value||"",imageStyle:normalizeImageStyle($("sty").value)};
var cid=editingId,c=null;if(cid)c=st.custom.find(function(x){return x.id===cid});
if(c){for(var k in data)c[k]=data[k];cid=c.id;}
else{var nc={id:"c"+Date.now()+Math.floor(Math.random()*999)};for(var k2 in data)nc[k2]=data[k2];st.custom.unshift(nc);cid=nc.id;}
editingId=null;save();$("dlg").close();["n","d","r","p","gr","idea"].forEach(function(i){if($(i))$(i).value="";});$("pr").style.display="none";if($("genStatus"))$("genStatus").textContent="";$("save").textContent="Guardar";$("dlg").querySelector("h3").textContent="Crear personaje";renderAll();if(cid)openChat(cid);}catch(e){showWzError("No se pudo guardar: "+e.message);}};

function shrink(dataUrl,w,cb){var im=new Image();im.onload=function(){var h=Math.round(im.height*w/im.width),cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(im,0,0,w,h);cb(cv.toDataURL("image/jpeg",.8));};im.src=dataUrl;}
function addFurryPrompt(prompt,style,tags){var furry=/\bfurry\b/i.test(String(style||""))||/\bfurry\b/i.test(String(tags||""));if(!furry||/\banthro(?:pomorphic)?\b/i.test(prompt))return prompt;return prompt+", anthro, anthropomorphic";}
function buildImagePrompt(base,style,tags,composition){var p=String(base||"").trim().replace(/[,\s]+$/,"");p+=composition==="scene"?", adult, high quality, coherent scene composition":", adult, high quality, portrait";var s=String(style||"").toLowerCase(),presets={realista:composition==="scene"?"photorealistic scene, natural skin texture, natural proportions, cinematic lighting":"photorealistic portrait, natural skin texture, soft cinematic lighting, realistic proportions, 85mm lens","semi-realista":"semi-realistic digital illustration, painterly skin, believable anatomy, cinematic lighting",anime:"anime style, masterpiece, best quality",manhwa:"manhwa style, korean webtoon, clean lineart, flat colors, detailed eyes",webtoon:"full color webtoon, expressive character acting, clean outlines",manga:"black and white manga, ink line art, screentone shading",bl:"adult male character illustration, non-explicit male romance aesthetic, tender emotion, fully clothed",furry:"anthro, anthropomorphic, expressive adult face, detailed fur, mature proportions, character illustration","pintura digital":"digital painting, detailed concept art, painterly brushwork, dramatic lighting","3d":"stylized 3d character, soft studio lighting, subsurface scattering, polished character design"};if(s)p+=", "+(presets[s]||s+" style");if(composition==="scene"&&s==="bl")p+=", adult male romance only if the scene establishes it; do not invent a partner";return addFurryPrompt(p,style,tags);}
function currentImageProvider(){var v=$("iprov")?$("iprov").value:"";if(v)return v;return imageProvidersCache&&imageProvidersCache.defaultProvider||"";}
function updateStyleWarning(){var note=$("imageEngineNote");if(!note)return;var prov=currentImageProvider(),model=$("sdm")?$("sdm").value:"",style=$("sty")?$("sty").value:"";if(prov==="cloudflare"){if(/flux-2-klein-4b/.test(model)){note.textContent="FLUX.2 klein 4B es un candidato multiestilo de consumo intermedio. No hay evaluación visual comparativa ni garantía de mayor calidad. Su acceso depende de la cuenta y comparte la cuota diaria.";return;}if(model==="auto"){note.textContent=(style==="realista"?"FLUX.1 schnell · foto rápida y menor consumo.":"Lucid Origin · ilustración detallada y consumo alto.")+" La cuota gratuita es compartida y limitada; podés elegir FLUX para ahorrar. No genera imágenes explícitas.";return;}note.textContent=/lucid|phoenix/.test(model)?"Modelo de mayor calidad y consumo. Comparte la cuota diaria de Cloudflare y no garantiza identidad constante. Su acceso depende de la cuenta.":"FLUX.1 schnell prioriza velocidad. Para anime, manhwa o furry, prueba Lucid Origin o un modelo especializado instalado en Forge.";}else if(prov==="huggingface")note.textContent="El modelo debe estar desplegado en hf-inference; que exista en HuggingFace no significa que tenga API disponible.";else if(prov==="forge")note.textContent="Forge usa los modelos realmente instalados. Animagine XL 4.0 es una opción para anime y webtoon; requiere GPU y licencia compatible.";}
$("genImg").onclick=async function(){var base=$("imagePrompt").value||($("n").value+", "+$("d").value);if(!base.trim()){showWzError("Genera el personaje con IA o completa nombre y descripción primero.");return;}
var ageIssue=window.NubbiCharacterAgeIssue({desc:$("d").value,persona:$("p").value,greeting:$("gr").value,imagePrompt:$("imagePrompt").value||""});if(ageIssue){showWzError(ageIssue.message);return;}
if(!imageAuthReady()){showWzError("Inicia sesión con una cuenta para generar imágenes.");return;}
var prov=$("iprov")?$("iprov").value:"";var model=$("sdm")?$("sdm").value:"";if(prov==="forge"&&!model){showWzError("Forge no tiene modelos disponibles. Revisa que esté corriendo o elige otro proveedor.");return;}
if((prov==="cloudflare"||prov==="forge")&&!window.NubbiIsValidImageModelForProvider(prov,model)){showWzError("El modelo elegido no corresponde al proveedor seleccionado.");return;}
var ticket;try{ticket=characterImageTicket();}catch(error){showWzError(error.message);return;}
var b=$("genImg");b.innerHTML=icon("image")+'<span>Generando imagen...</span>';b.disabled=true;
var style=$("sty").value;
var ec=editingId?byId(editingId):null;
var tags=ec?ec.tags:"";
var prompt=buildImagePrompt(base,style,tags);
try{var j=await api("/api/image",{prompt:prompt,style:style,tags:tags,model:model,provider:prov,adult:adultOn()});
if(!characterImageTicketIsCurrent(ticket))return;shrink("data:"+(j.mime||"image/png")+";base64,"+j.image,360,function(d){if(!characterImageTicketIsCurrent(ticket))return;imgData=d;$("pr").style.display="block";$("pr").textContent="Imagen lista, se guarda con el personaje.";});showWzError("");}
catch(e){if(characterImageTicketIsCurrent(ticket))showWzError("No se pudo generar la imagen: "+e.message);}finally{if(characterImageTicketIsCurrent(ticket))resetCharacterImageButton();}};
$("heroNew").onclick=function(){$("plus").click();};
var surpriseIdeas=["rival de la academia, orgulloso pero leal","detective privado cínico y observador","maga elfa curiosa del mundo humano","mecánico rebelde con buen corazón","streamer gamer energética","médico de urgencias sereno","ladrona de guante blanco traviesa","CEO frío pero protector"];
$("surprise").onclick=async function(){
if(!sample){alert("La IA no está disponible.");return;}
var b=$("surprise");b.innerHTML=icon("sparkles")+'<span>Generando...</span>';b.disabled=true;
var idea=surpriseIdeas[Math.floor(Math.random()*surpriseIdeas.length)];
try{
var j=await genCharJSON(idea);
var c={id:"c"+Date.now(),emoji:j.emoji||"",img:"",name:j.name||"Personaje",desc:j.desc||"",role:j.role||"",gender:normGender(j.gender),tags:"creado por IA",persona:j.persona||"",greeting:j.greeting||"",imagePrompt:j.imagePrompt||"",imageStyle:normalizeImageStyle($("sty").value)};
st.custom.unshift(c);save();renderAll();
if(imageAuthReady()){try{var prov=$("iprov")?$("iprov").value:"";var model=$("sdm")?$("sdm").value:"";if(prov==="forge"&&!model){prov="";model="";}var style=c.imageStyle,tags=c.tags||"";var prompt=buildImagePrompt((j.imagePrompt||c.name),style,tags);var ji=await api("/api/image",{prompt:prompt,style:style,tags:tags,model:model,provider:prov,adult:adultOn()});shrink("data:"+(ji.mime||"image/png")+";base64,"+ji.image,360,function(d){c.img=d;save();renderAll();});}catch(e){/* imagen opcional */}}
alert("Se creó: "+c.name);
}catch(e){alert("No se pudo generar: "+e.message);}
b.innerHTML=icon("sparkles")+'<span>Sorpréndeme</span>';b.disabled=false;
};
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&$("chat").classList.contains("open"))$("back").click();});
if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").catch(function(){});}
var searchTimer=null;
$("q").oninput=function(){clearTimeout(searchTimer);searchTimer=setTimeout(function(){homeLimit=12;renderHome();},250);};
document.querySelectorAll(".tab").forEach(function(t){t.onclick=function(){homeTab=t.dataset.tab;homeLimit=12;document.querySelectorAll(".tab").forEach(function(x){x.classList.toggle("on",x===t);});renderHome();};});
if($("sort"))$("sort").onchange=function(){homeLimit=12;renderHome();};
if($("origin"))$("origin").onchange=function(){homeLimit=12;renderHome();};
function syncChatModels(models){
 var sel=$("pmodel");if(!sel||!Array.isArray(models)||!models.length)return;
 models.forEach(function(model){
  if(typeof model!=="string"||!model)return;
  var exists=Array.prototype.some.call(sel.options,function(o){return o.value===model;});
  if(!exists){var option=document.createElement("option");option.value=model;option.textContent=model;sel.appendChild(option);}
 });
 Array.prototype.forEach.call(sel.options,function(o){if(o.value)o.hidden=models.indexOf(o.value)<0;});
 if(st.prof.model&&models.indexOf(st.prof.model)<0){st.prof.model="";save();}
 sel.value=st.prof.model||"";
}
function refreshAdultProvider(){
var el=$("adultProviderNote");
fetch("/api/health").then(function(r){return r.json();}).then(function(j){
syncChatModels(j.models);
if(!el)return;
if(j.adultConfigured)el.textContent="Proveedor de texto alternativo configurado: "+(j.adultProvider||"")+(j.adultModel?" · "+j.adultModel:"")+".";
else el.textContent="Sin proveedor alternativo: se usa el motor general. Los estilos cambian la escritura, no el proveedor.";
var iel=$("imageStatusNote"),im=j.image||{};
if(iel){
if(im.urlError)iel.textContent="Imágenes: "+im.urlError;
else if(im.configured&&im.provider==="cloudflare")iel.textContent="Imágenes: Cloudflare Workers AI (FLUX.1 schnell) gratis"+(im.model?" · "+im.model:"")+". Plan free: ~100-170 por día; no genera imágenes explícitas.";
else if(im.configured)iel.textContent="Imágenes: Forge "+(im.local?"local":"remoto")+" configurado"+(im.host?" ("+im.host+")":"")+".";
else if(im.provider==="cloudflare")iel.textContent="Imágenes: faltan CF_ACCOUNT_ID y CF_API_TOKEN en el servidor.";
else iel.textContent="Imágenes: falta configurar SD_URL en el servidor.";
}
}).catch(function(){if(el)el.textContent="No se pudo verificar el proveedor de texto.";});
}
var adultGateOk=localStorage.getItem("nubbi-adult-ok")==="1";
if(!adultGateOk){setTimeout(function(){if($("onboard")){if($("onbAdult"))$("onbAdult").checked=false;if($("onbStart"))$("onbStart").disabled=true;$("onboard").showModal();}},300);}
if($("onbAdult"))$("onbAdult").onchange=function(){if($("onbStart"))$("onbStart").disabled=!this.checked;};
if($("onbStart"))$("onbStart").onclick=function(){if($("onbAdult")&&!$("onbAdult").checked)return;localStorage.setItem("nubbi-adult-ok","1");localStorage.setItem("nubbi-onboarded","1");$("onboard").close();};
if($("onboard"))$("onboard").addEventListener("cancel",function(e){if(localStorage.getItem("nubbi-adult-ok")!=="1")e.preventDefault();});
refreshAdultProvider();
window.save=save; window.applyPrefs=applyPrefs; window.renderAll=renderAll;
window.NubbiApp={grad:grad,fmt:fmt,openChat:openChat,openSheet:openSheet,go:go,renderAll:renderAll,save:save,adultOn:adultOn,createDefaultState:createDefaultState,normalizePrefs:window.NubbiNormalizePrefs};
if(window.cloudSync&&window.cloudSync.onAuth){window.cloudSync.onAuth(function(){renderAccount();});}
renderAll();
})();
