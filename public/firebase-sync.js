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

  async function ensureUser(){
    if(!auth.currentUser) await auth.signInAnonymously();
    return auth.currentUser;
  }

  window.cloudSync = {
    available: true,
    friendly: friendly,
    currentUser(){ return auth.currentUser; },
    isAnonymous(){ return !auth.currentUser || auth.currentUser.isAnonymous; },
    onAuth(cb){ return auth.onAuthStateChanged(cb); },
    async ensureUser(){ return ensureUser(); },

    async register(email, password){
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
      const u = (await auth.signInWithEmailAndPassword(email, password)).user;
      return u;
    },

    async signOut(){ await auth.signOut(); },

    async reset(email){
      await auth.sendPasswordResetEmail(email);
    },

    async hasData(){
      const u = await ensureUser();
      const doc = await db.collection("users").doc(u.uid).get();
      return doc.exists;
    },

    async save(){
      const u = await ensureUser();
      await db.collection("users").doc(u.uid).set({
        data: JSON.stringify(st),
        updated: Date.now(),
        email: u.email || null
      });
      return u.uid;
    },

    async load(){
      const u = await ensureUser();
      const doc = await db.collection("users").doc(u.uid).get();
      if(!doc.exists){
        alert("No hay datos en la nube para este usuario.");
        return false;
      }
      try{
        const o = JSON.parse(doc.data().data);
        for(const k in o) st[k] = o[k];
        save();
        applyPrefs();
        renderAll();
        alert("Datos sincronizados desde la nube.");
        return true;
      }catch(e){
        alert("Error al sincronizar los datos.");
        return false;
      }
    }
  };
})();
