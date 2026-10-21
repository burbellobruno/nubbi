(function(){
  if(!window.firebase || !window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey || window.FIREBASE_CONFIG.apiKey === "PEGAR_AQUI") return;
  if(!window.st) return;

  var auth = firebase.auth();
  var db = firebase.firestore();
  var C_CHAR = "communityCharacters";
  var C_POST = "communityPosts";
  var C_CREATOR = "creators";
  var C_REPORT = "reports";
  var MOD_KEY = "nubbi-mod-v1";
  var st = window.st;
  var $ = function(id){ return document.getElementById(id); };
  var state = {
    loaded: false,
    loading: false,
    error: "",
    chars: [],
    posts: [],
    tab: "chars",
    q: "",
    selected: "",
    report: null,
    commentsPost: null,
    comments: [],
    commentsLoading: false,
    commentsSending: false,
    commentsError: ""
  };
  var mod = {blocked: [], hidden: []};
  try{
    var rawMod = localStorage.getItem(MOD_KEY);
    if(rawMod){
      var parsedMod = JSON.parse(rawMod);
      if(parsedMod){
        mod.blocked = Array.isArray(parsedMod.blocked) ? parsedMod.blocked : [];
        mod.hidden = Array.isArray(parsedMod.hidden) ? parsedMod.hidden : [];
      }
    }
  }catch(e){}

  function save(){ if(window.save) window.save(); }
  function saveMod(){
    try{ localStorage.setItem(MOD_KEY, JSON.stringify(mod)); }catch(e){}
  }
  function realUser(){
    var u = auth.currentUser;
    return !!(u && !u.isAnonymous);
  }
  function currentUid(){ return auth.currentUser ? auth.currentUser.uid : ""; }
  function creatorName(){
    var n = (st.prof && st.prof.name ? st.prof.name : "").trim();
    return n || "Creador";
  }
  function creatorBio(){ return String((st.prof && st.prof.bio) || "").trim(); }
  function cut(v, n){ return String(v == null ? "" : v).slice(0, n); }
  function findCustom(id){
    return (st.custom || []).find(function(c){ return c.id === id; });
  }

  function blockedList(){ return mod.blocked; }
  function hiddenList(){ return mod.hidden; }
  function hiddenKey(x){ return typeof x === "string" ? x : ((x && x.key) || ""); }
  (function migrateMod(){
    var b = Array.isArray(st.blocked) ? st.blocked : [];
    var h = Array.isArray(st.hidden) ? st.hidden : [];
    var changed = false;
    if(!mod.blocked.length && b.length){ mod.blocked = b; changed = true; }
    if(!mod.hidden.length && h.length){ mod.hidden = h; changed = true; }
    if(Object.prototype.hasOwnProperty.call(st, "blocked")){ delete st.blocked; changed = true; }
    if(Object.prototype.hasOwnProperty.call(st, "hidden")){ delete st.hidden; changed = true; }
    if(changed){ saveMod(); if(window.save) window.save(); }
  })();
  function isBlocked(uid){
    if(!uid) return false;
    return blockedList().some(function(b){
      return (typeof b === "string" ? b : b.uid) === uid;
    });
  }
  function isHidden(key){
    return hiddenList().some(function(x){ return hiddenKey(x) === key; });
  }
  function addBlock(uid, name){
    if(!uid || isBlocked(uid)) return;
    blockedList().push({uid: uid, name: name || "Creador", ts: Date.now()});
    saveMod();
  }
  function removeBlock(uid){
    mod.blocked = blockedList().filter(function(b){
      return (typeof b === "string" ? b : b.uid) !== uid;
    });
    saveMod();
  }
  function hideItem(key, label){
    if(!key || isHidden(key)) return;
    hiddenList().push({key: key, label: label || key, ts: Date.now()});
    saveMod();
  }
  function unhideItem(key){
    mod.hidden = hiddenList().filter(function(x){ return hiddenKey(x) !== key; });
    saveMod();
  }

  function grad(name){
    var h = 0, s = String(name || "Nubbi");
    for(var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return "linear-gradient(160deg,hsl(" + h + " 70% 48%),hsl(" + ((h + 60) % 360) + " 70% 22%))";
  }
  function setAvatar(el, name, img, emoji){
    if(!el) return;
    el.innerHTML = "";
    el.style.background = grad(name);
    if(img){
      var i = document.createElement("img");
      i.alt = "";
      i.loading = "lazy";
      i.onerror = function(){
        i.remove();
        el.textContent = emoji || (name ? String(name).charAt(0) : "👤");
      };
      i.src = img;
      el.appendChild(i);
    }else{
      el.textContent = emoji || (name ? String(name).charAt(0) : "👤");
    }
  }
  function setSheetImage(el, name, img, emoji){
    if(!el) return;
    el.innerHTML = "";
    el.style.background = grad(name);
    if(img){
      var i = document.createElement("img");
      i.alt = "";
      i.onerror = function(){
        i.remove();
        el.textContent = emoji || (name ? String(name).charAt(0) : "👤");
      };
      i.src = img;
      el.appendChild(i);
    }else{
      el.textContent = emoji || (name ? String(name).charAt(0) : "👤");
    }
  }
  function when(ts){
    if(!ts) return "";
    var diff = Date.now() - Number(ts);
    if(!isFinite(diff) || diff < 0) diff = 0;
    var min = Math.floor(diff / 60000);
    if(min < 1) return "ahora";
    if(min < 60) return "hace " + min + " min";
    var h = Math.floor(min / 60);
    if(h < 24) return "hace " + h + " h";
    var d = Math.floor(h / 24);
    if(d < 7) return "hace " + d + " d";
    return new Date(Number(ts)).toLocaleDateString("es-AR", {day: "2-digit", month: "2-digit", year: "numeric"});
  }
  function friendlyFirestore(e){
    var code = (e && e.code) || "";
    if(code === "permission-denied") return "No tenés permiso para esta acción. Si es la primera vez, verificá que las reglas de Firestore estén publicadas (ver README).";
    if(code === "failed-precondition") return "Falta un índice de Firestore. Revisá la configuración de la comunidad.";
    if(code === "unavailable") return "Sin conexión con la comunidad. Probá de nuevo.";
    if(code === "resource-exhausted") return "La comunidad está recibiendo muchas solicitudes. Probá en un momento.";
    return (e && e.message) || "No se pudo conectar con la comunidad.";
  }

  function compressImage(src, max, quality){
    return new Promise(function(resolve){
      if(!src){ resolve(""); return; }
      src = String(src);
      if(src.indexOf("data:") !== 0){ resolve(src.length <= 180000 ? src : ""); return; }
      var im = new Image();
      im.onload = function(){
        try{
          var scale = Math.min(1, max / Math.max(im.width || max, im.height || max));
          var w = Math.max(1, Math.round((im.width || max) * scale));
          var h = Math.max(1, Math.round((im.height || max) * scale));
          var cv = document.createElement("canvas");
          cv.width = w;
          cv.height = h;
          cv.getContext("2d").drawImage(im, 0, 0, w, h);
          resolve(cv.toDataURL("image/jpeg", quality || 0.72));
        }catch(e){ resolve(""); }
      };
      im.onerror = function(){ resolve(""); };
      im.src = src;
    });
  }
  async function imageWithCap(src, max, cap){
    if(!src) return "";
    var out = await compressImage(src, max, 0.72);
    if(out && out.length <= cap) return out;
    out = await compressImage(src, Math.max(160, Math.round(max * 0.65)), 0.6);
    if(out && out.length <= cap) return out;
    out = await compressImage(src, Math.max(120, Math.round(max * 0.45)), 0.55);
    return out && out.length <= cap ? out : "";
  }

  async function upsertCreator(){
    if(!realUser()) throw new Error("Necesitás una cuenta para publicar en la comunidad.");
    var photo = await imageWithCap(st.prof && st.prof.img, 160, 90000);
    var payload = {
      name: cut(creatorName(), 80) || "Creador",
      bio: cut(creatorBio(), 600),
      photo: photo || "",
      updatedAt: Date.now()
    };
    await db.collection(C_CREATOR).doc(currentUid()).set(payload, {merge: true});
    return payload;
  }

  function goAccount(){
    var nav = document.querySelector('nav>div[data-v="prof"]');
    if(nav) nav.click();
    setTimeout(function(){
      var box = $("accBox");
      if(box && box.scrollIntoView) box.scrollIntoView({behavior: "smooth", block: "center"});
      var email = $("accEmail");
      if(email) email.focus();
    }, 120);
  }
  function askAccount(msg){
    if(confirm(msg + "\n\n¿Querés ir a Perfil para crear una cuenta o iniciar sesión?")) goAccount();
  }

  function loadCommunity(force){
    if(state.loading) return;
    if(state.loaded && !force){ render(); return; }
    state.loading = true;
    state.error = "";
    render();
    Promise.all([
      db.collection(C_CHAR).where("status", "==", "published").limit(80).get(),
      db.collection(C_POST).where("status", "==", "published").limit(60).get()
    ]).then(function(res){
      state.chars = res[0].docs.map(function(d){
        var o = d.data() || {};
        o.id = d.id;
        if(!Array.isArray(o.likedBy)) o.likedBy = [];
        return o;
      }).filter(function(x){ return x.status === "published"; });
      state.posts = res[1].docs.map(function(d){
        var o = d.data() || {};
        o.id = d.id;
        if(!Array.isArray(o.likedBy)) o.likedBy = [];
        return o;
      }).filter(function(x){ return x.status === "published"; });
      state.loaded = true;
      state.loading = false;
      render();
    }).catch(function(e){
      state.loading = false;
      state.error = friendlyFirestore(e);
      render();
    });
  }

  function render(){
    if(!$("v-community")) return;
    renderTabs();
    renderStatus();
    renderCreatorBox();
    renderComposer();
    if(state.tab === "chars") renderChars();
    else renderPosts();
    renderBlocked();
  }

  function renderTabs(){
    document.querySelectorAll("#commTabs [data-ctab]").forEach(function(t){
      t.classList.toggle("on", t.dataset.ctab === state.tab);
    });
    if($("commCharsPanel")) $("commCharsPanel").style.display = state.tab === "chars" ? "block" : "none";
    if($("commFeedPanel")) $("commFeedPanel").style.display = state.tab === "feed" ? "block" : "none";
  }

  function renderStatus(){
    var el = $("commStatus");
    if(!el) return;
    el.innerHTML = "";
    if(state.loading){
      el.textContent = state.loaded ? "Actualizando la comunidad..." : "Cargando la comunidad...";
      return;
    }
    if(state.error){
      el.textContent = state.error + " ";
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "g";
      retry.textContent = "Reintentar";
      retry.style.marginLeft = "6px";
      retry.onclick = function(){ loadCommunity(true); };
      el.appendChild(retry);
      return;
    }
    if(!realUser()){
      el.textContent = "Modo invitado: podés explorar la comunidad. Para publicar, comentar, dar me gusta o reportar, creá una cuenta. ";
      var go = document.createElement("button");
      go.type = "button";
      go.className = "g";
      go.textContent = "Ir a Perfil";
      go.style.marginLeft = "6px";
      go.onclick = goAccount;
      el.appendChild(go);
    }
  }

  function renderCreatorBox(){
    var status = $("creatorStatus");
    if(!status) return;
    var saveB = $("creatorSave");
    var viewB = $("creatorView");
    var ok = realUser();
    if(saveB) saveB.disabled = !ok;
    if(viewB) viewB.disabled = !ok;
    if(!window.cloudSync){
      status.textContent = "Firebase no está configurado.";
      return;
    }
    if(!ok){
      status.textContent = "Creá una cuenta para publicar personajes y tener perfil de creador.";
      return;
    }
    var mine = state.chars.filter(function(c){ return c.ownerUid === currentUid(); }).length;
    status.textContent = "Sesión iniciada como " + creatorName() + ". Tu nombre y bio se usan en la comunidad" + (state.loaded ? " · " + mine + " personajes publicados" : "") + ".";
  }

  function renderComposer(){
    var gate = $("commPostGate");
    var login = $("commLogin");
    var send = $("commPostSend");
    var sel = $("commPostChar");
    if(gate){
      if(realUser()) gate.textContent = "Publicás como " + creatorName() + ". Sé respetuoso. No se permite contenido sexual con menores ni no consentido.";
      else gate.textContent = "Para publicar en el muro necesitás una cuenta.";
    }
    if(login) login.style.display = realUser() ? "none" : "inline-block";
    if(send) send.disabled = !realUser();
    if(sel){
      var prev = sel.value;
      sel.innerHTML = "";
      var none = document.createElement("option");
      none.value = "";
      none.textContent = "Sin personaje";
      sel.appendChild(none);
      (st.custom || []).forEach(function(c){
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.name || "Personaje";
        sel.appendChild(o);
      });
      if(prev && findCustom(prev)) sel.value = prev;
    }
  }

  function renderChars(){
    var el = $("commChars");
    if(!el) return;
    el.innerHTML = "";
    var q = state.q.toLowerCase().trim();
    var list = state.chars.filter(function(c){
      if(isBlocked(c.ownerUid)) return false;
      if(isHidden("char:" + c.id)) return false;
      if(!q) return true;
      return (String(c.name || "") + " " + String(c.desc || "") + " " + String(c.tags || "") + " " + String(c.ownerName || "")).toLowerCase().indexOf(q) >= 0;
    }).sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
    if(state.loading && !state.loaded){
      el.innerHTML = '<div class="empty">Cargando personajes...</div>';
      return;
    }
    if(!list.length){
      el.innerHTML = '<div class="empty">' + (state.error ? 'No se pudo cargar la comunidad.' : (q ? 'No encontramos personajes para esa búsqueda.' : 'Todavía no hay personajes publicados. ¡Publicá el tuyo!')) + '</div>';
      return;
    }
    list.forEach(function(c){ el.appendChild(pubCard(c)); });
  }

  function pubCard(pub){
    var d = document.createElement("div");
    d.className = "card pubcard";
    d.style.background = grad(pub.name);
    var em = document.createElement("div");
    em.className = "em";
    em.textContent = pub.emoji || (pub.name ? String(pub.name).charAt(0) : "👤");
    d.appendChild(em);
    if(pub.img){
      var im = document.createElement("img");
      im.className = "ph";
      im.alt = "";
      im.loading = "lazy";
      im.onload = function(){ em.style.display = "none"; };
      im.onerror = function(){ im.remove(); };
      im.src = pub.img;
      d.appendChild(im);
    }
    var uid = currentUid();
    var liked = uid && (pub.likedBy || []).indexOf(uid) >= 0;
    var like = document.createElement("div");
    like.className = "fav publike";
    like.textContent = (liked ? "♥ " : "♡ ") + (pub.likedBy || []).length;
    like.title = "Me gusta";
    like.onclick = function(ev){
      ev.stopPropagation();
      toggleCharLike(pub);
    };
    d.appendChild(like);
    var b = document.createElement("b");
    b.textContent = pub.name || "Personaje";
    var s = document.createElement("small");
    s.textContent = pub.desc || "";
    var by = document.createElement("small");
    by.className = "pubby";
    by.textContent = "por " + (pub.ownerName || "Creador");
    d.appendChild(b);
    d.appendChild(s);
    d.appendChild(by);
    var tags = document.createElement("div");
    tags.className = "tags";
    String(pub.tags || "").split(",").slice(0, 3).forEach(function(t){
      t = t.trim();
      if(!t) return;
      var sp = document.createElement("span");
      sp.className = "tg";
      sp.textContent = t;
      tags.appendChild(sp);
    });
    d.appendChild(tags);
    d.onclick = function(){ openPubSheet(pub); };
    return d;
  }

  function renderPosts(){
    var el = $("commPosts");
    if(!el) return;
    el.innerHTML = "";
    var q = state.q.toLowerCase().trim();
    var list = state.posts.filter(function(p){
      if(isBlocked(p.authorUid)) return false;
      if(isHidden("post:" + p.id)) return false;
      if(!q) return true;
      return (String(p.text || "") + " " + String(p.authorName || "") + " " + String(p.charName || "")).toLowerCase().indexOf(q) >= 0;
    }).sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
    if(state.loading && !state.loaded){
      el.innerHTML = '<div class="empty">Cargando novedades...</div>';
      return;
    }
    if(!list.length){
      el.innerHTML = '<div class="empty">' + (state.error ? 'No se pudo cargar el muro.' : (q ? 'No encontramos novedades para esa búsqueda.' : 'Todavía no hay novedades. Publicá la primera.')) + '</div>';
      return;
    }
    list.forEach(function(p){ el.appendChild(postCard(p)); });
  }

  function postCard(post){
    var d = document.createElement("div");
    d.className = "post";
    var head = document.createElement("div");
    head.className = "posthead";
    var a = document.createElement("div");
    a.className = "av";
    setAvatar(a, post.authorName, "", (post.authorName || "?").charAt(0));
    var who = document.createElement("div");
    who.className = "postwho";
    var b = document.createElement("b");
    b.textContent = post.authorName || "Creador";
    b.style.cursor = "pointer";
    b.onclick = function(){ openCreator(post.authorUid, post.authorName); };
    var t = document.createElement("small");
    t.textContent = when(post.createdAt);
    who.appendChild(b);
    who.appendChild(t);
    head.appendChild(a);
    head.appendChild(who);
    d.appendChild(head);
    var body = document.createElement("div");
    body.className = "posttext";
    body.textContent = post.text || "";
    d.appendChild(body);
    if(post.charName){
      var chip = document.createElement("div");
      chip.className = "postchar";
      var ca = document.createElement("div");
      ca.className = "av";
      setAvatar(ca, post.charName, post.charImg || "", post.charEmoji || (post.charName || "?").charAt(0));
      var ct = document.createElement("div");
      var cb = document.createElement("b");
      cb.textContent = post.charName;
      var cs = document.createElement("small");
      cs.textContent = post.charDesc || "Personaje de la comunidad";
      ct.appendChild(cb);
      ct.appendChild(cs);
      chip.appendChild(ca);
      chip.appendChild(ct);
      chip.onclick = function(){
        if(post.charPubId){
          var pub = state.chars.find(function(x){ return x.id === post.charPubId; });
          if(pub) openPubSheet(pub);
        }
      };
      d.appendChild(chip);
    }
    var actions = document.createElement("div");
    actions.className = "postactions";
    var uid = currentUid();
    var liked = uid && (post.likedBy || []).indexOf(uid) >= 0;
    action(actions, (liked ? "♥ " : "♡ ") + (post.likedBy || []).length, "Me gusta", function(){
      togglePostLike(post);
    });
    action(actions, "💬 Comentar", "Comentar", function(){ openComments(post); });
    if(post.authorUid !== uid){
      action(actions, "⚑ Reportar", "Reportar", function(){
        openReport("post", post.id, post.authorUid, "Publicación de " + (post.authorName || "Creador"));
      });
      action(actions, "Bloquear", "Bloquear creador", function(){
        if(!confirm("¿Bloquear a " + (post.authorName || "este creador") + "? No vas a ver su contenido en este dispositivo.")) return;
        addBlock(post.authorUid, post.authorName);
        render();
        if(state.commentsPost) renderComments();
      });
    }else{
      action(actions, "🗑 Eliminar", "Eliminar publicación", function(){ deletePost(post); });
    }
    d.appendChild(actions);
    return d;
  }

  function action(parent, label, title, fn){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "g";
    b.textContent = label;
    b.title = title || "";
    b.onclick = fn;
    parent.appendChild(b);
  }

  async function toggleCharLike(pub){
    if(!realUser()){ askAccount("Para dar me gusta en la comunidad necesitás una cuenta."); return; }
    var uid = currentUid();
    var liked = (pub.likedBy || []).indexOf(uid) >= 0;
    var op = liked ? firebase.firestore.FieldValue.arrayRemove(uid) : firebase.firestore.FieldValue.arrayUnion(uid);
    try{
      await db.collection(C_CHAR).doc(pub.id).update({likedBy: op});
      var arr = (pub.likedBy || []).slice();
      if(liked) arr = arr.filter(function(x){ return x !== uid; });
      else arr.push(uid);
      pub.likedBy = arr;
      renderChars();
      updatePubLike(pub);
    }catch(e){
      alert("No se pudo actualizar el me gusta: " + friendlyFirestore(e));
    }
  }

  async function togglePostLike(post){
    if(!realUser()){ askAccount("Para dar me gusta en la comunidad necesitás una cuenta."); return; }
    var uid = currentUid();
    var liked = (post.likedBy || []).indexOf(uid) >= 0;
    var op = liked ? firebase.firestore.FieldValue.arrayRemove(uid) : firebase.firestore.FieldValue.arrayUnion(uid);
    try{
      await db.collection(C_POST).doc(post.id).update({likedBy: op});
      var arr = (post.likedBy || []).slice();
      if(liked) arr = arr.filter(function(x){ return x !== uid; });
      else arr.push(uid);
      post.likedBy = arr;
      renderPosts();
    }catch(e){
      alert("No se pudo actualizar el me gusta: " + friendlyFirestore(e));
    }
  }

  async function deletePost(post){
    if(!realUser() || post.authorUid !== currentUid()) return;
    if(!confirm("¿Eliminar esta publicación?")) return;
    try{
      await db.collection(C_POST).doc(post.id).delete();
      state.posts = state.posts.filter(function(x){ return x.id !== post.id; });
      renderPosts();
    }catch(e){
      alert("No se pudo eliminar: " + friendlyFirestore(e));
    }
  }

  function openPubSheet(pub){
    if(!pub || !$("pubsheet")) return;
    state.selected = pub.id;
    setSheetImage($("psimg"), pub.name, pub.img || "", pub.emoji || (pub.name ? String(pub.name).charAt(0) : "👤"));
    $("psname").textContent = pub.name || "Personaje";
    $("psrole").textContent = pub.role || "";
    $("psdesc").textContent = pub.desc || "";
    var tags = $("pstags");
    tags.innerHTML = "";
    String(pub.tags || "").split(",").forEach(function(t){
      t = t.trim();
      if(!t) return;
      var sp = document.createElement("span");
      sp.className = "tg";
      sp.textContent = t;
      tags.appendChild(sp);
    });
    var greet = $("psgreet");
    greet.innerHTML = "";
    if(window.NubbiApp && window.NubbiApp.fmt) window.NubbiApp.fmt(greet, pub.greeting || "");
    else greet.textContent = pub.greeting || "";
    greet.style.display = pub.greeting ? "block" : "none";
    var owner = pub.ownerUid === currentUid();
    $("psauthor").textContent = "Por " + (pub.ownerName || "Creador") + " · Ver perfil";
    $("psauthor").onclick = function(){
      if($("pubsheet").open) $("pubsheet").close();
      openCreator(pub.ownerUid, pub.ownerName);
    };
    updatePubLike(pub, true);
    $("psreport").style.display = owner ? "none" : "inline-block";
    $("psblock").style.display = owner ? "none" : "inline-block";
    $("psblock").textContent = isBlocked(pub.ownerUid) ? "Desbloquear" : "Bloquear";
    $("psdelete").style.display = owner ? "inline-block" : "none";
    var copy = (st.custom || []).find(function(c){ return c.pubId === pub.id; });
    $("psuse").textContent = copy ? "Abrir mi copia" : "Usar personaje";
    $("pslike").onclick = function(){ toggleCharLike(pub); };
    $("psreport").onclick = function(){
      if($("pubsheet").open) $("pubsheet").close();
      openReport("character", pub.id, pub.ownerUid, "Personaje: " + (pub.name || "sin nombre"));
    };
    $("psblock").onclick = function(){
      if(isBlocked(pub.ownerUid)){
        removeBlock(pub.ownerUid);
      }else{
        if(!confirm("¿Bloquear a " + (pub.ownerName || "este creador") + "? No vas a ver su contenido en este dispositivo.")) return;
        addBlock(pub.ownerUid, pub.ownerName);
      }
      if($("pubsheet").open) $("pubsheet").close();
      render();
    };
    $("psdelete").onclick = function(){ unpublish(pub); };
    $("psuse").onclick = function(){ importPub(pub); };
    if($("psclose")) $("psclose").onclick = function(){ $("pubsheet").close(); };
    if(!$("pubsheet").open) $("pubsheet").showModal();
  }

  function updatePubLike(pub, force){
    var btn = $("pslike");
    if(!btn) return;
    if(!force && state.selected !== pub.id) return;
    var uid = currentUid();
    var liked = uid && (pub.likedBy || []).indexOf(uid) >= 0;
    btn.textContent = (liked ? "♥ " : "♡ ") + "Me gusta (" + (pub.likedBy || []).length + ")";
  }

  function importPub(pub){
    if(!pub) return;
    var existing = (st.custom || []).find(function(c){ return c.pubId === pub.id; });
    if(existing){
      if(confirm("Ya tenés este personaje en tus personajes. ¿Querés abrir tu copia?")){
        if($("pubsheet").open) $("pubsheet").close();
        if(window.NubbiApp && window.NubbiApp.openChat) window.NubbiApp.openChat(existing.id);
      }
      return;
    }
    var c = {
      id: "c" + Date.now() + Math.floor(Math.random() * 99999),
      emoji: pub.emoji || "",
      img: pub.img || "",
      name: pub.name || "Personaje",
      desc: pub.desc || "",
      role: pub.role || "",
      gender: pub.gender || "Otro",
      tags: pub.tags || "comunidad",
      persona: pub.persona || "",
      greeting: pub.greeting || "",
      pubId: pub.id,
      pubOwner: pub.ownerUid || "",
      pubOwnerName: pub.ownerName || "",
      pubMine: false
    };
    st.custom = st.custom || [];
    st.custom.unshift(c);
    save();
    if(window.renderAll) window.renderAll();
    if($("pubsheet").open) $("pubsheet").close();
    if(window.NubbiApp && window.NubbiApp.openChat) window.NubbiApp.openChat(c.id);
  }

  function publish(id){
    if(!realUser()){ askAccount("Para publicar un personaje en la comunidad necesitás una cuenta."); return; }
    if(!st.custom || !st.custom.length){
      alert("Primero creá tu propio personaje con el botón +.");
      return;
    }
    var c = findCustom(id) || st.custom[0];
    if(!c) return;
    fillPublishSelect(c.id);
    if($("pubadult")) $("pubadult").checked = false;
    if($("pubterms")) $("pubterms").checked = false;
    if(!$("pubdlg").open) $("pubdlg").showModal();
  }

  function fillPublishSelect(id){
    var sel = $("pubchar");
    if(!sel) return;
    var prev = id || sel.value;
    sel.innerHTML = "";
    (st.custom || []).forEach(function(c){
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name || "Personaje";
      sel.appendChild(o);
    });
    if(!st.custom || !st.custom.length) return;
    if(st.custom.some(function(c){ return c.id === prev; })) sel.value = prev;
    else sel.value = st.custom[0].id;
    fillPubFields();
  }

  function fillPubFields(){
    var c = findCustom($("pubchar") ? $("pubchar").value : "");
    if(!c) return;
    $("pubname").value = c.name || "";
    if($("pubrole")) $("pubrole").value = c.role || "";
    $("pubdesc").value = c.desc || "";
    $("pubtags").value = c.tags || "";
    $("pubpersona").value = c.persona || "";
    $("pubgreet").value = c.greeting || "";
    if($("pubsend")) $("pubsend").textContent = c.pubMine ? "Actualizar" : "Publicar";
  }

  async function publishCurrent(){
    var c = findCustom($("pubchar") ? $("pubchar").value : "");
    if(!c){ alert("Elegí un personaje."); return; }
    var name = ($("pubname").value || "").trim();
    if(!name){ alert("El personaje necesita un nombre público."); return; }
    if(!$("pubadult").checked || !$("pubterms").checked){
      alert("Confirmá que el personaje es adulto (18+), que no incluye contenido sexual con menores ni no consentido, y que tenés derecho a publicarlo.");
      return;
    }
    var b = $("pubsend");
    b.disabled = true;
    b.textContent = "Publicando...";
    try{
      var creator = await upsertCreator();
      var img = await imageWithCap(c.img, 320, 180000);
      var postImg = await imageWithCap(c.img, 180, 60000);
      var ref = (c.pubMine && c.pubId) ? db.collection(C_CHAR).doc(c.pubId) : db.collection(C_CHAR).doc();
      var old = null;
      if(c.pubMine && c.pubId){
        try{ old = await ref.get(); }catch(e){ old = null; }
      }
      var base = {
        ownerUid: currentUid(),
        ownerName: creator.name,
        name: cut(name, 80),
        desc: cut($("pubdesc").value.trim(), 300),
        role: cut($("pubrole") ? $("pubrole").value.trim() : (c.role || ""), 80),
        gender: cut(c.gender || "Otro", 20),
        tags: cut($("pubtags").value.trim(), 120),
        persona: cut($("pubpersona").value.trim(), 5000),
        greeting: cut($("pubgreet").value.trim(), 2000),
        emoji: cut(c.emoji || "", 16),
        img: img,
        status: "published",
        updatedAt: Date.now()
      };
      if(old && old.exists){
        await ref.update(base);
      }else{
        base.likedBy = [];
        base.createdAt = Date.now();
        await ref.set(base);
      }
      c.pubId = ref.id;
      c.pubMine = true;
      c.pubOwner = currentUid();
      c.pubAt = Date.now();
      c.name = base.name;
      c.desc = base.desc;
      c.role = base.role;
      c.tags = base.tags;
      c.persona = base.persona;
      c.greeting = base.greeting;
      if(c.feedPostId){
        try{
          await db.collection(C_POST).doc(c.feedPostId).update({
            charName: base.name,
            charEmoji: base.emoji,
            charDesc: base.desc,
            charImg: postImg
          });
        }catch(e){}
      }else if(!old || !old.exists){
        try{
          var postRef = await db.collection(C_POST).add({
            authorUid: currentUid(),
            authorName: creator.name,
            text: cut("✨ " + base.name + " se sumó a la comunidad. " + (base.desc || ""), 600),
            charPubId: ref.id,
            charName: base.name,
            charEmoji: base.emoji,
            charImg: postImg,
            charDesc: base.desc,
            likedBy: [],
            status: "published",
            createdAt: Date.now()
          });
          c.feedPostId = postRef.id;
        }catch(e){}
      }
      save();
      if($("pubdlg").open) $("pubdlg").close();
      if(window.renderAll) window.renderAll();
      loadCommunity(true);
      alert(old && old.exists ? "Personaje actualizado en la comunidad." : "Personaje publicado en la comunidad.");
    }catch(e){
      alert("No se pudo publicar: " + friendlyFirestore(e));
    }
    b.disabled = false;
    b.textContent = c.pubMine ? "Actualizar" : "Publicar";
  }

  async function unpublish(pub){
    if(!realUser() || pub.ownerUid !== currentUid()) return;
    if(!confirm("¿Eliminar este personaje de la comunidad? Las copias que otras personas ya agregaron no se borran.")) return;
    try{
      await db.collection(C_CHAR).doc(pub.id).delete();
      var c = (st.custom || []).find(function(x){ return x.pubId === pub.id && x.pubMine; });
      if(c){
        if(c.feedPostId){
          try{ await db.collection(C_POST).doc(c.feedPostId).delete(); }catch(e){}
          delete c.feedPostId;
        }
        delete c.pubId;
        c.pubMine = false;
        c.pubOwner = "";
        save();
      }
      try{
        var q = await db.collection(C_POST).where("authorUid", "==", currentUid()).get();
        var removed = {};
        for(var i = 0; i < q.docs.length; i++){
          var pd = q.docs[i];
          if((pd.data() || {}).charPubId === pub.id){
            await db.collection(C_POST).doc(pd.id).delete();
            removed[pd.id] = true;
          }
        }
        if(Object.keys(removed).length){
          state.posts = state.posts.filter(function(x){ return !removed[x.id]; });
        }
      }catch(e){}
      state.chars = state.chars.filter(function(x){ return x.id !== pub.id; });
      if($("pubsheet").open) $("pubsheet").close();
      if(window.renderAll) window.renderAll();
      loadCommunity(true);
      alert("Personaje eliminado de la comunidad.");
    }catch(e){
      alert("No se pudo eliminar: " + friendlyFirestore(e));
    }
  }

  async function unpublishByLocal(customId){
    var c = findCustom(customId);
    if(!c || !c.pubMine || !c.pubId || !realUser()) return false;
    var pubId = c.pubId;
    try{
      await db.collection(C_CHAR).doc(pubId).delete();
      try{
        var q = await db.collection(C_POST).where("authorUid", "==", currentUid()).get();
        for(var i = 0; i < q.docs.length; i++){
          var pd = q.docs[i];
          if((pd.data() || {}).charPubId === pubId){
            await db.collection(C_POST).doc(pd.id).delete();
            state.posts = state.posts.filter(function(x){ return x.id !== pd.id; });
          }
        }
      }catch(e){}
      if(c.feedPostId){
        try{ await db.collection(C_POST).doc(c.feedPostId).delete(); }catch(e){}
        delete c.feedPostId;
      }
      delete c.pubId;
      c.pubMine = false;
      c.pubOwner = "";
      state.chars = state.chars.filter(function(x){ return x.id !== pubId; });
      save();
      if(window.renderAll) window.renderAll();
      return true;
    }catch(e){
      return false;
    }
  }

  async function openCreator(uid, name){
    if(!uid) return;
    var info = {name: name || "Creador", bio: "", photo: ""};
    try{
      var doc = await db.collection(C_CREATOR).doc(uid).get();
      if(doc.exists) info = Object.assign(info, doc.data() || {});
    }catch(e){}
    $("crtname").textContent = info.name || name || "Creador";
    $("crtbio").textContent = info.bio || "Sin bio por ahora.";
    setAvatar($("crtav"), info.name || name, info.photo || "", (info.name || name || "C").charAt(0));
    var list = $("crtchars");
    list.innerHTML = "";
    var chars = state.chars.filter(function(c){
      return c.ownerUid === uid && !isBlocked(c.ownerUid) && !isHidden("char:" + c.id);
    }).sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
    if(!chars.length){
      list.innerHTML = '<div class="empty">No hay personajes públicos cargados.</div>';
    }else{
      chars.forEach(function(pub){
        var row = document.createElement("div");
        row.className = "row";
        var a = document.createElement("div");
        a.className = "av square";
        setAvatar(a, pub.name, pub.img || "", pub.emoji || (pub.name || "?").charAt(0));
        var t = document.createElement("div");
        var b = document.createElement("b");
        b.textContent = pub.name || "Personaje";
        var s = document.createElement("small");
        s.textContent = (pub.likedBy || []).length + " me gusta";
        t.appendChild(b);
        t.appendChild(s);
        row.appendChild(a);
        row.appendChild(t);
        row.onclick = function(){
          if($("crtdlg").open) $("crtdlg").close();
          openPubSheet(pub);
        };
        list.appendChild(row);
      });
    }
    $("crtblock").style.display = uid === currentUid() ? "none" : "inline-block";
    $("crtblock").textContent = isBlocked(uid) ? "Desbloquear" : "Bloquear";
    $("crtblock").onclick = function(){
      if(isBlocked(uid)) removeBlock(uid);
      else addBlock(uid, info.name || name);
      if($("crtdlg").open) $("crtdlg").close();
      render();
    };
    if($("crtclose")) $("crtclose").onclick = function(){ $("crtdlg").close(); };
    if(!$("crtdlg").open) $("crtdlg").showModal();
  }

  async function openComments(post){
    if(!post || !$("cmdlg")) return;
    state.commentsPost = post;
    state.comments = [];
    state.commentsLoading = true;
    state.commentsSending = false;
    state.commentsError = "";
    $("cmtitle").textContent = "Comentarios de " + (post.authorName || "Creador");
    $("cmtext").value = "";
    renderComments();
    if(!$("cmdlg").open) $("cmdlg").showModal();
    try{
      var snap = await db.collection(C_POST).doc(post.id).collection("comments").orderBy("createdAt", "asc").limit(100).get();
      var loaded = snap.docs.map(function(d){
        var o = d.data() || {};
        o.id = d.id;
        return o;
      });
      var extras = state.comments.filter(function(c){
        return !loaded.some(function(x){ return x.id === c.id; });
      });
      state.comments = loaded.concat(extras);
    }catch(e){
      state.commentsError = friendlyFirestore(e);
    }
    state.commentsLoading = false;
    renderComments();
  }

  function renderComments(){
    if(!$("cmlist")) return;
    var list = $("cmlist");
    list.innerHTML = "";
    var ok = realUser();
    if($("cmgate")) $("cmgate").style.display = ok ? "none" : "block";
    if($("cmlogin")) $("cmlogin").style.display = ok ? "none" : "inline-block";
    if($("cmtext")) $("cmtext").disabled = !ok;
    if($("cmsend")) $("cmsend").disabled = !ok || state.commentsLoading || state.commentsSending;
    if(state.commentsLoading){
      list.innerHTML = '<div class="note">Cargando comentarios...</div>';
      return;
    }
    if(state.commentsError){
      var err = document.createElement("div");
      err.className = "note";
      err.textContent = state.commentsError;
      list.appendChild(err);
      return;
    }
    var comments = state.comments.filter(function(c){
      return !isHidden("comment:" + c.id) && !isBlocked(c.authorUid);
    }).sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); });
    if(!comments.length){
      list.innerHTML = '<div class="empty">Todavía no hay comentarios. Sé la primera persona.</div>';
      return;
    }
    var post = state.commentsPost;
    var uid = currentUid();
    comments.forEach(function(c){
      var row = document.createElement("div");
      row.className = "comment";
      var a = document.createElement("div");
      a.className = "av";
      setAvatar(a, c.authorName, "", (c.authorName || "?").charAt(0));
      var body = document.createElement("div");
      body.className = "commentbody";
      var head = document.createElement("div");
      head.className = "commenthead";
      var b = document.createElement("b");
      b.textContent = c.authorName || "Creador";
      var t = document.createElement("small");
      t.textContent = when(c.createdAt);
      head.appendChild(b);
      head.appendChild(t);
      var text = document.createElement("div");
      text.className = "commenttext";
      text.textContent = c.text || "";
      body.appendChild(head);
      body.appendChild(text);
      row.appendChild(a);
      row.appendChild(body);
      var tools = document.createElement("div");
      tools.className = "commenttools";
      if(c.authorUid !== uid){
        var rep = document.createElement("button");
        rep.type = "button";
        rep.className = "g";
        rep.textContent = "⚑";
        rep.title = "Reportar comentario";
        rep.onclick = function(){
          openReport("comment", c.id, c.authorUid, "Comentario de " + (c.authorName || "Creador"));
        };
        tools.appendChild(rep);
      }
      if(c.authorUid === uid || (post && post.authorUid === uid)){
        var del = document.createElement("button");
        del.type = "button";
        del.className = "g";
        del.textContent = "✕";
        del.title = "Eliminar comentario";
        del.onclick = function(){ deleteComment(c); };
        tools.appendChild(del);
      }
      if(tools.children.length) row.appendChild(tools);
      list.appendChild(row);
    });
  }

  async function sendComment(){
    if(!realUser()){ askAccount("Para comentar necesitás una cuenta."); return; }
    if(state.commentsLoading || state.commentsSending) return;
    var post = state.commentsPost;
    if(!post) return;
    var text = ($("cmtext").value || "").trim();
    if(!text){ alert("Escribí un comentario."); return; }
    var b = $("cmsend");
    state.commentsSending = true;
    b.disabled = true;
    b.textContent = "Enviando...";
    try{
      var payload = {
        authorUid: currentUid(),
        authorName: cut(creatorName(), 80) || "Creador",
        text: cut(text, 400),
        status: "published",
        createdAt: Date.now()
      };
      var ref = await db.collection(C_POST).doc(post.id).collection("comments").add(payload);
      payload.id = ref.id;
      if(!state.comments.some(function(x){ return x.id === payload.id; })) state.comments.push(payload);
      $("cmtext").value = "";
      renderComments();
    }catch(e){
      alert("No se pudo comentar: " + friendlyFirestore(e));
    }
    state.commentsSending = false;
    b.disabled = !realUser();
    b.textContent = "Comentar";
    renderComments();
  }

  async function deleteComment(comment){
    if(!realUser()) return;
    if(!confirm("¿Eliminar este comentario?")) return;
    try{
      await db.collection(C_POST).doc(state.commentsPost.id).collection("comments").doc(comment.id).delete();
      state.comments = state.comments.filter(function(x){ return x.id !== comment.id; });
      renderComments();
    }catch(e){
      alert("No se pudo eliminar el comentario: " + friendlyFirestore(e));
    }
  }

  function openReport(type, id, ownerUid, label){
    if(!realUser()){ askAccount("Para reportar contenido necesitás una cuenta."); return; }
    state.report = {type: type, id: id, ownerUid: ownerUid || "", label: label || "Contenido"};
    $("reptarget").textContent = "Vas a reportar: " + state.report.label;
    $("repreason").value = "";
    $("repdetail").value = "";
    if(!$("repdlg").open) $("repdlg").showModal();
  }

  async function sendReport(){
    var r = state.report;
    if(!r) return;
    var reason = $("repreason").value;
    if(!reason){ alert("Elegí un motivo para el reporte."); return; }
    var b = $("repsend");
    b.disabled = true;
    b.textContent = "Enviando...";
    try{
      await db.collection(C_REPORT).add({
        reporterUid: currentUid(),
        targetType: r.type,
        targetId: cut(r.id, 200),
        targetOwnerUid: cut(r.ownerUid, 200),
        reason: reason,
        details: cut($("repdetail").value.trim(), 1000),
        status: "open",
        createdAt: Date.now()
      });
      hideItem((r.type === "character" ? "char" : r.type) + ":" + r.id, r.label);
      if($("repdlg").open) $("repdlg").close();
      render();
      if(state.commentsPost) renderComments();
      alert("Gracias. Ocultamos el contenido para vos y lo vamos a revisar.");
    }catch(e){
      alert("No se pudo enviar el reporte: " + friendlyFirestore(e));
    }
    b.disabled = false;
    b.textContent = "Enviar reporte";
  }

  function renderBlocked(){
    var el = $("commBlocked");
    if(!el) return;
    el.innerHTML = "";
    var blocks = blockedList();
    var hidden = hiddenList();
    if(!blocks.length && !hidden.length) return;
    var wrap = document.createElement("div");
    wrap.className = "commblocked";
    var h = document.createElement("h2");
    h.textContent = "Bloqueados y ocultos";
    wrap.appendChild(h);
    var note = document.createElement("div");
    note.className = "note";
    note.textContent = "Se guarda solo en este dispositivo.";
    wrap.appendChild(note);
    blocks.forEach(function(b){
      var uid = typeof b === "string" ? b : b.uid;
      var name = typeof b === "string" ? "Creador" : (b.name || "Creador");
      var row = document.createElement("div");
      row.className = "row";
      var t = document.createElement("div");
      var bb = document.createElement("b");
      bb.textContent = name;
      var s = document.createElement("small");
      s.textContent = "Creador bloqueado";
      t.appendChild(bb);
      t.appendChild(s);
      row.appendChild(t);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "g";
      btn.textContent = "Desbloquear";
      btn.onclick = function(){ removeBlock(uid); render(); };
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    hidden.forEach(function(x){
      var key = hiddenKey(x);
      if(!key) return;
      var row = document.createElement("div");
      row.className = "row";
      var t = document.createElement("div");
      var bb = document.createElement("b");
      bb.textContent = (x && x.label) || "Contenido oculto";
      var s = document.createElement("small");
      s.textContent = "Oculto por un reporte";
      t.appendChild(bb);
      t.appendChild(s);
      row.appendChild(t);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "g";
      btn.textContent = "Mostrar";
      btn.onclick = function(){ unhideItem(key); render(); };
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    el.appendChild(wrap);
  }

  function sendPost(){
    if(!realUser()){ askAccount("Para publicar en la comunidad necesitás una cuenta."); return; }
    var text = ($("commPostText").value || "").trim();
    if(!text){ alert("Escribí algo para publicar."); return; }
    var c = findCustom($("commPostChar") ? $("commPostChar").value : "");
    var b = $("commPostSend");
    b.disabled = true;
    b.textContent = "Publicando...";
    (async function(){
      try{
        var creator = await upsertCreator();
        var charData = {charPubId: "", charName: "", charEmoji: "", charImg: "", charDesc: ""};
        if(c){
          charData.charName = cut(c.name, 80);
          charData.charEmoji = cut(c.emoji || "", 16);
          charData.charDesc = cut(c.desc || "", 300);
          charData.charImg = await imageWithCap(c.img, 160, 50000);
          if(c.pubMine && c.pubId) charData.charPubId = c.pubId;
        }
        var payload = {
          authorUid: currentUid(),
          authorName: cut(creator.name, 80) || "Creador",
          text: cut(text, 600),
          charPubId: charData.charPubId,
          charName: charData.charName,
          charEmoji: charData.charEmoji,
          charImg: charData.charImg,
          charDesc: charData.charDesc,
          likedBy: [],
          status: "published",
          createdAt: Date.now()
        };
        var ref = await db.collection(C_POST).add(payload);
        payload.id = ref.id;
        state.posts.unshift(payload);
        $("commPostText").value = "";
        renderPosts();
      }catch(e){
        alert("No se pudo publicar: " + friendlyFirestore(e));
      }
      b.disabled = !realUser();
      b.textContent = "Publicar";
    })();
  }

  function init(){
    var tabs = document.querySelectorAll("#commTabs [data-ctab]");
    tabs.forEach(function(t){
      t.onclick = function(){
        state.tab = t.dataset.ctab;
        render();
      };
    });
    if($("commQ")) $("commQ").oninput = function(){
      state.q = this.value;
      if(state.tab === "chars") renderChars();
      else renderPosts();
    };
    if($("commRefresh")) $("commRefresh").onclick = function(){ loadCommunity(true); };
    if($("commPublish")) $("commPublish").onclick = function(){ publish(st.cur); };
    if($("commPostSend")) $("commPostSend").onclick = sendPost;
    if($("commLogin")) $("commLogin").onclick = goAccount;
    if($("pubchar")) $("pubchar").onchange = fillPubFields;
    if($("pubcancel")) $("pubcancel").onclick = function(){ $("pubdlg").close(); };
    if($("pubsend")) $("pubsend").onclick = publishCurrent;
    if($("cmlogin")) $("cmlogin").onclick = goAccount;
    if($("cmsend")) $("cmsend").onclick = sendComment;
    if($("cmclose")) $("cmclose").onclick = function(){ $("cmdlg").close(); };
    if($("repcancel")) $("repcancel").onclick = function(){ $("repdlg").close(); };
    if($("repsend")) $("repsend").onclick = sendReport;
    if($("creatorSave")) $("creatorSave").onclick = async function(){
      if(!realUser()){ askAccount("Para tener perfil de creador necesitás una cuenta."); return; }
      var b = this;
      b.disabled = true;
      b.textContent = "Guardando...";
      try{
        await upsertCreator();
        renderCreatorBox();
        alert("Perfil público actualizado.");
      }catch(e){
        alert("No se pudo guardar el perfil: " + friendlyFirestore(e));
      }
      b.disabled = !realUser();
      b.textContent = "Publicar perfil público";
    };
    if($("creatorView")) $("creatorView").onclick = function(){
      if(!realUser()){ askAccount("Para ver tu perfil de creador necesitás una cuenta."); return; }
      openCreator(currentUid(), creatorName());
    };

    if(auth && auth.onAuthStateChanged){
      auth.onAuthStateChanged(function(){
        render();
        if(!state.loaded && !state.loading) loadCommunity();
      });
    }
    render();
    loadCommunity();
  }

  window.NubbiCommunity = {
    render: render,
    renderCreator: renderCreatorBox,
    publish: publish,
    unpublishByLocal: unpublishByLocal,
    openCreator: openCreator,
    openPubSheet: openPubSheet,
    importPub: importPub,
    load: loadCommunity,
    isRealUser: realUser,
    open: function(){
      var nav = document.querySelector('nav>div[data-v="community"]');
      if(nav) nav.click();
    }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
