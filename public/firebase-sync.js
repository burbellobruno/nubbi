(function(){
  if(!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "PEGAR_AQUI") return;
  if(typeof firebase === "undefined") return;
  firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  window.cloudSync = {
    async login(){ if(!auth.currentUser) await auth.signInAnonymously(); return auth.currentUser; },
    async save(){ const u = await this.login(); await db.collection("users").doc(u.uid).set({ data: JSON.stringify(st), updated: Date.now() }); return u.uid; },
    async load(){ const u = await this.login(); const doc = await db.collection("users").doc(u.uid).get(); if(doc.exists){ try { const o = JSON.parse(doc.data().data); for(var k in o) st[k]=o[k]; save(); applyPrefs(); renderAll(); alert("Datos sincronizados desde la nube."); } catch(e){ alert("Error al sincronizar."); } } else { alert("No hay datos en la nube para este usuario."); } }
  };
})();