/* Presentation only: existing state, API handlers and safety controls stay in app.js. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
function read(key,fallback){try{return localStorage.getItem(key)||fallback;}catch(e){return fallback;}}
function store(key,value){try{localStorage.setItem(key,value);}catch(e){}}
function button(text,action){var b=document.createElement("button");b.type="button";b.className="g";b.textContent=text;b.onclick=action;return b;}

/* Keep native handlers and IDs when grouping existing tools. */
var chips=document.querySelector("#chat .chips");
if(chips){
 var tools=document.createElement("details");tools.className="chat-tools";
 var summary=document.createElement("summary");summary.textContent="Herramientas ···";
 var panel=document.createElement("div");panel.className="tool-panel";
 var heading=document.createElement("span");heading.className="tool-heading";heading.textContent="DALE FORMA A TU HISTORIA";panel.appendChild(heading);
 ["bScene","bImpro","bRegen","bMemory","bDirector","bRamas","bExport","bVisual","bImage"].forEach(function(id){if($(id))panel.appendChild($(id));});
 tools.appendChild(summary);tools.appendChild(panel);chips.appendChild(tools);
 panel.addEventListener("click",function(e){if(e.target.closest("button"))tools.open=false;});
 document.addEventListener("click",function(e){if(!tools.contains(e.target))tools.open=false;});
 tools.addEventListener("keydown",function(e){if(e.key==="Escape"){tools.open=false;summary.focus();e.stopPropagation();}});
}

/* Multiline composer: Enter sends, Shift+Enter creates a line. */
var input=$("inp");
function resizeInput(){if(!input)return;input.style.height="auto";input.style.height=Math.min(input.scrollHeight,160)+"px";}
if(input){
 input.addEventListener("input",resizeInput);
 input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();$("f").requestSubmit();resizeInput();}});
 $("f").addEventListener("submit",function(){requestAnimationFrame(resizeInput);});
}

/* Keyboard support for the existing clickable navigation and cards. */
function makeKeyboardClickable(element){
 if(element.dataset.nbKeyboard)return;element.dataset.nbKeyboard="1";element.tabIndex=0;element.setAttribute("role","button");
 element.addEventListener("keydown",function(e){if(e.target!==element)return;if(e.key==="Enter"||e.key===" "){e.preventDefault();element.click();}});
}
document.querySelectorAll("nav [data-v],nav #plus").forEach(makeKeyboardClickable);
var navViews=Array.from(document.querySelectorAll('nav [data-v]'));
function reflectCurrentView(){navViews.forEach(function(item){if(item.classList.contains('on'))item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});}
var navSelectionObserver=new MutationObserver(reflectCurrentView);
navViews.forEach(function(item){navSelectionObserver.observe(item,{attributes:true,attributeFilter:['class']});});
reflectCurrentView();
function decorateCards(){document.querySelectorAll(".card").forEach(function(card){makeKeyboardClickable(card);var title=card.querySelector("b");if(title)card.setAttribute("aria-label","Ver personaje: "+title.textContent);});}
var cardsPending=false;
var catalogObserver=new MutationObserver(function(){if(cardsPending)return;cardsPending=true;requestAnimationFrame(function(){cardsPending=false;decorateCards();renderRecent();});});
["grid","forYou","rail","fg","commChars","chl"].forEach(function(id){if($(id))catalogObserver.observe($(id),{childList:true});});
decorateCards();

function characters(){
 var base=(window.NUBBI_RAW||[]).map(function(r,i){return{id:"p"+i,name:r[1],emoji:r[0],desc:r[2]};});
 return base.concat(window.st&&Array.isArray(window.st.custom)?window.st.custom:[]);
}
function renderRecent(){
 var section=$("recentStories"),list=$("recentStoryList"),st=window.st;if(!section||!list||!st)return;
 var all=characters(),entries=Object.keys(st.chats||{}).map(function(id){var h=st.chats[id],c=all.find(function(x){return x.id===id;});return{c:c,h:Array.isArray(h)?h:[]};}).filter(function(x){return x.c&&x.h.some(function(m){return m.role==="user";});}).sort(function(a,b){return (b.h[b.h.length-1].ts||0)-(a.h[a.h.length-1].ts||0);}).slice(0,3);
 list.replaceChildren();section.hidden=!entries.length;
 entries.forEach(function(entry){var c=entry.c,b=button("",function(){if(window.NubbiOpenChat)window.NubbiOpenChat(c.id);});b.className="recent-story";
 var avatar=document.createElement("span");avatar.className="recent-avatar";avatar.textContent=c.emoji||c.name.charAt(0);
 if(c.img&&/^(data:image\/|https?:\/\/|blob:)/i.test(c.img)){var image=document.createElement("img");image.src=c.img;image.alt="";image.onerror=function(){image.replaceWith(avatar);};b.appendChild(image);}else b.appendChild(avatar);
 var copy=document.createElement("span"),name=document.createElement("b"),last=document.createElement("small"),arrow=document.createElement("span");copy.className="recent-copy";name.textContent=c.name;last.textContent=String(entry.h[entry.h.length-1].content||"Continúa la conversación").replace(/\*/g,"");copy.append(name,last);arrow.className="recent-arrow";arrow.textContent="↗";b.append(copy,arrow);list.appendChild(b);
 });
}
if($("recentAll"))$("recentAll").onclick=function(){var chats=document.querySelector('nav [data-v="chats"]');if(chats)chats.click();};
renderRecent();

/* Large, accessible image viewer. Only locally generated image data is accepted. */
var viewer=document.createElement("dialog");viewer.className="nb-image-viewer";viewer.dataset.nbx="1";viewer.setAttribute("aria-label","Imagen de la escena ampliada");
var fullImage=document.createElement("img");fullImage.alt="Imagen de la escena";
viewer.append(button("Cerrar imagen",function(){viewer.close();}),fullImage);document.body.appendChild(viewer);
$("msgs").addEventListener("click",function(e){var image=e.target.closest(".m img");if(!image||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(image.src))return;fullImage.src=image.src;viewer.showModal();});
var imageObserver=new MutationObserver(function(){document.querySelectorAll("#msgs .m img").forEach(function(image){if(image.dataset.zoom)return;image.dataset.zoom="1";image.tabIndex=0;image.setAttribute("role","button");image.setAttribute("aria-label","Ampliar imagen de la escena");image.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();image.click();}});});});
imageObserver.observe($("msgs"),{childList:true,subtree:true});
viewer.addEventListener("close",function(){fullImage.removeAttribute("src");});

/* Portrait ambience: device preferences, independent of story data. */
var appearance=document.createElement("section");appearance.className="appearance-controls";
var appearanceTitle=document.createElement("h4");appearanceTitle.textContent="Ambiente del chat";appearance.appendChild(appearanceTitle);
[["Desenfoque del retrato","nubbi-portrait-blur","--nb-portrait-blur",0,40,26,"px"],["Visibilidad del retrato","nubbi-portrait-opacity","--nb-portrait-opacity",0,65,30,"opacity"],["Luz del retrato","nubbi-portrait-light","--nb-portrait-darkness",15,100,35,"opacity"]].forEach(function(spec){
 var label=document.createElement("label"),range=document.createElement("input");label.textContent=spec[0];range.type="range";range.min=spec[3];range.max=spec[4];range.value=Math.max(spec[3],Math.min(spec[4],Number(read(spec[1],String(spec[5])))));range.setAttribute("aria-label",spec[0]);
 function apply(){var value=Number(range.value);$("chat").style.setProperty(spec[2],spec[6]==="px"?value+"px":String(value/100));}
 range.oninput=function(){apply();store(spec[1],range.value);};apply();label.appendChild(range);appearance.appendChild(label);
});
var sceneDialog=$("cdlg");if(sceneDialog){var sceneActions=sceneDialog.querySelector(".drow");sceneDialog.insertBefore(appearance,sceneActions);}

/* Creator: named steps, shared sticky footer, and an always-live preview. */
var creator=$("dlg"),steps=creator.querySelector(".wz-steps");
if(steps)Array.from(steps.children).forEach(function(step,i){step.textContent=["1 · Identidad","2 · Apariencia","3 · Revisión"][i];});
var preview=document.createElement("div");preview.className="creator-preview";preview.setAttribute("aria-label","Vista previa del personaje");
var avatar=document.createElement("span");avatar.className="preview-avatar";var previewCopy=document.createElement("div");previewCopy.className="preview-copy";var previewName=document.createElement("b"),previewDesc=document.createElement("small");previewCopy.append(previewName,previewDesc);preview.append(avatar,previewCopy);
if(steps)steps.insertAdjacentElement("afterend",preview);
var previewURL="";
function updatePreview(){
 previewName.textContent=$("n").value.trim()||"Tu próximo personaje";previewDesc.textContent=$("d").value.trim()||$("r").value.trim()||"Una nueva historia comienza contigo.";
 if(!previewURL)avatar.textContent=$("e").value.trim()||"☁";
 if(steps)Array.from(steps.children).forEach(function(step,i){if(String(i+1)===creator.dataset.step)step.setAttribute("aria-current","step");else step.removeAttribute("aria-current");});
}
["n","d","r","e"].forEach(function(id){$(id).addEventListener("input",function(){updatePreview();if(id==="n"){$(id).classList.remove("bad");$(id).removeAttribute("aria-invalid");}});});
$("img").addEventListener("change",function(){if(previewURL){URL.revokeObjectURL(previewURL);previewURL="";}var file=this.files[0];if(file&&file.type.indexOf("image/")===0){previewURL=URL.createObjectURL(file);var image=document.createElement("img");image.src=previewURL;image.alt="";avatar.replaceChildren(image);}else updatePreview();});
new MutationObserver(function(records){if(records.some(function(r){return r.attributeName==="open";})&&creator.open){if(previewURL)URL.revokeObjectURL(previewURL);previewURL="";}updatePreview();}).observe(creator,{attributes:true,attributeFilter:["open","data-step"]});
var errorObserver=new MutationObserver(function(){if($("wzErr").textContent&& !$("n").value.trim()){$("n").classList.add("bad");$("n").setAttribute("aria-invalid","true");$("n").setAttribute("aria-describedby","wzErr");}});
if($("wzErr"))errorObserver.observe($("wzErr"),{childList:true});
var footer=creator.querySelector(".drow"),back=$("wzBack");
if(footer&&back){footer.insertBefore(button("Atrás",function(){back.click();}),footer.firstChild);}
updatePreview();
var imageAccess=document.createElement("p");imageAccess.className="note";imageAccess.textContent="Las imágenes requieren una cuenta y están sujetas a un límite diario.";
$("genImg").insertAdjacentElement("afterend",imageAccess);imageAccess.classList.add("wz2");
fetch("/api/image/models").then(function(r){if(!r.ok)throw new Error("Imagen no disponible");return r.json();}).then(function(info){if(Number.isFinite(info.dailyLimit))imageAccess.textContent="Hasta "+info.dailyLimit+" imágenes al día por cuenta. El límite se reinicia a las 00:00 UTC. Los intentos pueden consumir cuota.";}).catch(function(){});

/* UX R2.5: animate only messages created during the active conversation.
   app.js rebuilds all bubbles on open, edit, delete and finished streams. A full
   history rebuild must not replay hundreds of message animations. */
var liveMessages=$("msgs"),pendingAnswer=false;
if(liveMessages){
 var motionEnabled=function(){
  return document.documentElement.dataset.anim!=="off" &&
   !(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 };
 var messageObserver=new MutationObserver(function(records){
  var added=[],rebuilt=false;
  records.forEach(function(record){
   if(record.target!==liveMessages||record.type!=="childList")return;
   Array.prototype.forEach.call(record.removedNodes,function(node){
    if(node.nodeType===1&&node.classList.contains("mr"))rebuilt=true;
   });
   Array.prototype.forEach.call(record.addedNodes,function(node){
    if(node.nodeType===1&&node.classList.contains("mr"))added.push(node);
   });
  });
  if(!added.length)return;
  var hasTyping=false;
  added.forEach(function(row){
   var typing=row.querySelector(".typing");
   if(typing){
    hasTyping=true;
    typing.setAttribute("role","status");
    typing.setAttribute("aria-label","El personaje está escribiendo");
    Array.prototype.forEach.call(typing.children,function(dot){dot.setAttribute("aria-hidden","true");});
   }
  });
  if(!$("chat").classList.contains("open")){
   pendingAnswer=false;return;
  }
  if(rebuilt){
   // A completed streamed reply triggers renderChat() and replaces all rows.
   // Highlight only its new final bubble, not the entire saved history.
   if(pendingAnswer&&motionEnabled()){
    var last=added[added.length-1];
    if(last&&last.classList.contains("b")&&!last.querySelector(".typing")){
     last.classList.add("nb25-message-enter");
    }
   }
   pendingAnswer=false;
   return;
  }
  // An initial history render starts in an empty message area: never animate it.
  var initial=liveMessages.children.length===added.length;
  if(motionEnabled()&&!initial){
   added.forEach(function(row){row.classList.add("nb25-message-enter");});
  }
  if(hasTyping)pendingAnswer=true;
 });
 messageObserver.observe(liveMessages,{childList:true});
 // Leaving a chat cancels any pending animation state from that conversation.
 new MutationObserver(function(){if(!$("chat").classList.contains("open"))pendingAnswer=false;})
  .observe($("chat"),{attributes:true,attributeFilter:["class"]});
}

/* Cloud cuddle welcome. SVG is authored here; no external animation or audio library. */
var introArt='<svg class="intro-art" viewBox="0 0 400 310" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cloudBlue" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff8ff"/><stop offset=".5" stop-color="#dcf4ff"/><stop offset="1" stop-color="#a5c9ff"/></linearGradient><linearGradient id="cloudPink" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff0fc"/><stop offset=".5" stop-color="#e9c5fa"/><stop offset="1" stop-color="#b49cf3"/></linearGradient><radialGradient id="cloudBlush"><stop stop-color="#ff91c5" stop-opacity=".7"/><stop offset="1" stop-color="#ff91c5" stop-opacity="0"/></radialGradient></defs><ellipse cx="202" cy="266" rx="100" ry="12" fill="#b59cfa" opacity=".08"/><g fill="#d8c0ff"><path class="intro-spark" d="m69 112 4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/><path class="intro-spark s2" d="m319 77 5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/><path class="intro-spark" d="m311 221 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g><g class="intro-cloud-blue"><path d="M112 174C79 173 68 143 83 122C91 110 102 107 115 109C115 80 139 62 166 67C188 70 199 84 202 101C225 91 248 107 249 128C277 140 265 174 240 177L154 180L137 200L137 179L116 192L121 175Z" fill="url(#cloudBlue)" stroke="#eff5ff" stroke-width="2.5"/><ellipse cx="128" cy="148" rx="19" ry="13" fill="url(#cloudBlush)"/><ellipse cx="211" cy="140" rx="19" ry="13" fill="url(#cloudBlush)"/><g stroke="#382553" stroke-width="4" fill="none" stroke-linecap="round"><path d="M126 131q7-11 14 0M195 124q7-11 14 0M158 143q7 9 14-1"/></g></g><g class="intro-cloud-pink"><path d="M170 221C143 220 133 197 143 180C150 168 160 165 172 167C172 142 192 130 214 135C230 138 240 150 241 164C265 155 286 167 287 186C313 196 301 222 280 225L238 228L250 247L227 235L224 248L210 229Z" fill="url(#cloudPink)" stroke="#f6deff" stroke-width="2.5"/><ellipse cx="174" cy="201" rx="18" ry="12" fill="url(#cloudBlush)"/><ellipse cx="265" cy="196" rx="18" ry="12" fill="url(#cloudBlush)"/><g stroke="#422a5c" stroke-width="4" fill="none" stroke-linecap="round"><path d="M173 183q7 10 14 0M249 180q7 10 14 0M207 197q7 9 14-1"/></g></g><path class="intro-heart" d="M202 82c-25-14-17-31-6-27 4 1 6 5 6 5s3-5 8-5c16-1 16 16-8 27Z" fill="#f9b5da"/></svg>';
var heroClouds=$('heroClouds');if(heroClouds)heroClouds.innerHTML=introArt.replace(/cloudBlue/g,'heroCloudBlue').replace(/cloudPink/g,'heroCloudPink').replace(/cloudBlush/g,'heroCloudBlush');
var styleList=$('styleDiscoveryList');
if(styleList)[['realista','Realista','Luz natural · detalle','◒'],['semi-realista','Semi-realista','Entre el arte y lo real','◐'],['anime','Anime','Expresión · color','✧'],['manhwa','Manhwa','Tu propio webtoon','▱'],['furry','Furry','Personajes antropomórficos','♧'],['pintura digital','Fantasía','Mundos por descubrir','✦'],['3d','3D','Dimensión · carácter','◇']].forEach(function(style,index){var card=button('',function(){$('plus').click();$('sty').value=style[0];$('sty').dispatchEvent(new Event('change',{bubbles:true}));});card.className='style-tile style-'+index;var mark=document.createElement('span'),name=document.createElement('b'),caption=document.createElement('small');mark.className='style-mark';mark.textContent=style[3];mark.setAttribute('aria-hidden','true');name.textContent=style[1];caption.textContent=style[2];card.append(mark,name,caption);styleList.appendChild(card);});
/* Keep saved welcome preferences while retaining the R2.5 presentation. */
var intro=null,introTimer=0,audioTimer=0,stallTimer=0,previousFocus=null,introStarted=0;
var introAudio=new Audio("nubbi-intro-soft.wav");introAudio.preload="none";introAudio.volume=.55;
function stopIntroAudio(){clearTimeout(audioTimer);try{introAudio.pause();introAudio.currentTime=0;}catch(e){}}
function finishIntro(){
 clearTimeout(introTimer);clearInterval(stallTimer);stopIntroAudio();
 if(intro&&intro.open){var film=intro.querySelector('video');if(film)film.pause();intro.close();}
}
function playIntroAudio(){
 // Legacy explicit choice wins; otherwise audio requires general sound opt-in.
 if(!intro||!intro.open||read("nubbi-intro-audio",read("nubbi-sound","off"))!=="on")return;
 introAudio.currentTime=Math.min(4.2,(performance.now()-introStarted)/1000);
 var playback=introAudio.play();
 if(playback&&playback.catch)playback.catch(function(){});
}
function showIntro(){
 if(intro&&intro.open)return;
 previousFocus=document.activeElement;
 if(intro)intro.remove();
 intro=document.createElement("dialog");intro.id="nb-intro";intro.dataset.nbx="1";
 intro.setAttribute("aria-label","Bienvenida animada a Nubbi. Se abrirá automáticamente.");intro.tabIndex=-1;
 intro.innerHTML='<video class="intro-film" muted playsinline preload="auto" aria-hidden="true"><source src="nubbi-intro.webm" type="video/webm"></video><div class="intro-fallback">'+introArt+'<h1 class="intro-brand">nubbi</h1><p class="intro-subtitle">Cada historia comienza con un encuentro.</p></div>';
 document.body.appendChild(intro);
 var film=intro.querySelector('video'),fallback=false,lastTime=0,stale=0;
 film.muted=true;
 var dialog=intro;
 function showFallback(){
  if(fallback||!dialog.open||intro!==dialog)return;
  fallback=true;dialog.classList.remove('has-film');dialog.classList.add('using-fallback');
  clearInterval(stallTimer);try{film.pause();}catch(e){}
 }
 intro.addEventListener("close",function(){
  clearTimeout(introTimer);clearInterval(stallTimer);stopIntroAudio();film.pause();
  if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
 },{once:true});
 intro.addEventListener('pointerdown',function(){if(introAudio.paused)playIntroAudio();},{once:true});
 film.addEventListener('playing',function(){
  if(fallback||!dialog.open||intro!==dialog)return;
  dialog.classList.add('has-film');
  introStarted=performance.now()-film.currentTime*1000;
  playIntroAudio();
 });
 film.addEventListener('error',showFallback,{once:true});
 film.addEventListener('ended',finishIntro,{once:true});
 intro.showModal();
 introStarted=performance.now();
 var reduced=read('nubbi-intro-motion','system')==='off'||document.documentElement.dataset.anim==='off'||
  (typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 intro.dataset.motion=reduced?'off':'on';
 if(reduced){showFallback();introTimer=setTimeout(finishIntro,650);return;}
 // The SVG cuddle animates immediately behind the video, including during autoplay stalls.
 // The film must stay rendered (opacity 0) so browsers can start decoding it.
 try{var play=film.play();if(play&&play.catch)play.catch(showFallback);}catch(e){showFallback();}
 stallTimer=setInterval(function(){
  if(!dialog.open||fallback||intro!==dialog){clearInterval(stallTimer);return;}
  var now=film.currentTime;
  if(now<=lastTime+.03||film.paused||film.readyState<2)stale++;
  else stale=0;
  lastTime=now;
  if(stale>=3)showFallback();
 },350);
 // Do not freeze the dialog if neither media nor the fallback can play.
 introTimer=setTimeout(finishIntro,4700);
}
// Keep controls in an accessible, unobtrusive profile panel.
var settings=document.createElement('details');settings.className='intro-settings';
var settingsSummary=document.createElement('summary');settingsSummary.textContent='Bienvenida y accesibilidad';
settings.appendChild(settingsSummary);
settings.appendChild(button('Volver a ver la intro',showIntro));
var soundLabel=document.createElement('label'),soundToggle=document.createElement('input');
soundToggle.type='checkbox';soundToggle.id='welcomeSound';
soundToggle.checked=read('nubbi-intro-audio',read('nubbi-sound','off'))==='on';
soundToggle.onchange=function(){store('nubbi-intro-audio',soundToggle.checked?'on':'off');if(!soundToggle.checked)stopIntroAudio();};
soundLabel.append(soundToggle,document.createTextNode(' Sonido de bienvenida'));settings.appendChild(soundLabel);
var motionLabel=document.createElement('label'),motionSelect=document.createElement('select');
motionSelect.id='welcomeMotion';motionLabel.textContent='Movimiento de la bienvenida';
[['system','Respetar el sistema'],['on','Mostrar animación'],['off','Sin animación']].forEach(function(item){var option=document.createElement('option');option.value=item[0];option.textContent=item[1];motionSelect.appendChild(option);});
motionSelect.value=read('nubbi-intro-motion','system');
motionSelect.onchange=function(){store('nubbi-intro-motion',motionSelect.value);};
motionLabel.appendChild(motionSelect);settings.appendChild(motionLabel);
var profile=document.querySelector('#v-prof .prof');if(profile)profile.appendChild(settings);
// Automatic transition remains available on each entry without a required click.
var pendingIntro=document.hidden;
if(!pendingIntro)showIntro();
window.addEventListener('pageshow',function(event){
 // Browser back/forward cache restores JS without rerunning it.
 if(event.persisted){if(document.hidden)pendingIntro=true;else showIntro();}
});
document.addEventListener('visibilitychange',function(){
 if(document.hidden&&intro&&intro.open){pendingIntro=true;finishIntro();}
 else if(!document.hidden&&pendingIntro){pendingIntro=false;showIntro();}
});
})();
