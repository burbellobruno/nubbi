const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/account-bootstrap.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/account-store.css'),'utf8');
(async function(){
 assert.match(html,/account-store\.css/);
 assert.match(html,/account-store\.js/);
 assert.match(html,/account-bootstrap\.js/);
 assert.doesNotMatch(html,/<script src="app\.js"><\/script>/);
 assert.match(css,/data-nb-account-ready/);
 let authChange,authError,loads=[],reloads=0,locked=0,ready=false,active='guest';
 const notice={textContent:'',children:[],appendChild(node){this.children.push(node);}};
 const store={principal:null,locked:false,activate(user){this.principal=user&&!user.isAnonymous?'user:'+user.uid:'guest';},principalFor(user){return user&&!user.isAnonymous?'user:'+user.uid:'guest';},lock(){this.locked=true;locked++;}};
 const root={NubbiAccountStore:store,cloudSync:{},firebase:{auth(){return {onAuthStateChanged(a,b){authChange=a;authError=b;}}}},location:{reload(){reloads++;}},document:{
  getElementById(){return notice;},
  documentElement:{setAttribute(k,v){if(k==='data-nb-account-ready'&&v==='1')ready=true;}},
  createElement(){return {src:'',onload:null,onerror:null};},
  body:{appendChild(s){loads.push(s.src);if(s.src==='app.js')root.NubbiApp={};Promise.resolve().then(()=>s.onload());}}
 }};
 const ctx=vm.createContext({window:root,Promise,Error});vm.runInContext(source,ctx);
 assert.equal(loads.length,0,'app must not load before Firebase auth hydration');
 authChange({uid:'A',isAnonymous:false});
 for(let k=0;k<15;k++)await Promise.resolve();
 assert.equal(loads.join(','),'app.js,community.js,ui-v2.js,experience.js');
 assert.equal(ready,true);
 assert.equal(store.principal,'user:A');
 authChange({uid:'A',isAnonymous:false});assert.equal(reloads,0);
 authChange({uid:'B',isAnonymous:false});assert.equal(reloads,1);assert.equal(store.locked,true);
 authChange(null);assert.equal(reloads,1);
 authError(new Error('Simulated authentication failure'));
 assert.equal(store.locked,true);
 assert.match(notice.textContent,/No se borró ningún respaldo/);
 assert.equal(notice.children.length,2,'A failed boot offers non-destructive recovery exports');
 // Guest authentication without an installed Firebase connector must be safe.
 let guestLoads=[];const guestStore={locked:false,principal:null,activate(){this.principal='guest';},lock(){this.locked=true;}};
 const g={NubbiAccountStore:guestStore,location:{reload(){}},document:{getElementById(){return {textContent:''};},documentElement:{setAttribute(){}},createElement(){return {src:'',onload:null};},body:{appendChild(s){guestLoads.push(s.src);if(s.src==='app.js')g.NubbiApp={};Promise.resolve().then(()=>s.onload());}}}};
 vm.runInNewContext(source,{window:g,Promise,Error});for(let k=0;k<15;k++)await Promise.resolve();
 assert.equal(guestLoads.length,4);
 console.log('PASS P1 bootstrap: hydration gate, ordered script load, same principal, cross-account reload, guest fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
