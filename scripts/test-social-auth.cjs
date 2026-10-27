const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/firebase-sync.js'),'utf8');
function harness(){
 const calls={popup:[],links:0,cloud:0};let popupError=null;
 const auth={currentUser:null,onAuthStateChanged(cb){this.listener=cb;},async signInWithPopup(provider){calls.popup.push(provider);if(popupError)throw popupError;this.currentUser={uid:'social-user',isAnonymous:false};this.listener(this.currentUser);return {user:this.currentUser};}};
 function Google(){this.id='google';this.setCustomParameters=p=>{this.params=p;};}function Facebook(){this.id='facebook';}function Twitter(){this.id='twitter';}
 function authFn(){return auth;}Object.assign(authFn,{GoogleAuthProvider:Google,FacebookAuthProvider:Facebook,TwitterAuthProvider:Twitter});
 const window={FIREBASE_CONFIG:{apiKey:'public-test-key'},firebase:{initializeApp(){},auth:authFn,firestore(){return {collection(){calls.cloud++;throw Error('Unexpected cloud access');}}}}};
 vm.runInNewContext(source,{window,firebase:window.firebase,Error,JSON,Date,Object});
 return {cs:window.cloudSync,auth,calls,fail(error){popupError=error;}};
}
(async()=>{
 for(const provider of ['google','facebook','twitter']){
  const h=harness();h.auth.currentUser={uid:'guest-original',isAnonymous:true,linkWithPopup(){h.calls.links++;}};
  const user=await h.cs.signInSocial(provider);assert.equal(user.uid,'social-user');assert.equal(h.calls.popup.length,1);assert.equal(h.calls.popup[0].id,provider);assert.equal(h.calls.links,0);assert.equal(h.calls.cloud,0);
  if(provider==='google')assert.equal(h.calls.popup[0].params.prompt,'select_account');
 }
 for(const provider of ['constructor','__proto__','github','']){const h=harness();await assert.rejects(h.cs.signInSocial(provider),/no compatible/);assert.equal(h.calls.popup.length,0);}
 const signed=harness();signed.auth.currentUser={uid:'A',isAnonymous:false};await assert.rejects(signed.cs.signInSocial('google'),/Cerrá/);assert.equal(signed.auth.currentUser.uid,'A');assert.equal(signed.calls.popup.length,0);
 for(const code of ['auth/popup-blocked','auth/popup-closed-by-user','auth/account-exists-with-different-credential','auth/operation-not-allowed']){
  const h=harness(),guest={uid:'guest-original',isAnonymous:true};h.auth.currentUser=guest;h.fail(Object.assign(Error('provider failure'),{code}));await assert.rejects(h.cs.signInSocial('google'));assert.equal(h.auth.currentUser,guest);assert.equal(h.calls.cloud,0);assert.notEqual(h.cs.friendly({code}),'provider failure');
 }
 console.log('PASS social auth: Google/Facebook/X popup, no auto-link/migration/cloud writes, existing-account guard, failures preserve guest');
})().catch(e=>{console.error(e);process.exitCode=1});
