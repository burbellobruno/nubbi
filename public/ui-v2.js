/* Nubbi UI v3: fondo de luces, chat, creador en pasos, temas, sonidos */
(function(){
var $=function(i){return document.getElementById(i)};
var icon=function(n){return window.NubbiIcon?window.NubbiIcon(n):"";};
var root=document.documentElement,body=document.body;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){}return null;}

/* 18 tema visual */
root.dataset.skin=ls("nubbi-skin")||"";

/* fondo de luces */
if(!$("bg-lights"))body.insertAdjacentHTML("afterbegin",'<div id="bg-lights" aria-hidden="true"><i></i><i></i><i></i><i></i></div>');

/* 17 splash */
try{if(!sessionStorage.getItem("nb-splash")){sessionStorage.setItem("nb-splash","1");
body.insertAdjacentHTML("beforeend",'<div id="nb-splash"><img src="logo.png" alt=""><b>Nubbi</b></div>');
var sp=$("nb-splash");setTimeout(function(){sp.classList.add("out");setTimeout(function(){sp.remove();},550);},800);}}catch(e){}

/* 19 sonidos */
var ac;function tone(f,d){if(ls("nubbi-sound")!=="on")return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type="sine";o.frequency.value=f;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.02);}catch(e){}}
var form=$("f");if(form)form.addEventListener("submit",function(){tone(660,.12);});

/* selector de tema y sonidos en Perfil */
var pa=$("panim");
if(pa&&!$("pskin")){var blk=document.createElement("div");
blk.innerHTML='<label class="note">Tema visual</label><select id="pskin"><option value="">Noche</option><option value="sunset">Atardecer</option><option value="forest">Bosque</option></select><label class="note">Sonidos</label><select id="psnd"><option value="off">Desactivados</option><option value="on">Activados</option></select>';
pa.insertAdjacentElement("afterend",blk);
$("pskin").value=ls("nubbi-skin")||"";$("psnd").value=ls("nubbi-sound")||"off";
$("pskin").onchange=function(){ls("nubbi-skin",this.value);root.dataset.skin=this.value;};
$("psnd").onchange=function(){ls("nubbi-sound",this.value);if(this.value==="on")tone(880,.15);};}

/* chat: alineación, escribiendo, emociones, ir al final */
var box=$("msgs"),chat=$("chat"),wasTyping=false;
function kind(r){return r.classList.contains("u")?"u":"b";}
function pass(){
 if(!box)return;
 var rows=[].slice.call(box.children).filter(function(n){return n.classList&&n.classList.contains("mr");});
 rows.forEach(function(r,i){var k=kind(r),p=rows[i-1],n=rows[i+1];
  r.classList.toggle("gs",!p||kind(p)!==k);r.classList.toggle("ge",!n||kind(n)!==k);
  var e=r.querySelector(".emo");if(e){var w=e.textContent.trim().split(/\s+/).pop();if(r.dataset.emo!==w)r.dataset.emo=w;}});
 var dots=false;
 [].forEach.call(box.querySelectorAll(".m.b > div"),function(d){
  if(d.querySelector(".nb-dots")){dots=true;return;}
  if(d.textContent.trim()==="..."){d.innerHTML='<span class="nb-dots"><b></b><b></b><b></b></span>';dots=true;}});
 if(wasTyping&&!dots){tone(880,.14);setTimeout(function(){tone(1180,.12);},90);}
 wasTyping=dots;
}
if(box){new MutationObserver(pass).observe(box,{childList:true,subtree:true});pass();
 if(chat&&!$("nb-down")){var db=document.createElement("button");db.id="nb-down";db.type="button";db.innerHTML=icon("arrow-down")||"↓";db.setAttribute("aria-label","Ir al final");db.setAttribute("title","Ir al final");chat.appendChild(db);
  db.onclick=function(){box.scrollTo({top:box.scrollHeight,behavior:"smooth"});};
  box.addEventListener("scroll",function(){db.classList.toggle("on",box.scrollHeight-box.scrollTop-box.clientHeight>260);});}}

/* 5 fondo por personaje */
var hav=$("hav");
function portraitBg(){if(!hav||!chat)return;var im=hav.querySelector("img");
 chat.style.setProperty("--nb-portrait",im&&im.src?'url("'+im.src+'") center / cover no-repeat':(hav.style.background||"none"));}
if(hav){new MutationObserver(portraitBg).observe(hav,{childList:true,attributes:true});portraitBg();}

/* 13 estados vacíos y 16 favorito animado */
var lastFav=null;
document.addEventListener("click",function(e){var f=e.target.closest&&e.target.closest(".fav");if(f){var c=f.closest(".card"),b=c&&c.querySelector("b");lastFav=b?b.textContent:null;}},true);
var views=$("views");
if(views)new MutationObserver(function(){
 [].forEach.call(views.querySelectorAll("#chl .empty:not(.nb-cta),#fg .empty:not(.nb-cta)"),function(el){el.classList.add("nb-cta");
  var b=document.createElement("button");b.type="button";b.className="nb-cta";b.textContent="Explorar personajes";
  b.onclick=function(){var h=document.querySelector('nav [data-v="home"]');if(h)h.click();};el.appendChild(b);});
 if(lastFav){var n=lastFav;lastFav=null;[].forEach.call(views.querySelectorAll(".card"),function(c){var b=c.querySelector("b");if(b&&b.textContent===n){var f=c.querySelector(".fav");if(f)f.classList.add("pop");}});}
}).observe(views,{childList:true,subtree:true});

/* 2 creador en 3 pasos */
var dlg=$("dlg");
if(dlg&&!dlg.querySelector(".wz-nav")){
 var kids=[].slice.call(dlg.children),step=1,autoDone=false;
 var isEditing=function(){var h=dlg.querySelector("h3");return !!(h&&/editar/i.test(h.textContent));};
 var idx=function(t){for(var i=0;i<kids.length;i++)if(kids[i].tagName==="LABEL"&&kids[i].textContent.indexOf(t)>=0)return i;return -1;};
 var iE=idx("Emoji"),iP=idx("Proveedor"),iG=kids.indexOf($("genImg"));
 kids.forEach(function(k,i){if(i<2||k.classList.contains("drow"))return;k.classList.add((i>=iE&&i<=iE+1)||(i>=iP&&i<=iG)?"wz2":"wz1");});
 var steps=document.createElement("div");steps.className="wz-steps";steps.innerHTML="<span></span><span></span><span></span>";dlg.insertBefore(steps,kids[2]);
 var auto=document.createElement("label");auto.className="wz2 wzauto";auto.innerHTML='<input type="checkbox" id="wzAuto" checked> Generar la imagen automáticamente al llegar';
 dlg.insertBefore(auto,$("genImg"));
 var prev=document.createElement("div");prev.className="wz3 wz-prev";
 var nav=document.createElement("div");nav.className="wz-nav";nav.innerHTML='<button type="button" class="g" id="wzBack">Cancelar</button><button type="button" id="wzNext">Siguiente</button>';
 var drow=dlg.querySelector(".drow");dlg.insertBefore(prev,drow);dlg.insertBefore(nav,drow);
 var fill=function(){prev.innerHTML="";var a=document.createElement("div");a.className="av";a.textContent=($("n").value.trim()||"?").charAt(0).toUpperCase();a.style.background="linear-gradient(135deg,var(--ac3),var(--ac2))";prev.appendChild(a);
  var b=document.createElement("b");b.textContent=$("n").value.trim();prev.appendChild(b);
  [[$("r").value,0],[$("d").value,1],[$("gr").value,1]].forEach(function(x){if(x[0].trim()){var p=document.createElement("p");p.textContent=x[0];prev.appendChild(p);}});
  var n=document.createElement("p");n.textContent="La imagen generada o subida se guarda con el personaje.";prev.appendChild(n);};
 var show=function(n){step=n;dlg.dataset.step=n;[].forEach.call(steps.children,function(s,i){s.classList.toggle("on",i<n);});$("wzBack").textContent=n===1?"Cancelar":"Atrás";if(n===3)fill();};
 $("wzBack").onclick=function(){if(step===1)$("cancel").click();else show(step-1);};
 $("wzNext").onclick=function(){
  if(step===1){if(!$("n").value.trim()){$("n").focus();return;}show(2);if(!autoDone&&!isEditing()&&$("wzAuto").checked){autoDone=true;$("genImg").click();}}
  else if(step===2)show(3);};
 new MutationObserver(function(){if(dlg.open){autoDone=false;show(1);}}).observe(dlg,{attributes:true,attributeFilter:["open"]});
 show(1);
}
document.addEventListener("visibilitychange",function(){body.classList.toggle("nb-hidden",document.hidden);});
})();

/* cruz de cierre en todos los diálogos (y los que se creen después) */
(function(){
function wire(d){
 if(d.id==="onboard")return;
 if(d.dataset.nbx)return;d.dataset.nbx="1";
 var b=document.createElement("button");b.type="button";b.className="nb-x";b.innerHTML=(window.NubbiIcon?window.NubbiIcon("close"):"")||"✕";b.setAttribute("aria-label","Cerrar");b.setAttribute("title","Cerrar");
 b.onclick=function(e){e.stopPropagation();d.close();};
 d.insertBefore(b,d.firstChild);
 d.addEventListener("click",function(e){var r=d.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
}
function scan(){[].forEach.call(document.querySelectorAll("dialog"),wire);}
scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
