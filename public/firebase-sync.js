(function(){
  if(!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "PEGAR_AQUI") return;
  if(typeof firebase === "undefined") return;
  firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();

  function friendly(e){
    const code = (e && e.code) || "";
    if(code === "auth/operation-not-allowed") return "Habilitá Email/Password en Firebase Console → Authentication → Sign-in method.";
    if(code === "auth/email-already-in-use") return "Ese email ya tiene cuenta. Probá iniciar sesión.";
    if(code === "auth/invalid-email") return "El email no es válido.";
    if(code === "auth/weak-password") return "La contraseña debe tener al menos 6 caracteres.";
    if(code === "auth/wrong-password" || code === "auth/invalid-credential") return "Email o contraseña incorrectos.";
    if(code === "auth/user-not-found") return "No existe una cuenta con ese email.";
    if(code === "auth/too-many-requests") return "Demasiados intentos. Esperá un momento.";
    if(code === "auth/network-request-failed") return "Sin conexión. Revisá internet.";
    if(code === "auth/unauthorized-domain") return "Este dominio no está autorizado en Firebase. Agregalo en Authentication → Settings → Authorized domains.";
    return (e && e.message) || "Error de autenticación.";
  }

  // Invalidate pending operations on account transitions, including same-UID re-login.
  let sessionEpoch = 0;
  let observedUser = auth.currentUser;
  let receivedInitialAuth = false;
  auth.onAuthStateChanged(function(user){
    if(receivedInitialAuth && user !== observedUser) sessionEpoch++;
    // The SDK's first hydration callback must not cancel an otherwise valid operation.
    receivedInitialAuth = true;
    observedUser = user;
  });

  function sessionChanged(){
    const error = new Error("La sesión cambió durante la sincronización. Revisa la cuenta y vuelve a intentar.");
    error.code = "sync/session-changed";
    return error;
  }

  function captureSession(){ return {user: auth.currentUser, epoch: sessionEpoch}; }
  function assertSession(ticket){
    if(!ticket.user || !auth.currentUser || auth.currentUser !== ticket.user
      || auth.currentUser.uid !== ticket.user.uid || sessionEpoch !== ticket.epoch) throw sessionChanged();
  }

  async function ensureUser(){
    if(auth.currentUser) return auth.currentUser;
    const credential = await auth.signInAnonymously();
    const user = credential && credential.user;
    if(!user || !user.isAnonymous || auth.currentUser !== user) throw sessionChanged();
    return user;
  }

  async function sessionUser(){
    const before = captureSession();
    const user = await ensureUser();
    if(before.user) assertSession(before);
    else if(!user || !user.isAnonymous || auth.currentUser !== user) throw sessionChanged();
    return captureSession();
  }

  function validSnapshot(text){
    if(typeof text !== "string") throw new Error("El respaldo no tiene un formato válido.");
    const data = JSON.parse(text);
    function record(value){ return value !== null && typeof value === "object" && !Array.isArray(value); }
    if(!record(data)) throw new Error("El respaldo debe ser un objeto.");
    // Reject dangerous property names before assigning any part of a remote snapshot.
    function safeKeys(value){
      if(!value || typeof value !== "object") return;
      for(const key of Object.keys(value)){
        if(key === "__proto__" || key === "constructor" || key === "prototype") throw new Error("El respaldo contiene campos no permitidos.");
        safeKeys(value[key]);
      }
    }
    safeKeys(data);
    for(const key of ["custom", "favs", "personas"]){
      if(Object.prototype.hasOwnProperty.call(data, key) && !Array.isArray(data[key])) throw new Error("El respaldo contiene una lista inválida.");
    }
    for(const key of ["chats", "cfg", "branches", "prof"]){
      if(Object.prototype.hasOwnProperty.call(data, key) && !record(data[key])) throw new Error("El respaldo contiene una sección inválida.");
    }
    for(const key of ["custom", "personas"]){
      if(data[key] && data[key].some(function(value){ return !record(value); })) throw new Error("El respaldo contiene elementos inválidos.");
    }
    if(data.favs && data.favs.some(function(value){ return typeof value !== "string"; })) throw new Error("El respaldo contiene favoritos inválidos.");
    for(const key of ["chats", "branches"]){
      if(data[key]) for(const id of Object.keys(data[key])){
        if(!Array.isArray(data[key][id]) || data[key][id].some(function(value){ return !record(value); })) throw new Error("El respaldo contiene una conversación inválida.");
      }
    }
    if(data.cfg) for(const id of Object.keys(data.cfg)){
      if(!record(data.cfg[id])) throw new Error("El respaldo contiene una configuración inválida.");
    }
    for(const key of ["persona", "cur"]){
      if(Object.prototype.hasOwnProperty.call(data, key) && data[key] !== null && typeof data[key] !== "string") throw new Error("El respaldo contiene una selección inválida.");
    }
    if(!window.NubbiAccountStore) throw new Error("El almacenamiento seguro todavía no está listo.");
    window.NubbiAccountStore.validate(JSON.stringify(data));
    return data;
  }

  function localConflict(){
    const error = new Error("Los datos locales cambiaron durante la descarga. No se reemplazaron; vuelve a intentar.");
    error.code = "sync/local-conflict";
    return error;
  }

  function persistDownloadedSnapshot(data, localBefore, ticket){
    if(typeof window.NubbiAppDefaults !== 'function') throw new Error("No se pudieron preparar los valores iniciales de Nubbi.");
    // A cloud download is a restore: omitted sections reset to app defaults,
    // never to stale values from this browser. Unknown safe remote fields remain.
    const staged = Object.assign(window.NubbiAppDefaults(), data);
    if(typeof window.NubbiNormalizePrefs !== 'function') throw new Error("No se pudieron normalizar las preferencias de Nubbi.");
    window.NubbiNormalizePrefs(staged);
    const serialized = JSON.stringify(staged);
    assertSession(ticket);
    window.NubbiAccountStore.assertUser(ticket.user);
    if(JSON.stringify(st) !== localBefore) throw localConflict();
    // AccountStore backs up an existing local snapshot before replacement.
    // On quota/storage errors, the old snapshot and live state remain untouched.
    let committed;
    try{committed = window.NubbiAccountStore.replace(serialized, 'cloud');}
    catch(error){
      if(error.code==='account/storage'){const wrapped=new Error(error.message);wrapped.code='sync/local-storage';throw wrapped;}
      throw error;
    }
    // Keep the live root object identity while making it exactly match storage.
    for(const key of Object.keys(st)) delete st[key];
    Object.assign(st, committed);
  }

  window.cloudSync = {
    available: true,
    friendly: friendly,
    currentUser(){ return auth.currentUser; },
    isAnonymous(){ return !auth.currentUser || auth.currentUser.isAnonymous; },
    onAuth(cb){ return auth.onAuthStateChanged(cb); },
    async ensureUser(){ return ensureUser(); },

    async register(email, password){
      sessionEpoch++;
      let u = auth.currentUser;
      if(u && u.isAnonymous){
        const cred = firebase.auth.EmailAuthProvider.credential(email, password);
        u = (await u.linkWithCredential(cred)).user;
      }else if(!u){
        u = (await auth.createUserWithEmailAndPassword(email, password)).user;
      }else{
        throw new Error("Ya hay una sesión iniciada. Cerrá sesión primero.");
      }
      return u;
    },

    async signIn(email, password){
      sessionEpoch++;
      const u = (await auth.signInWithEmailAndPassword(email, password)).user;
      return u;
    },

    async signOut(){ sessionEpoch++; await auth.signOut(); },

    async reset(email){
      await auth.sendPasswordResetEmail(email);
    },

    async hasData(){
      const ticket = await sessionUser();
      assertSession(ticket);
      window.NubbiAccountStore.assertUser(ticket.user);
      const doc = await db.collection("users").doc(ticket.user.uid).get();
      assertSession(ticket);
      window.NubbiAccountStore.assertUser(ticket.user);
      return doc.exists;
    },

    async save(){
      // Capture before the first await: later edits must not enter an earlier upload.
      const snapshot = JSON.stringify(st);
      validSnapshot(snapshot);
      const ticket = await sessionUser();
      assertSession(ticket);
      window.NubbiAccountStore.assertUser(ticket.user);
      await db.collection("users").doc(ticket.user.uid).set({
        data: snapshot,
        updated: Date.now(),
        email: ticket.user.email || null
      });
      assertSession(ticket);
      return ticket.user.uid;
    },

    async load(){
      const localBefore = JSON.stringify(st);
      const ticket = await sessionUser();
      assertSession(ticket);
      window.NubbiAccountStore.assertUser(ticket.user);
      const doc = await db.collection("users").doc(ticket.user.uid).get();
      assertSession(ticket);
      window.NubbiAccountStore.assertUser(ticket.user);
      if(JSON.stringify(st) !== localBefore) throw localConflict();
      if(!doc.exists){
        alert("No hay datos en la nube para este usuario.");
        return false;
      }
      let data;
      try{ data = validSnapshot(doc.data().data); }
      catch(error){ alert("No se sincronizó el respaldo: formato inválido."); return false; }
      // Validation and local persistence complete before mutating live state.
      persistDownloadedSnapshot(data, localBefore, ticket);
      applyPrefs();
      renderAll();
      alert("Datos sincronizados desde la nube.");
      return true;
    }
  };
})();
