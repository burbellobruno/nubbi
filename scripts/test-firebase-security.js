/* Local Firebase security regressions. Firebase calls are mocked; no credentials/network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const syncSource = fs.readFileSync(path.join(__dirname, '../public/firebase-sync.js'), 'utf8');
const storeSource = fs.readFileSync(path.join(__dirname, '../public/account-store.js'), 'utf8');
const rules = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8');
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture(options = {}) {
  const listeners = [];
  const auth = {
    currentUser: options.guest ? null : { uid: 'account-a', email: 'a@example.test', isAnonymous: false },
    onAuthStateChanged(cb) { listeners.push(cb); return () => {}; },
    emit(user) { this.currentUser = user; for(const cb of listeners) cb(user); },
    async signInAnonymously() {
      assert.equal(options.guest, true, 'Unexpected anonymous sign-in');
      const user = { uid: 'guest-a', isAnonymous: true }; this.emit(user); return { user };
    },
    async signOut() { this.emit(null); },
  };
  let get = async () => ({ exists: true, data: () => ({ data: JSON.stringify({ custom: [], chats: {}, cfg: {}, prof: {} }) }) });
  const reads = [], writes = [], alerts = [];
  const db = { collection(name) { assert.equal(name, 'users'); return { doc(uid) { return {
    async get() { reads.push(uid); return get(); },
    async set(data) { writes.push({ uid, data }); },
  }; } }; } };
  const ctx = { FIREBASE_CONFIG: { apiKey: 'test-only', projectId: 'test-only' },
    firebase: { initializeApp() {}, auth: () => auth, firestore: () => db },
    st: { custom: [{ id: 'local-a' }], chats: { p0: [{role:'user',content:'local conversation'}] }, cfg: {p0:{memory:'local memory'}}, favs:['p0'], personas:[{id:'local-persona'}], persona:'local-persona', branches:{p0:[{name:'local branch',messages:[{role:'user',content:'local'}]}]}, prof: { name:'Local profile' } },
    alert: msg => alerts.push(msg), localSaves: 0, renders: 0,
    globalSaveCalls: 0, appSaveCalls: 0, prefsCalls: 0,
    save() { ctx.globalSaveCalls++; }, applyPrefs() { ctx.prefsCalls++; }, renderAll() { ctx.renders++; }, console, Date,
    NubbiAppDefaults(){return{custom:[],chats:{},cfg:{},favs:[],personas:[],persona:null,branches:{},prof:{name:'',bio:'',img:'',intensity:'rom',theme:'dark',accent:'violet',fontScale:'md',density:'comfortable',anim:true,lang:'es-LAT',temp:'balanced',len:'normal',adult:false},cur:null};},
    NubbiMigrateLangs(state){function visit(value){if(!value||typeof value!=='object')return;if(value.lang==='es-AR'||value.lang==='es')value.lang='es-LAT';for(const key of Object.keys(value))if(value[key]&&typeof value[key]==='object')visit(value[key]);}visit(state);return state;},
    NubbiNormalizePrefs(state){ctx.NubbiMigrateLangs(state);const defaults=ctx.NubbiAppDefaults().prof;state.prof=Object.assign({},defaults,state.prof||{});if(['forge','cloudflare','huggingface'].indexOf(state.prof.imgProvider)<0&&state.prof.imgProvider!=='')state.prof.imgProvider='';state.prof.model=state.prof.model||'';state.prof.voice=Object.assign({enabled:true,auto:false,rate:1,pitch:1,voiceURI:''},state.prof.voice||{});return state;},
  };
  const accountKey=options.guest?'nubbi:state:v2:guest':'nubbi:state:v2:user:account-a';
  const localValues = new Map([[accountKey, JSON.stringify(ctx.st)], ['nubbi-v1', 'legacy-untouched'], ['unrelated-key', 'preserved']]);
  ctx.localStorage = {
    getItem(key) { return localValues.has(key) ? localValues.get(key) : null; },
    setItem(key, value) {
      if(options.localStorageError) throw options.localStorageError;
      assert.ok(key.startsWith('nubbi:state:v2:'), 'no legacy writes'); assert.equal(typeof value, 'string');
      localValues.set(key, value); if(key===accountKey)ctx.localSaves++;
    },
  };
  ctx.NubbiApp = { save() { ctx.appSaveCalls++; } };
  ctx.window = ctx; ctx.document={documentElement:{removeAttribute(){}}};
  ctx.cloudSync={currentUser(){return auth.currentUser;}};
  vm.createContext(ctx); vm.runInContext(storeSource,ctx);
  ctx.NubbiAccountStore.activate(auth.currentUser); vm.runInContext(syncSource, ctx);
  return { ctx, auth, reads, writes, alerts, localValues, setGet(fn) { get = fn; } };
}
// Execute the actual rules predicate with local Firestore-list/set method semantics.
// This supplements, but is not a substitute for, the official Firestore rules emulator.
function ruleList(items) {
  const list = [...items];
  Object.defineProperties(list, {
    size: { value: () => list.length },
    hasAll: { value: other => [...other].every(x => list.includes(x)) },
    hasAny: { value: other => [...other].some(x => list.includes(x)) },
    hasOnly: { value: other => list.every(x => [...other].includes(x)) },
    toSet: { value: () => ruleSet(list) },
  }); return list;
}
function ruleSet(items) {
  const values = new Set(items); return {
    values, size: () => values.size,
    hasAll: other => [...(other.values || other)].every(x => values.has(x)),
    hasAny: other => [...(other.values || other)].some(x => values.has(x)),
    hasOnly: other => [...values].every(x => [...(other.values || other)].includes(x)),
    difference: other => ruleSet([...values].filter(x => !(other.values || new Set(other)).has(x))),
  };
}
const ruleStart = rules.indexOf('function validLikeChange(');
const ruleEnd = rules.indexOf('\n    function ', ruleStart + 1);
const ruleBody = rules.slice(rules.indexOf('{', ruleStart) + 1, rules.lastIndexOf('}', ruleEnd));
const jsBody = ruleBody.replace(/\b(newLikes|oldLikes) is list/g, 'Array.isArray($1)').replaceAll('request.auth.uid', 'uid');
const allowLike = new Function('oldLikes', 'newLikes', 'uid', jsBody);
let passed = 0; const failures = [];
async function test(name, run) { try { await run(); passed++; } catch (error) { failures.push({ name, error }); } }
(async () => {
  await test('rules allow only caller own like insertion/removal', () => {
    assert.equal(allowLike(ruleList(['other']), ruleList(['other', 'caller']), 'caller'), true);
    assert.equal(allowLike(ruleList(['other', 'caller']), ruleList(['other']), 'caller'), true);
  });
  await test('rules reject third-party like changes and duplicate identities', () => {
    for (const [oldLikes, newLikes] of [
      [['caller'], ['caller', 'victim']], [['victim'], []],
      [['caller'], ['caller', 'caller']], [['caller', 'victim', 'other'], ['victim', 'victim']],
    ]) assert.equal(allowLike(ruleList(oldLikes), ruleList(newLikes), 'caller'), false, JSON.stringify({ oldLikes, newLikes }));
  });
  await test('same-account save preserves snapshot and target', async () => {
    const f = fixture(); await f.ctx.cloudSync.save();
    assert.equal(f.writes.length, 1); assert.equal(f.writes[0].uid, 'account-a');
    assert.equal(JSON.parse(f.writes[0].data.data).custom[0].id, 'local-a');
  });
  await test('same-account load applies valid data and persists locally', async () => {
    const f = fixture(); f.setGet(async () => ({ exists: true, data: () => ({ data: JSON.stringify({ custom: [{ id: 'remote-a' }], chats: {}, cfg: {}, prof: {} }) }) }));
    assert.equal(await f.ctx.cloudSync.load(), true); assert.equal(f.ctx.st.custom[0].id, 'remote-a'); assert.equal(f.ctx.localSaves, 1);
  });
  await test('account switch while load is pending never applies old account data', async () => {
    const f = fixture(), read = deferred(), started = deferred();
    f.setGet(() => { started.resolve(); return read.promise; });
    const pending = f.ctx.cloudSync.load(); await started.promise;
    f.auth.currentUser = { uid: 'account-b', email: 'b@example.test', isAnonymous: false };
    f.ctx.st.custom = [{ id: 'local-b' }];
    read.resolve({ exists: true, data: () => ({ data: JSON.stringify({ custom: [{ id: 'remote-a' }], chats: {}, cfg: {}, prof: {} }) }) });
    try { await pending; } catch (error) { assert.match(error.message, /sesión|session|cuenta|account/i); }
    assert.equal(f.ctx.st.custom[0].id, 'local-b'); assert.equal(f.ctx.localSaves, 0); assert.equal(f.ctx.renders, 0);
  });
  await test('account switch during save preparation cannot upload another session state', async () => {
    const f = fixture(), pending = f.ctx.cloudSync.save();
    f.auth.currentUser = { uid: 'account-b', email: 'b@example.test', isAnonymous: false };
    f.ctx.st.custom = [{ id: 'local-b' }];
    await assert.rejects(pending, /sesión|session|cuenta|account/i); assert.equal(f.writes.length, 0);
  });
  await test('initial auth hydration callback does not cancel a valid pending download', async () => {
    const f = fixture(), read = deferred(), started = deferred();
    f.setGet(() => { started.resolve(); return read.promise; });
    const pending = f.ctx.cloudSync.load(); await started.promise;
    f.auth.emit(f.auth.currentUser);
    read.resolve({exists: true, data: () => ({data: JSON.stringify({custom: [{id:'hydrated'}]})})});
    assert.equal(await pending, true); assert.equal(f.ctx.st.custom[0].id,'hydrated');
  });
  await test('same-UID logout/re-login invalidates a pending download', async () => {
    const f = fixture(), read = deferred(), started = deferred(), user = f.auth.currentUser;
    f.auth.emit(user);
    f.setGet(() => { started.resolve(); return read.promise; });
    const pending = f.ctx.cloudSync.load(); await started.promise;
    f.auth.emit(null); f.auth.emit(user);
    read.resolve({exists: true, data: () => ({data: JSON.stringify({custom:[{id:'stale'}]})})});
    await assert.rejects(pending,/sesión|session|cuenta|account/i);
    assert.equal(f.ctx.st.custom[0].id,'local-a'); assert.equal(f.ctx.localSaves,0);
  });
  await test('signOut explicitly invalidates in-flight work before its SDK promise resolves', async () => {
    const f = fixture(), read = deferred(), started = deferred(), logout = deferred();
    f.setGet(() => { started.resolve(); return read.promise; });
    f.auth.signOut = () => logout.promise;
    const pending = f.ctx.cloudSync.hasData(); await started.promise;
    const signingOut = f.ctx.cloudSync.signOut();
    read.resolve({exists: true});
    await assert.rejects(pending,/sesión|session|cuenta|account/i); logout.resolve(); await signingOut;
  });
  await test('save captures snapshot before awaits while preserving later local edits', async () => {
    const f = fixture(), pending = f.ctx.cloudSync.save();
    f.ctx.st.custom[0].id = 'edited-after-save-start'; await pending;
    assert.equal(JSON.parse(f.writes[0].data.data).custom[0].id,'local-a');
    assert.equal(f.ctx.st.custom[0].id,'edited-after-save-start');
  });
  await test('hasData rejects an account switch while remote read is pending', async () => {
    const f = fixture(), read = deferred(), started = deferred();
    f.setGet(() => { started.resolve(); return read.promise; });
    const pending = f.ctx.cloudSync.hasData(); await started.promise;
    f.auth.emit({uid:'account-b',isAnonymous:false}); read.resolve({exists:true});
    await assert.rejects(pending,/sesión|session|cuenta|account/i);
  });
  await test('pending download never silently overwrites new local edits', async () => {
    const f = fixture(), read = deferred(), started = deferred();
    f.setGet(() => { started.resolve(); return read.promise; });
    const pending = f.ctx.cloudSync.load(); await started.promise;
    f.ctx.st.custom[0].id = 'new-local-edit';
    read.resolve({exists:true,data:()=>({data:JSON.stringify({custom:[{id:'remote-old'}]})})});
    await assert.rejects(pending,/locales|local/i);
    assert.equal(f.ctx.st.custom[0].id,'new-local-edit'); assert.equal(f.ctx.localSaves,0);
  });
  await test('invalid snapshots and dangerous keys reject atomically without prototype changes', async () => {
    for(const text of ['[]','null','{bad','{"custom":{}}','{"prof":[]}',
      '{"custom":[null]}','{"personas":["wrong"]}','{"favs":[{}]}','{"chats":{"p0":"wrong"}}','{"cfg":{"p0":null}}','{"cur":{}}',
      '{"custom":[{"id":"changed"}],"__proto__":{"polluted":true}}',
      '{"prof":{"constructor":{"prototype":{"polluted":true}}}}']) {
      const f = fixture(), before = JSON.stringify(f.ctx.st), originalPrototype=Object.getPrototypeOf(f.ctx.st);
      f.setGet(async()=>({exists:true,data:()=>({data:text})}));
      assert.equal(await f.ctx.cloudSync.load(),false,text);
      assert.equal(JSON.stringify(f.ctx.st),before,text); assert.equal(Object.getPrototypeOf(f.ctx.st),originalPrototype);
      assert.equal(f.ctx.localSaves,0); assert.equal(f.ctx.renders,0);
    }
  });
  await test('guest save and load retain anonymous compatibility', async () => {
    const f = fixture({guest:true});
    assert.equal(await f.ctx.cloudSync.save(),'guest-a');
    assert.equal(f.writes[0].uid,'guest-a');
    f.setGet(async()=>({exists:true,data:()=>({data:JSON.stringify({custom:[{id:'guest-cloud'}]})})}));
    assert.equal(await f.ctx.cloudSync.load(),true); assert.equal(f.ctx.st.custom[0].id,'guest-cloud');
  });
  await test('load never invokes a rejecting async global save or creates an unhandled rejection', async () => {
    const f = fixture(), unhandled = [], capture = error => unhandled.push(error);
    f.ctx.save = async () => { f.ctx.globalSaveCalls++; throw new Error('global-save-rejection-sentinel'); };
    process.on('unhandledRejection', capture);
    try{
      assert.equal(await f.ctx.cloudSync.load(), true);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(f.ctx.globalSaveCalls, 0); assert.deepEqual(unhandled, []);
      assert.equal(f.writes.length, 0); assert.equal(f.ctx.localSaves, 1);
    } finally { process.removeListener('unhandledRejection', capture); }
  });
  await test('load works with no global save or NubbiApp hook', async () => {
    const f = fixture(); delete f.ctx.save; delete f.ctx.NubbiApp;
    assert.equal(await f.ctx.cloudSync.load(), true);
    assert.equal(f.ctx.localSaves, 1); assert.equal(f.writes.length, 0);
  });
  await test('load bypasses async app save hooks and persists locally instead', async () => {
    const f = fixture();
    f.ctx.NubbiApp.save = async () => { f.ctx.appSaveCalls++; throw new Error('app-hook-must-not-run'); };
    assert.equal(await f.ctx.cloudSync.load(), true);
    assert.equal(f.ctx.appSaveCalls, 0); assert.equal(f.ctx.globalSaveCalls, 0);
    assert.equal(f.ctx.localSaves, 1); assert.equal(f.writes.length, 0);
  });
  await test('local quota failure preserves live data, original keys, aliases and stored values', async () => {
    const quota = new Error('simulated local quota exceeded'); quota.name = 'QuotaExceededError';
    const f = fixture({localStorageError: quota}), before = JSON.stringify(f.ctx.st), custom = f.ctx.st.custom;
    const storedBefore = [...f.localValues.entries()], keysBefore = Object.keys(f.ctx.st);
    f.setGet(async()=>({exists:true,data:()=>({data:JSON.stringify({custom:[{id:'remote-change'}],extraRemoteField:'new'})})}));
    await assert.rejects(f.ctx.cloudSync.load(), error => error.code === 'sync/local-storage');
    assert.equal(JSON.stringify(f.ctx.st), before); assert.equal(f.ctx.st.custom, custom);
    assert.deepEqual(Object.keys(f.ctx.st), keysBefore); assert.deepEqual([...f.localValues.entries()], storedBefore);
    assert.equal(f.writes.length,0); assert.equal(f.ctx.localSaves,0); assert.equal(f.ctx.renders,0); assert.equal(f.ctx.prefsCalls,0);
  });
  await test('unavailable local storage aborts before mutation and never uploads', async () => {
    const f = fixture(), before = JSON.stringify(f.ctx.st);
    Object.defineProperty(f.ctx,'localStorage',{get(){throw new Error('storage access denied');}});
    await assert.rejects(f.ctx.cloudSync.load(), error => error.code === 'sync/local-storage');
    assert.equal(JSON.stringify(f.ctx.st),before); assert.equal(f.writes.length,0); assert.equal(f.ctx.renders,0);
  });
  await test('partial cloud restore resets omitted sections to app defaults, retains safe remote extensions, and matches storage', async () => {
    const f = fixture(), before=JSON.stringify(f.ctx.st), oldLegacy=f.localValues.get('nubbi-v1');
    f.setGet(async()=>({exists:true,data:()=>({data:JSON.stringify({custom:[{id:'remote-only',lang:'es-AR'}],prof:{name:'Remoto válido',lang:'es-LAT',imgProvider:'forge'},chats:{},serverExtension:{retained:true}})})}));
    assert.equal(await f.ctx.cloudSync.load(),true);
    assert.equal(f.ctx.st.custom[0].id,'remote-only');
    assert.equal(JSON.stringify(f.ctx.st.chats),'{}');assert.equal(JSON.stringify(f.ctx.st.cfg),'{}');assert.equal(JSON.stringify(f.ctx.st.favs),'[]');
    assert.equal(JSON.stringify(f.ctx.st.personas),'[]');assert.equal(f.ctx.st.persona,null);assert.equal(JSON.stringify(f.ctx.st.branches),'{}');
    assert.equal(f.ctx.st.prof.name,'Remoto válido');assert.equal(f.ctx.st.prof.theme,f.ctx.NubbiAppDefaults().prof.theme);assert.equal(f.ctx.st.prof.imgProvider,'forge');assert.equal(f.ctx.st.custom[0].lang,'es-LAT');assert.deepEqual(JSON.parse(JSON.stringify(f.ctx.st.serverExtension)),{retained:true});
    assert.equal(f.ctx.localStorage.getItem('nubbi:state:v2:user:account-a'),JSON.stringify(f.ctx.st));
    assert.notEqual(f.ctx.localStorage.getItem('nubbi:state:v2:user:account-a'),before);
    assert.ok([...f.localValues].some(([k,v])=>k.startsWith('nubbi:state:v2:recovery:user:account-a:')&&v===before));
    assert.equal(f.ctx.localStorage.getItem('nubbi-v1'),oldLegacy);
    assert.equal(f.ctx.localStorage.getItem('unrelated-key'),'preserved'); assert.equal(f.writes.length,0);
  });
  await test('historical complete cloud snapshots preserve images, memory, relationships, branches, personas, and unknown safe fields', async () => {
    const f=fixture();
    const historical={custom:[{id:'c1',name:'Old character',img:'data:image/png;base64,legacy'}],chats:{c1:[{role:'image',image:'data:image/png;base64,legacy'}]},cfg:{c1:{memory:'remembered',relation:{trust:70},memoryNotes:[{text:'note'}]}},favs:['c1'],personas:[{id:'p1',name:'old persona'}],persona:'p1',branches:{c1:[{name:'old branch',messages:[{role:'user',content:'branch'}],cfg:{memory:'branch memory'}}]},prof:{name:'old user',voice:{auto:false}},unknownSafe:{kept:true},cur:'c1'};
    f.setGet(async()=>({exists:true,data:()=>({data:JSON.stringify(historical)})}));
    assert.equal(await f.ctx.cloudSync.load(),true);
    const visible=JSON.parse(JSON.stringify(f.ctx.st)),stored=JSON.parse(f.ctx.localStorage.getItem('nubbi:state:v2:user:account-a'));
    assert.deepEqual(visible,stored);
    assert.equal(visible.custom[0].name,historical.custom[0].name);assert.equal(visible.chats.c1[0].image,historical.chats.c1[0].image);
    assert.equal(visible.cfg.c1.memory,historical.cfg.c1.memory);assert.deepEqual(visible.cfg.c1.relation,historical.cfg.c1.relation);
    assert.deepEqual(visible.personas,historical.personas);assert.deepEqual(visible.branches,historical.branches);assert.deepEqual(visible.unknownSafe,historical.unknownSafe);
  });
  await test('target quota failure after recovery backup keeps old state, account and live view intact', async () => {
    const f=fixture(),before=JSON.stringify(f.ctx.st),key='nubbi:state:v2:user:account-a',original=f.ctx.localStorage.setItem.bind(f.ctx.localStorage);
    f.ctx.localStorage.setItem=(k,v)=>{if(k===key)throw Object.assign(new Error('target quota'),{name:'QuotaExceededError'});original(k,v);};
    f.setGet(async()=>({exists:true,data:()=>({data:JSON.stringify({prof:{name:'Remote'}})})}));
    await assert.rejects(f.ctx.cloudSync.load(),e=>e.code==='sync/local-storage');
    assert.equal(JSON.stringify(f.ctx.st),before);assert.equal(f.localValues.get(key),before);
    assert.ok([...f.localValues].some(([k,v])=>k.startsWith('nubbi:state:v2:recovery:user:account-a:')&&v===before));
    assert.equal(f.ctx.renders,0);assert.equal(f.ctx.prefsCalls,0);assert.equal(f.writes.length,0);
  });
  await test('a late account change before persistence is rejected without rollback over the new account', async () => {
    const f = fixture(), storedBefore=[...f.localValues.entries()];
    f.setGet(async()=>({exists:true,data:()=>{
      f.auth.emit({uid:'account-b',isAnonymous:false}); f.ctx.st.custom=[{id:'new-account-state'}];
      return {data:JSON.stringify({custom:[{id:'stale-remote-a'}]})};
    }}));
    await assert.rejects(f.ctx.cloudSync.load(), error=>error.code==='sync/session-changed');
    assert.equal(f.ctx.st.custom[0].id,'new-account-state'); assert.deepEqual([...f.localValues.entries()],storedBefore);
    assert.equal(f.writes.length,0); assert.equal(f.ctx.localSaves,0);
  });
  await test('even a global save aliased to cloud save is never called by load', async () => {
    const f = fixture(); f.ctx.save=()=>{f.ctx.globalSaveCalls++;return f.ctx.cloudSync.save();};
    assert.equal(await f.ctx.cloudSync.load(),true);
    assert.equal(f.ctx.globalSaveCalls,0); assert.equal(f.writes.length,0);
  });
  for (const f of failures) console.error('FAIL:', f.name, '\n ', f.error.message);
  console.log(`Firebase security regression groups: ${passed} passed, ${failures.length} failed (local VM, not emulator)`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
