// Local browser integration with a simulated Firebase SDK. Never contacts Firebase.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.NUBBI_TEST_URL||'http://127.0.0.1:43828';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Only loopback testing is allowed');
const sdk=`(()=>{
 const listeners=[],user=JSON.parse(sessionStorage.getItem('test-auth')||'null');
 const auth={currentUser:null,onAuthStateChanged(cb){listeners.push(cb);setTimeout(()=>{this.currentUser=JSON.parse(sessionStorage.getItem('test-auth')||'null');cb(this.currentUser)},100);return()=>{};},
 emit(u){sessionStorage.setItem('test-auth',JSON.stringify(u));this.currentUser=u;listeners.forEach(cb=>cb(u));},
 async signInWithEmailAndPassword(email){const u={uid:email.split('@')[0],email,isAnonymous:false};this.emit(u);return {user:u}},
 async createUserWithEmailAndPassword(email){return this.signInWithEmailAndPassword(email)},async signOut(){this.emit(null)},async sendPasswordResetEmail(){},
 async signInAnonymously(){const u={uid:'anon',isAnonymous:true};this.emit(u);return {user:u}}
 };
 const db={collection(name){return {doc(uid){return {
 async get(){if(window.testCloudFail)throw Error('Simulated cloud outage');const raw=localStorage.getItem('test-cloud:'+uid);return {exists:!!raw,data:()=>({data:raw})}},
 async set(payload){if(window.testCloudFail)throw Error('Simulated cloud outage');localStorage.setItem('test-cloud:'+uid,payload.data);localStorage.setItem('test-writes',String(Number(localStorage.getItem('test-writes')||0)+1))}
 }},where(){return this},limit(){return this},orderBy(){return this},async get(){return {docs:[],forEach(){}}}}}};
 const authFn=()=>auth;authFn.EmailAuthProvider={credential:()=>({})};
 window.firebase={initializeApp(){},auth:authFn,firestore:()=>db};window.testAuth=auth;
})();`;
const snap=name=>JSON.stringify({custom:[],chats:{p0:[{role:'user',content:name}]},cfg:{p0:{memory:name}},branches:{},favs:['p0'],personas:[],prof:{name,anim:false},cur:null});
new (require('node:vm').Script)(sdk); // Fail early if the simulated SDK is invalid.
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.NUBBI_BROWSER_PATH?{executablePath:process.env.NUBBI_BROWSER_PATH}:{})});
 let passed=0;
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=route.request().url();
   if(new URL(u).pathname==='/firebase-config.js')return route.fulfill({contentType:'application/javascript',body:'window.FIREBASE_CONFIG={apiKey:"local-test-only",projectId:"demo-nubbi-review"};'});
   if(u.includes('firebase-app-compat.js'))return route.fulfill({contentType:'application/javascript',body:sdk});
   if(u.startsWith('https://www.gstatic.com/firebasejs/'))return route.fulfill({contentType:'application/javascript',body:''});
   return new URL(u).origin===new URL(origin).origin?route.continue():route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.addInitScript(({legacy,a,b})=>{
   if(!sessionStorage.getItem('seed')){
    localStorage.setItem('nubbi-v1',legacy);localStorage.setItem('nubbi:state:v2:user:A',a);localStorage.setItem('nubbi:state:v2:user:B',b);
    localStorage.setItem('nubbi-adult-ok','1');sessionStorage.setItem('seed','1');
   }
  },{legacy:snap('LEGACY'),a:snap('ACCOUNT-A'),b:snap('ACCOUNT-B')});
  async function ready(principal){await page.waitForFunction(p=>window.NubbiApp&&document.documentElement.dataset.nbAccountReady==='1'&&NubbiAccountStore.principal===p,principal);await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open);}
  async function profile(){await page.evaluate(()=>NubbiApp.go('prof'));}
  async function login(id){await profile();await page.locator('#accEmail').fill(id+'@test.invalid');await page.locator('#accPass').fill('test-password');await page.locator('#accLogin').click();await ready('user:'+id);}
  async function logout(){await profile();await page.locator('#accLogout').click();await ready('guest');}
  await page.goto(origin);await ready('guest');
  assert.equal(await page.evaluate(()=>Object.keys(st.chats).length),0,'Legacy must not be displayed automatically');passed++;
  await profile();await page.locator('[data-account-import="legacy"]').click();await page.waitForFunction(()=>window.st?.prof.name==='LEGACY');await ready('guest');
  assert.equal(await page.evaluate(()=>localStorage.getItem('nubbi-v1')),snap('LEGACY'));passed++;
  await login('A');assert.equal(await page.evaluate(()=>st.prof.name),'ACCOUNT-A');assert.equal(await page.evaluate(()=>localStorage.getItem('test-writes')),null);passed++;
  await page.reload();await ready('user:A');assert.equal(await page.evaluate(()=>st.chats.p0[0].content),'ACCOUNT-A');passed++;
  await logout();assert.equal(await page.evaluate(()=>st.prof.name),'LEGACY');
  await login('B');assert.equal(await page.evaluate(()=>st.prof.name),'ACCOUNT-B');assert.equal(await page.evaluate(()=>st.cfg.p0.memory),'ACCOUNT-B');passed++;
  // External session transition (e.g. another tab) must replace the document.
  await page.evaluate(()=>testAuth.emit({uid:'A',email:'A@test.invalid',isAnonymous:false}));await ready('user:A');assert.equal(await page.evaluate(()=>st.prof.name),'ACCOUNT-A');passed++;
  await page.evaluate(raw=>{localStorage.setItem('test-cloud:A',raw);window.testCloudFail=true},snap('CLOUD-A'));
  await assert.rejects(page.evaluate(()=>cloudSync.load()),/outage/);assert.equal(await page.evaluate(()=>st.prof.name),'ACCOUNT-A');passed++;
  await assert.rejects(page.evaluate(()=>cloudSync.save()),/outage/);assert.equal(await page.evaluate(()=>localStorage.getItem('test-writes')),null);
  await page.evaluate(()=>{window.testCloudFail=false});await profile();await page.locator('#syncDown').click();await page.waitForFunction(()=>window.st?.prof.name==='CLOUD-A');await ready('user:A');
  assert.ok(await page.evaluate(()=>NubbiAccountStore.listRecoveries().length)>0);assert.equal(await page.evaluate(()=>localStorage.getItem('test-writes')),null);passed++;
  await page.reload();await ready('user:A');assert.equal(await page.evaluate(()=>st.prof.name),'CLOUD-A');
  await profile();await page.locator('#syncUp').click();await page.waitForFunction(()=>localStorage.getItem('test-writes')==='1');passed++;
  await logout();await profile();await page.locator('#accEmail').fill('C@test.invalid');await page.locator('#accPass').fill('test-password');await page.locator('#accRegister').click();await ready('user:C');
  assert.equal(await page.evaluate(()=>Object.keys(st.chats).length),0);assert.equal(await page.evaluate(()=>localStorage.getItem('test-writes')),'1');passed++;
  await page.route('**/api/chat',route=>route.fulfill({contentType:'text/event-stream',body:'data: {"choices":[{"delta":{"content":"Respuesta local de prueba"}}]}\n\ndata: [DONE]\n\n'}));
  await page.evaluate(()=>NubbiApp.go('home'));
  await page.locator('#heroNew').click();await page.locator('#n').fill('Personaje local');await page.locator('#d').fill('29 años');
  await page.locator('#wzAuto').evaluate(e=>e.checked=false);await page.locator('#wzNext').click();await page.locator('#wzNext').click();await page.locator('#save').click();
  await page.locator('#inp').fill('Hola');await page.locator('#f button[type="submit"]').click();
  await page.waitForFunction(()=>Object.values(st.chats).some(messages=>messages.some(m=>m.role==='assistant'&&m.content.includes('Respuesta local'))));
  await page.reload();await ready('user:C');assert.equal(await page.evaluate(()=>st.custom[0].name),'Personaje local');
  assert.ok(await page.evaluate(()=>Object.values(st.chats).some(messages=>messages.some(m=>m.content.includes('Respuesta local')))));passed++;
  await profile();
  const preserved=await page.evaluate(()=>({raw:localStorage.getItem(NubbiAccountStore.key()),live:JSON.stringify(st),legacy:localStorage.getItem('nubbi-v1'),a:localStorage.getItem('nubbi:state:v2:user:A'),b:localStorage.getItem('nubbi:state:v2:user:B')}));
  async function upload(data){await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});}
  for(const content of [{},[]]){
   const rejected=page.waitForEvent('dialog',{predicate:d=>d.type()==='alert'&&d.message().includes('No se importó')});
   await upload({chats:{p0:[{role:'user',content}]}});await rejected;
   assert.equal(await page.evaluate(()=>localStorage.getItem(NubbiAccountStore.key())),preserved.raw);
   await page.evaluate(raw=>localStorage.setItem('test-cloud:C',raw),JSON.stringify({chats:{p0:[{role:'assistant',content}]}}));
   await assert.rejects(page.evaluate(()=>cloudSync.load()),/content/);
   assert.equal(await page.evaluate(()=>JSON.stringify(st)),preserved.live);
   for(const view of ['home','chats','prof'])await page.evaluate(v=>NubbiApp.go(v),view);
  }passed++;
  await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes(':recovery:'))throw Error('Simulated quota');return window.originalStorageSet.call(this,k,v)};});
  const quotaRejected=page.waitForEvent('dialog',{predicate:d=>d.type()==='alert'&&d.message().includes('No se importó')});
  await upload({prof:{name:'Must not replace'}});await quotaRejected;
  assert.equal(await page.evaluate(()=>JSON.stringify(st)),preserved.live);
  assert.equal(await page.evaluate(()=>localStorage.getItem(NubbiAccountStore.key())),preserved.raw);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet});passed++;
  await upload({prof:{name:'Partial restore'},allowedUnknown:{kept:true}});
  await page.waitForFunction(()=>window.st?.prof.name==='Partial restore');await ready('user:C');
  assert.deepEqual(await page.evaluate(()=>({chats:st.chats,custom:st.custom,cfg:st.cfg,favs:st.favs,personas:st.personas,branches:st.branches})),{chats:{},custom:[],cfg:{},favs:[],personas:[],branches:{}});
  assert.equal(await page.evaluate(()=>st.allowedUnknown.kept),true);
  assert.deepEqual(await page.evaluate(()=>({legacy:localStorage.getItem('nubbi-v1'),a:localStorage.getItem('nubbi:state:v2:user:A'),b:localStorage.getItem('nubbi:state:v2:user:B')})),{legacy:preserved.legacy,a:preserved.a,b:preserved.b});
  await profile();await page.getByRole('button',{name:/Restaurar copia de recuperación/}).click();
  await page.waitForFunction(()=>window.st?.custom?.[0]?.name==='Personaje local');await ready('user:C');
  assert.ok(await page.evaluate(()=>Object.values(st.chats).some(messages=>messages.some(m=>m.content.includes('Respuesta local')))));passed++;
  await profile();await upload({prof:{name:'Legacy image'},chats:{p0:[{role:'image',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='}]},personas:[{name:'Persona'}],cfg:{p0:{memory:'Memoria',memoryNotes:[{text:'Recuerdo'}]}},branches:{p0:[{messages:[{role:'user',content:'Rama'}]}]}});
  await page.waitForFunction(()=>window.st?.prof.name==='Legacy image');await ready('user:C');
  for(const view of ['home','chats','prof'])await page.evaluate(v=>NubbiApp.go(v),view);
  await page.evaluate(()=>NubbiOpenChat('p0'));assert.equal(await page.locator('#msgs img').count(),1);
  await page.locator('#back').click();passed++;
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal page overflow');
  assert.deepEqual(errors,[]);console.log('PASS P1 browser '+(mobile?'mobile':'desktop')+': guest, explicit migration, A/B, logout, hydration, external transition, sync failure/recovery, explicit upload, registration');
  await context.close();
 }}finally{await browser.close()}
 console.log('Account browser assertions: '+passed+' groups passed');
})().catch(e=>{console.error(e);process.exitCode=1});
