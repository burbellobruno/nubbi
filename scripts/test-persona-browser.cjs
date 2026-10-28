// Disposable loopback browser. Mock Firebase only; no real users, credentials or providers.
// Upload fixture represents an already-downloaded AI/local portrait, not AI generation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const url=new URL(process.env.NUBBI_TEST_URL||'http://127.0.0.1:43991/');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!['http:','https:'].includes(url.protocol))throw Error('Loopback server required');
const output=process.env.NUBBI_REVIEW_OUTPUT||path.join(__dirname,'../review/personas');fs.mkdirSync(output,{recursive:true});
const sdk=`(()=>{
 const listeners=[];const auth={currentUser:null,onAuthStateChanged(cb){listeners.push(cb);setTimeout(()=>{this.currentUser=JSON.parse(sessionStorage.getItem('persona-test-auth')||'null');cb(this.currentUser)},30);return()=>{}},emit(u){sessionStorage.setItem('persona-test-auth',JSON.stringify(u));this.currentUser=u;listeners.forEach(cb=>cb(u))},async signInWithEmailAndPassword(email){const u={uid:email.split('@')[0],email,isAnonymous:false};this.emit(u);return{user:u}},async signOut(){this.emit(null)},async sendPasswordResetEmail(){},async signInAnonymously(){throw Error('Unexpected anonymous authentication')}};
 const db={collection(){return{doc(){return{async get(){return{exists:false}},async set(){throw Error('Unexpected cloud write')}}},where(){return this},limit(){return this},orderBy(){return this},async get(){return{docs:[],forEach(){}}}}}};
 const authFn=()=>auth;authFn.EmailAuthProvider={credential:()=>({})};window.firebase={initializeApp(){},auth:authFn,firestore:()=>db};
})();`;
const snapshot=name=>({custom:[],chats:{},cfg:{},branches:{},favs:[],persona:'seed-'+name,personas:[{id:'seed-'+name,name:'Persona '+name,bio:'Solo '+name,img:'',legacyPersonaField:{kept:name}}],prof:{name,anim:false},cur:null});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.NUBBI_BROWSER_PATH});try{
 for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
  let blockedWrites=0;
  await context.route('**/*',route=>{
   const req=route.request(),target=new URL(req.url());
   if(target.pathname==='/firebase-config.js')return route.fulfill({contentType:'application/javascript',body:'window.FIREBASE_CONFIG={apiKey:"synthetic-persona-test",projectId:"demo-personas"};'});
   if(target.hostname==='www.gstatic.com'&&target.pathname.endsWith('/firebase-app-compat.js'))return route.fulfill({contentType:'application/javascript',body:sdk});
   if(target.hostname==='www.gstatic.com')return route.fulfill({contentType:'application/javascript',body:''});
   if(target.origin!==url.origin)return route.abort();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){blockedWrites++;return route.abort();}
   return route.continue();
  });
  await context.addInitScript(({a,b})=>{localStorage.setItem('nubbi-adult-ok','1');if(!sessionStorage.getItem('persona-test-seed')){localStorage.setItem('nubbi:state:v2:user:A',JSON.stringify(a));localStorage.setItem('nubbi:state:v2:user:B',JSON.stringify(b));sessionStorage.setItem('persona-test-seed','1');}},{a:snapshot('A'),b:snapshot('B')});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const ready=async principal=>{await page.waitForFunction(p=>window.NubbiApp&&document.documentElement.dataset.nbAccountReady==='1'&&NubbiAccountStore.principal===p,principal);await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});};
  const profile=async()=>{await page.evaluate(()=>NubbiApp.go('prof'));await page.locator('#openPersonas').click();await page.waitForSelector('#personasdlg[open]');};
  const accountSettings=async()=>{if(await page.locator('#personasdlg').getAttribute('open')!==null)await page.locator('#closePersonas').click();await page.locator('#openSettings').click();await page.waitForSelector('#v-settings.on');};
  const overflow=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document overflow '+width);if(await page.locator('#pdlg').getAttribute('open')!==null)assert.ok(await page.locator('#pdlg').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'persona dialog overflow '+width);};
  await page.goto(url.href);await ready('guest');await profile();
  const portrait=async color=>Buffer.from(await page.evaluate(color=>{const c=document.createElement('canvas');c.width=80;c.height=100;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,80,100);x.fillStyle='#fff';x.fillRect(15,20,35,45);return c.toDataURL('image/png').split(',')[1]},color),'base64');
  const blue=await portrait('#3159ba'),pink=await portrait('#ac477c');
  const upload=async(buffer,name='retrato-ia-descargado.png')=>{await page.locator('#pimage').setInputFiles({name,mimeType:'image/png',buffer});await page.waitForFunction(()=>{const img=document.querySelector('#pimagePreview');return img&&!img.hidden&&img.complete&&img.naturalWidth>0&&img.getAttribute('src')?.startsWith('data:image/')});};
  const edit=async name=>{await page.getByRole('button',{name:'Editar persona '+name,exact:true}).click();await page.waitForSelector('#pdlg[open]');};
  const stored=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nubbi:state:v2:guest')));
  await page.locator('#newPersona').click();await page.waitForSelector('#pdlg[open]');
  await page.locator('#pname').fill('Luna');await page.locator('#pbio').fill('Cartógrafa adulta que busca mapas olvidados.');await page.locator('#page').fill('29');
  await upload(blue);await overflow();await page.screenshot({animations:'disabled',path:path.join(output,'persona-create-'+width+'.png')});
  await page.locator('#psave').click();await page.waitForFunction(()=>st.personas.length===1&&!!st.personas[0].img);
  const id=await page.evaluate(()=>st.personas[0].id),first=await stored();assert.equal(first.persona,id);assert.ok(first.personas[0].img.startsWith('data:image/jpeg;base64,'));
  await page.evaluate(()=>{st.personas[0].legacyPersonaField={kept:true};NubbiApp.save();});
  const beforeFailure=await stored();await edit('Luna');await page.locator('#pname').fill('No guardar con quota');
  await page.evaluate(()=>{window.personaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='nubbi:state:v2:guest')throw new DOMException('Synthetic quota','QuotaExceededError');return window.personaOriginalSetItem.call(this,k,v);};});
  await page.locator('#psave').click();await page.waitForFunction(()=>document.querySelector('#pimageStatus').textContent.includes('No se pudo guardar'));
  assert.deepEqual(await stored(),beforeFailure);assert.equal(await page.evaluate(()=>st.personas[0].name),'Luna');assert.ok(await page.locator('#pdlg').getAttribute('open')!==null);
  await page.evaluate(()=>{Storage.prototype.setItem=window.personaOriginalSetItem;delete window.personaOriginalSetItem;});await page.locator('#pcancel').click();
  // A late decode from a cancelled editor must never become another persona's draft.
  await edit('Luna');await page.evaluate(()=>{window.personaOriginalArrayBuffer=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=function(){const blob=this;return new Promise(resolve=>setTimeout(()=>resolve(window.personaOriginalArrayBuffer.call(blob)),250));};});
  await page.locator('#pimage').setInputFiles({name:'late-portrait.png',mimeType:'image/png',buffer:pink});await page.locator('#pcancel').click();await page.locator('#newPersona').click();
  await page.waitForTimeout(400);assert.ok(await page.locator('#pimagePreview').isHidden());assert.equal(await page.locator('#pname').inputValue(),'');
  await page.evaluate(()=>{Blob.prototype.arrayBuffer=window.personaOriginalArrayBuffer;delete window.personaOriginalArrayBuffer;});await page.locator('#pcancel').click();assert.deepEqual(await stored(),beforeFailure);
  const beforeCancel=await stored();await edit('Luna');await page.locator('#pname').fill('No guardar');await page.locator('#premoveimage').click();await page.locator('#pcancel').click();assert.deepEqual(await stored(),beforeCancel,'cancel must preserve saved image and fields');
  await edit('Luna');assert.ok(await page.locator('#pimagePreview').evaluate(img=>img.getAttribute('src')?.startsWith('data:image/')));
  await upload(pink,'retrato-local.png');await page.locator('#pname').fill('Luna editada');await page.locator('#psave').click();await page.waitForFunction(()=>st.personas[0].name==='Luna editada');
  const edited=await stored();assert.equal(edited.personas.length,1);assert.equal(edited.personas[0].id,id);assert.deepEqual(edited.personas[0].legacyPersonaField,{kept:true});assert.notEqual(edited.personas[0].img,first.personas[0].img);
  await edit('Luna editada');await page.locator('#premoveimage').click();await page.locator('#psave').click();assert.equal((await stored()).personas[0].img||'','');
  await edit('Luna editada');await upload(blue);await page.locator('#psave').click();
  await page.locator('#newPersona').click();await page.locator('#pname').fill('Otra persona');await page.locator('#page').fill('30');await page.locator('#psave').click();
  const otherId=await page.evaluate(()=>st.persona);assert.notEqual(otherId,id);await edit('Luna editada');await page.locator('#pbio').fill('Descripción revisada');await page.locator('#psave').click();assert.equal(await page.evaluate(()=>st.persona),otherId,'editing must not change active selection');
  await page.getByRole('button',{name:'Usar persona Luna editada',exact:true}).click();assert.equal(await page.evaluate(()=>st.persona),id);
  await page.reload();await ready('guest');await profile();assert.equal(await page.evaluate(()=>st.persona),id);assert.ok(await page.locator('#plist .persona-avatar img').count());await overflow();await page.screenshot({animations:'disabled',path:path.join(output,'persona-profile-'+width+'.png')});
  const guestFinal=await stored();
  async function login(uid){await accountSettings();await page.locator('#accEmail').fill(uid+'@synthetic.invalid');await page.locator('#accPass').fill('synthetic-password');await page.locator('#accLogin').click();await ready('user:'+uid);await profile();}
  await login('A');assert.equal(await page.evaluate(()=>st.personas[0].name),'Persona A');await edit('Persona A');await upload(pink);await page.locator('#psave').click();assert.ok(await page.evaluate(()=>st.personas[0].img));
  await accountSettings();await page.locator('#accLogout').click();await ready('guest');await profile();assert.deepEqual(await stored(),guestFinal,'account A must not change guest persona data');
  await login('B');assert.equal(await page.evaluate(()=>st.personas[0].name),'Persona B');assert.equal(await page.evaluate(()=>st.personas[0].img),'');
  await accountSettings();await page.locator('#accLogout').click();await ready('guest');assert.deepEqual(await stored(),guestFinal);assert.equal(blockedWrites,0,'no provider calls or cloud writes expected');assert.deepEqual(errors,[]);
  await context.close();console.log('PASS personas '+width+': image upload/preview/remove/edit/cancel/reload, quota rollback/late decode, selection/legacy fields, A/B/guest isolation, no overflow/errors');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
