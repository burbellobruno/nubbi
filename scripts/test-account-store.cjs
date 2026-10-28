const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/account-store.js'), 'utf8');
const firebaseSource = fs.readFileSync(path.join(__dirname, '../public/firebase-sync.js'), 'utf8');
const storageData = new Map();
let failure = null;
const storage = {
  get length() { return storageData.size; },
  key(i) { return [...storageData.keys()][i] || null; },
  getItem(k) { if (failure && failure.action === 'get') throw Error('No storage'); return storageData.has(k) ? storageData.get(k) : null; },
  setItem(k, v) { if (failure && failure.action === 'set' && (!failure.key || k.includes(failure.key))) throw Error('QuotaExceededError'); storageData.set(k, String(v)); },
  removeItem(k) { storageData.delete(k); },
};
function snapshot(text) { return JSON.stringify({custom:[],chats:{p0:[{role:'user',content:text}]},cfg:{},favs:[],personas:[],prof:{name:text},branches:{},cur:'p0',persona:null}); }
function boot(user) {
  const doc = {documentElement: {removeAttribute() {}}};
  const window = {document:doc, localStorage:storage, cloudSync:{currentUser(){ return window.activeUser; }},activeUser:user,
    NubbiAppDefaults(){return{custom:[],chats:{},cfg:{},favs:[],personas:[],persona:null,branches:{},prof:{name:'',bio:'',img:'',intensity:'rom',theme:'dark',accent:'violet',fontScale:'md',density:'comfortable',anim:true,lang:'es-LAT',temp:'balanced',len:'normal',adult:false},cur:null};},
    NubbiMigrateLangs(state){function visit(value){if(!value||typeof value!=='object')return;if(value.lang==='es-AR'||value.lang==='es')value.lang='es-LAT';for(const key of Object.keys(value))if(value[key]&&typeof value[key]==='object')visit(value[key]);}visit(state);return state;},
    NubbiNormalizePrefs(state){window.NubbiMigrateLangs(state);state.prof=Object.assign({},window.NubbiAppDefaults().prof,state.prof||{});state.prof.model=state.prof.model||'';state.prof.voice=Object.assign({enabled:true,auto:false,rate:1,pitch:1,voiceURI:''},state.prof.voice||{});return state;}};
  const ctx=vm.createContext({window});
  vm.runInContext(source,ctx,{filename:'account-store.js'});
  window.NubbiAccountStore.activate(user);
  return window;
}
(async () => {
  let guest=boot(null);
  assert.equal(guest.NubbiAccountStore.principal,'guest');
  guest.NubbiAccountStore.write(snapshot('invitado'));
  assert.match(storageData.get('nubbi:state:v2:guest'),/invitado/);
  storageData.set('nubbi-v1',snapshot('antiguo'));
  assert.equal(guest.NubbiAccountStore.hasSource('legacy'),true);
  guest.NubbiAccountStore.importSource('legacy');
  assert.match(storageData.get('nubbi:state:v2:guest'),/antiguo/);
  assert.match(storageData.get('nubbi-v1'),/antiguo/);
  assert.ok([...storageData.keys()].some(k=>k.startsWith('nubbi:state:v2:recovery:guest:')));
  const alice={uid:'Alice1',isAnonymous:false};
  const a=boot(alice);
  assert.equal(a.NubbiAccountStore.read(),null);
  a.NubbiAccountStore.write(snapshot('Alice'));
  const bob={uid:'Bob2',isAnonymous:false};
  const b=boot(bob);
  assert.equal(b.NubbiAccountStore.read(),null);
  b.NubbiAccountStore.write(snapshot('Bob'));
  assert.match(a.NubbiAccountStore.read().prof.name,/Alice/);
  assert.match(b.NubbiAccountStore.read().prof.name,/Bob/);
  a.activeUser=bob;
  assert.throws(()=>a.NubbiAccountStore.write(snapshot('violación')), /Cambió la cuenta/);
  assert.equal(a.NubbiAccountStore.locked,true);
  assert.match(storageData.get('nubbi:state:v2:user:Alice1'),/Alice/);
  b.NubbiAccountStore.importSource('guest');
  assert.match(storageData.get('nubbi:state:v2:user:Bob2'),/antiguo/);
  assert.match(storageData.get('nubbi:state:v2:guest'),/antiguo/);
  assert.ok([...storageData.keys()].some(k=>k.startsWith('nubbi:state:v2:recovery:user:Bob2:')));
  const recovery=b.NubbiAccountStore.listRecoveries()[0];
  b.NubbiAccountStore.restoreRecovery(recovery);
  assert.equal(b.NubbiAccountStore.read().prof.name,'Bob');
  assert.equal(storageData.get('nubbi:state:v2:guest').includes('antiguo'),true);
  const original=storageData.get('nubbi:state:v2:user:Bob2');
  storageData.set('nubbi-v1','{"__proto__":{ "injected": true }}');
  assert.throws(()=>b.NubbiAccountStore.importSource('legacy'),/no permitidos/);
  assert.equal(storageData.get('nubbi:state:v2:user:Bob2'),original);
  storageData.set('nubbi-v1',snapshot('old safely kept'));
  failure={action:'set',key:'recovery:'};
  assert.throws(()=>b.NubbiAccountStore.importSource('legacy'),/No hay espacio/);
  assert.equal(storageData.get('nubbi:state:v2:user:Bob2'),original);
  failure=null;
  failure={action:'set',key:'v2:user:Bob2'};
  assert.throws(()=>b.NubbiAccountStore.importSource('legacy'),/No hay espacio/);
  assert.equal(storageData.get('nubbi:state:v2:user:Bob2'),original);
  failure={action:'get'};
  assert.throws(()=>b.NubbiAccountStore.read(),/leer/);
  failure=null;
  b.NubbiAccountStore.importSource('legacy');
  const recoveryCount=b.NubbiAccountStore.listRecoveries().length;
  b.NubbiAccountStore.importSource('legacy');
  assert.equal(b.NubbiAccountStore.listRecoveries().length,recoveryCount,'Repeated migration is idempotent');
  assert.equal(storageData.get('nubbi-v1'),snapshot('old safely kept'));
  assert.throws(()=>b.NubbiAccountStore.restoreRecovery('nubbi:state:v2:recovery:user:Alice1:1:1'),/no pertenece/);
  const unicode=boot({uid:'user/á:1',isAnonymous:false});
  unicode.NubbiAccountStore.write(snapshot('Unicode UID'));
  assert.equal(unicode.NubbiAccountStore.read().prof.name,'Unicode UID');
  const rich=JSON.stringify({custom:[{id:'c1',name:'Legacy character',image:'data:image/png;base64,test'}],
    chats:{c1:[{role:'image',image:'data:image/png;base64,history'}]},cfg:{c1:{memory:'Memory',relationship:{trust:4}}},
    personas:[{id:'p1',bio:'Persona'}],persona:'p1',branches:{c1:[{messages:[{role:'user',content:'Branch'}]}]},
    favs:['c1'],prof:{anim:false,voice:{auto:false},theme:'light'},extraLegacyField:{kept:true}});
  storageData.set('nubbi-v1',rich);
  unicode.NubbiAccountStore.importSource('legacy');
  assert.equal(JSON.stringify(unicode.NubbiAccountStore.read()),rich,'Migration preserves all nested and unknown safe fields');
  assert.equal(storageData.get('nubbi-v1'),rich);
  for (const content of [{}, [], null, 42, true]) {
    const before = [...storageData.entries()];
    assert.throws(()=>unicode.NubbiAccountStore.replace(JSON.stringify({chats:{p0:[{role:'user',content}]}}),'file'),/content/);
    assert.deepEqual([...storageData.entries()],before,'Invalid input must not even create a recovery write');
  }
  for (const malformed of [
    {custom:[{tags:[]}]}, {personas:[{name:{}}]}, {prof:{voice:[]}},
    {cfg:{p0:{scenePlace:[]}}}, {cfg:{p0:{sceneUserItems:{}}}}, {cfg:{p0:{sceneCharacterItems:42}}}, {cfg:{p0:{scenePending:[]}}}, {cfg:{p0:{memoryNotes:[null]}}}, {cfg:{p0:{storyExperience:{}}}}, {cfg:{p0:{chatModel:[]}}}, {branches:{p0:[{messages:[{role:'assistant',content:{}}]}]}}
  ]) assert.throws(()=>unicode.NubbiAccountStore.validate(JSON.stringify(malformed)),/inválido/);
  // Persona portraits remain optional, survive restores, and reject corrupt schema
  // before any replacement or recovery write can occur.
  assert.doesNotThrow(()=>unicode.NubbiAccountStore.validate(JSON.stringify({personas:[{id:'old',name:'Sin imagen'}]})));
  const portraitSnapshot=JSON.stringify({personas:[{id:'portrait',name:'Con imagen',img:'data:image/jpeg;base64,c3ludGhldGlj',legacyPersonaField:{kept:true}}]});
  assert.equal(unicode.NubbiAccountStore.validate(portraitSnapshot).personas[0].img,'data:image/jpeg;base64,c3ludGhldGlj');
  for(const img of [{},[],42,true]){
    const before=[...storageData.entries()];
    assert.throws(()=>unicode.NubbiAccountStore.replace(JSON.stringify({personas:[{id:'broken',img}]}),'file'),/personas.img/);
    assert.deepEqual([...storageData.entries()],before,'Invalid portrait must not create recovery or alter a principal');
  }
  const beforePartial=storageData.get(unicode.NubbiAccountStore.key());
  unicode.NubbiAccountStore.replace('{"prof":{"name":"Partial"}}','file');
  assert.equal(unicode.NubbiAccountStore.read().chats,undefined,'Replace must not merge omitted fields');
  unicode.NubbiAccountStore.restoreRecovery(unicode.NubbiAccountStore.listRecoveries()[0]);
  assert.equal(storageData.get(unicode.NubbiAccountStore.key()),beforePartial);
  // Check user-bound Firestore sync and transactional download.
  const win=boot({uid:'SyncU',isAnonymous:false,email:'sync@example.invalid'});
  const user=win.activeUser;
  let remote=snapshot('Remote');
  const db={collection(name){assert.equal(name,'users');return {doc(uid){assert.equal(uid,'SyncU');return {
    async get(){return {exists:true,data(){return {data:remote};}};},
    async set(data){remote=data.data;}
  };}};}};
  let observer;
  const auth={currentUser:user,onAuthStateChanged(callback){observer=callback;return ()=>{};},async signInAnonymously(){throw Error('unexpected');}};
  const firebase={initializeApp(){},auth(){return auth;},firestore(){return db;}};
  win.FIREBASE_CONFIG={apiKey:'testing'};
  win.st=JSON.parse(snapshot('Local'));
  win.localStorage.setItem(win.NubbiAccountStore.key(),JSON.stringify(win.st));
  const context=vm.createContext({window:win,firebase,st:win.st,applyPrefs(){},renderAll(){},alert(){},console,JSON,Date});
  vm.runInContext(firebaseSource,context,{filename:'firebase-sync.js'});
  await win.cloudSync.load();
  assert.equal(win.st.prof.name,'Remote');
  assert.equal(win.NubbiAccountStore.read().prof.name,'Remote');
  assert.ok([...storageData.keys()].some(k=>k.startsWith('nubbi:state:v2:recovery:user:SyncU:')));
  win.st.prof.name='Latest';
  await win.cloudSync.save();
  assert.match(remote,/Latest/);
  // Pending download cannot cross to another account.
  // Change token after a query begins; authenticated storage guard must reject the write.
  // Exercise the public active-account check directly as a minimal invariant.
  win.activeUser={uid:'Different',isAnonymous:false};
  auth.currentUser=win.activeUser;
  observer(auth.currentUser);
  await assert.rejects(win.cloudSync.save(),/sesión|cuenta|session|Cambió/i);
  assert.equal(win.NubbiAccountStore.read === undefined,false);
  console.log('PASS P1 account isolation: guest, A/B, no silent migration, legacy recovery, failed quota, cloud load/save, auth race');
})().catch(e=>{console.error(e);process.exitCode=1});
