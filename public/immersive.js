/* Presentation helpers only: no account access, persistence or provider requests. */
(function(){
'use strict';
var root=document.documentElement;
function start(){
 if(root.dataset.nbImmersive)return;root.dataset.nbImmersive='1';
 var $=function(id){return document.getElementById(id);};
 var skip=document.createElement('a');skip.className='nb-skip';skip.href='#q';skip.textContent='Saltar a la búsqueda';
 skip.addEventListener('click',function(e){e.preventDefault();if(window.NubbiApp)window.NubbiApp.go('home');$('q').focus();});document.body.prepend(skip);
 var query=$('q'),grid=$('grid');
 if(query&&grid){
  var clear=document.createElement('button');clear.type='button';clear.className='nb-clear-search';clear.setAttribute('aria-label','Limpiar búsqueda');clear.title='Limpiar búsqueda';clear.textContent='×';
  query.parentElement.appendChild(clear);
  clear.addEventListener('click',function(){query.value='';query.dispatchEvent(new Event('input',{bubbles:true}));query.focus();});
  function reflectSearch(){clear.hidden=!query.value;}
  query.addEventListener('input',reflectSearch);reflectSearch();
  var count=document.createElement('p');count.className='nb-catalog-status';count.id='nb-catalog-status';count.setAttribute('role','status');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');grid.before(count);
  grid.setAttribute('aria-describedby',count.id);
  function reflectCatalog(){var total=grid.querySelectorAll('.card').length;count.textContent=total?(total===1?'1 personaje a la vista':total+' personajes a la vista'):'Sin resultados con esta búsqueda y filtros.';reflectSearch();}
  new MutationObserver(reflectCatalog).observe(grid,{childList:true});reflectCatalog();
 }
 var creator=$('dlg');
 if(creator){
  var guide=document.createElement('div');guide.className='nb-creator-guide';guide.id='nb-creator-guide';
  var kicker=document.createElement('b'),copy=document.createElement('span');guide.append(kicker,copy);
  var preview=creator.querySelector('.creator-preview');if(preview)preview.after(guide);else creator.prepend(guide);
  var hints=[['Dale una identidad','Un nombre, una voz y una primera frase. Podés escribir todo a mano o partir de una idea.'],['Imaginá su apariencia','Elegí un estilo y subí un retrato o generá uno. La imagen es opcional; la personalidad ya puede contar una historia.'],['Tu personaje, listo para conocer','Revisá su nombre, su descripción y cómo empieza la conversación. Podés volver a cualquier paso antes de guardar.']];
  function reflectStep(){var step=Math.max(1,Math.min(3,Number(creator.dataset.step)||1));kicker.textContent='Paso '+step+' de 3 · '+hints[step-1][0];copy.textContent=hints[step-1][1];}
  new MutationObserver(reflectStep).observe(creator,{attributes:true,attributeFilter:['data-step']});reflectStep();
  // Existing visual labels become real programmatic labels without changing controls.
  Array.from(creator.querySelectorAll('label')).forEach(function(label){if(label.htmlFor||label.querySelector('input,select,textarea'))return;var next=label.nextElementSibling;if(!next)return;var control=next.matches('input,select,textarea')?next:next.querySelector('input,select,textarea');if(control&&control.id)label.htmlFor=control.id;});
 }
 // Reuse the existing scroll control; respect both animation preferences.
 var down=$('nb-down'),messages=$('msgs');
 if(down&&messages){
  down.setAttribute('aria-label','Volver al último mensaje');down.title='Volver al último mensaje';
  down.onclick=function(){var reduce=root.dataset.anim==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;messages.scrollTo({top:messages.scrollHeight,behavior:reduce?'instant':'smooth'});};
 }
}
if(root.dataset.nbAccountReady==='1')start();else{
 var boot=new MutationObserver(function(){if(root.dataset.nbAccountReady==='1'){boot.disconnect();start();}});
 boot.observe(root,{attributes:true,attributeFilter:['data-nb-account-ready']});
}
})();
