/* Social sign-in UI. No automatic sign-in, linking, migration or cloud writes. */
(function(){
'use strict';
function start(){
 var guest=document.getElementById('accGuest');if(!guest||document.getElementById('socialAccess'))return;
 var section=document.createElement('section');section.id='socialAccess';section.className='social-access';section.setAttribute('aria-label','Acceso con otra cuenta');
 var title=document.createElement('h4');title.textContent='Continuá con tu cuenta';section.appendChild(title);
 var row=document.createElement('div');row.className='social-access-buttons';
 var status=document.createElement('p');status.id='socialAccessStatus';status.className='note';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 var configured=window.NUBBI_SOCIAL_PROVIDERS||[];
 [['google','Google'],['facebook','Facebook'],['twitter','X / Twitter']].forEach(function(entry){
  var b=document.createElement('button');b.type='button';b.className='g';b.textContent=entry[1];b.dataset.provider=entry[0];
  // Expose configuration honestly; do not advertise a login that hasn't been enabled.
  var enabled=configured.indexOf(entry[0])>=0;b.disabled=!enabled;
  if(!enabled){b.title='Pendiente de habilitación del proveedor';b.setAttribute('aria-describedby',status.id);}
  b.onclick=async function(){
   var cs=window.cloudSync;if(!cs||!cs.signInSocial){status.textContent='El acceso social todavía no está disponible.';return;}
   Array.from(row.children).forEach(function(button){button.disabled=true;});status.textContent='Abrí el acceso de '+entry[1]+' para continuar…';
   try{await cs.signInSocial(entry[0]);location.reload();}
   catch(error){status.textContent=cs.friendly?cs.friendly(error):'No se pudo iniciar sesión.';Array.from(row.children).forEach(function(button){button.disabled=configured.indexOf(button.dataset.provider)<0;});}
  };row.appendChild(b);
 });
 section.appendChild(row);status.textContent=configured.length?'Continuá con Google. Facebook y X todavía no están disponibles. Tus datos de invitado no se importan automáticamente.':'Google, Facebook y X estarán disponibles al completar su habilitación. Mientras tanto, podés usar email y contraseña.';section.appendChild(status);guest.prepend(section);
}
var root=document.documentElement;if(root.dataset.nbAccountReady==='1')start();else{var observer=new MutationObserver(function(){if(root.dataset.nbAccountReady==='1'){observer.disconnect();start();}});observer.observe(root,{attributes:true,attributeFilter:['data-nb-account-ready']});}
})();
