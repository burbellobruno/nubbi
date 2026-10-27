/* Nubbi P1: account-scoped browser state. No implicit legacy migration or deletion. */
(function (root) {
  'use strict';
  var PREFIX = 'nubbi:state:v2:';
  var LEGACY = 'nubbi-v1';
  var principal = null;
  var enabled = false;
  var backupSequence = 0;

  function fail(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }
  function identity(user) {
    if (!user || user.isAnonymous) return 'guest';
    var uid = String(user.uid || '');
    if (!uid || uid.length > 128) {
      throw fail('account/invalid-uid', 'La cuenta tiene un identificador no admitido.');
    }
    return 'user:' + encodeURIComponent(uid);
  }
  function keyFor(name) { return PREFIX + name; }
  function currentAuth() {
    return root.cloudSync && typeof root.cloudSync.currentUser === 'function'
      ? root.cloudSync.currentUser() : null;
  }
  function assertActive() {
    if (!enabled || principal === null) throw fail('account/locked', 'La sesión todavía no está lista.');
    if (identity(currentAuth()) !== principal) {
      lock();
      throw fail('account/session-changed', 'Cambió la cuenta. Recargá la página antes de guardar datos.');
    }
    return principal;
  }
  function validate(raw) {
    if (typeof raw !== 'string') throw fail('account/bad-data', 'El respaldo no tiene formato JSON.');
    var data;
    try { data = JSON.parse(raw); }
    catch (error) { throw fail('account/bad-data', 'El respaldo contiene JSON inválido.'); }
    function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
    if (!record(data)) throw fail('account/bad-data', 'El respaldo debe ser un objeto.');
    function safe(value, depth) {
      if (depth > 50) throw fail('account/bad-data', 'El respaldo tiene demasiados niveles.');
      if (!value || typeof value !== 'object') return;
      for (var key of Object.keys(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw fail('account/bad-data', 'El respaldo contiene campos no permitidos.');
        }
        safe(value[key], depth + 1);
      }
    }
    safe(data, 0);
    for (var list of ['custom', 'favs', 'personas']) {
      if (Object.prototype.hasOwnProperty.call(data, list) && !Array.isArray(data[list])) {
        throw fail('account/bad-data', 'Una lista del respaldo es inválida: ' + list);
      }
    }
    for (var section of ['chats', 'cfg', 'branches', 'prof']) {
      if (Object.prototype.hasOwnProperty.call(data, section) && !record(data[section])) {
        throw fail('account/bad-data', 'Una sección del respaldo es inválida: ' + section);
      }
    }
    for (var objects of ['custom', 'personas']) {
      if (data[objects] && data[objects].some(function (item) { return !record(item); })) {
        throw fail('account/bad-data', 'El respaldo contiene elementos inválidos.');
      }
    }
    if (data.favs && data.favs.some(function (item) { return typeof item !== 'string'; })) {
      throw fail('account/bad-data', 'La lista de favoritos es inválida.');
    }
    for (var group of ['chats', 'branches']) {
      if (data[group]) for (var id of Object.keys(data[group])) {
        if (!Array.isArray(data[group][id]) || data[group][id].some(function (item) { return !record(item); })) {
          throw fail('account/bad-data', 'El respaldo contiene una conversación inválida.');
        }
      }
    }
    if (data.cfg) for (var configId of Object.keys(data.cfg)) {
      if (!record(data.cfg[configId])) throw fail('account/bad-data', 'La configuración del respaldo es inválida.');
    }
    for (var selection of ['persona', 'cur']) {
      if (Object.prototype.hasOwnProperty.call(data, selection) && data[selection] !== null && typeof data[selection] !== 'string') {
        throw fail('account/bad-data', 'Una selección del respaldo es inválida.');
      }
    }
    // Validate known renderer inputs without stripping unknown legacy fields.
    function bad(path) { throw fail('account/bad-data', 'Campo inválido en el respaldo: ' + path); }
    function strings(value, fields, path) {
      fields.forEach(function (field) {
        if (value[field] != null && typeof value[field] !== 'string') bad(path + '.' + field);
      });
    }
    function messages(items, path) {
      if (!Array.isArray(items)) bad(path);
      items.forEach(function (message, i) {
        var at = path + '[' + i + ']';
        if (!record(message)) bad(at);
        strings(message, ['role', 'image', 'emo'], at);
        // Legacy image messages can omit their caption; text messages cannot.
        if (!(message.role === 'image' && !Object.prototype.hasOwnProperty.call(message, 'content')) &&
            typeof message.content !== 'string') bad(at + '.content');
      });
    }
    function config(value, path) {
      if (!record(value)) bad(path);
      strings(value, ['memory', 'scenario', 'userRole', 'instructions', 'goal', 'secret', 'arc', 'bg', 'bubble', 'voiceURI', 'visualProfile', 'imageStyle'], path);
      ['memoryNotes', 'autoMem'].forEach(function (field) {
        if (value[field] == null) return;
        if (!Array.isArray(value[field])) bad(path + '.' + field);
        value[field].forEach(function (note) {
          if (!record(note) || typeof note.text !== 'string') bad(path + '.' + field);
        });
      });
      if (value.relation != null && !record(value.relation)) bad(path + '.relation');
    }
    (data.custom || []).forEach(function (c) {
      strings(c, ['id', 'name', 'desc', 'role', 'gender', 'tags', 'persona', 'greeting', 'img', 'image', 'emoji', 'imagePrompt', 'imageStyle'], 'custom');
    });
    (data.personas || []).forEach(function (p) {
      strings(p, ['id', 'name', 'bio', 'pronouns', 'appearance', 'relation', 'img'], 'personas');
    });
    if (data.prof) {
      strings(data.prof, ['name', 'bio', 'img', 'lang', 'theme', 'accent', 'model', 'imgProvider'], 'prof');
      if (data.prof.voice != null && !record(data.prof.voice)) bad('prof.voice');
    }
    Object.keys(data.chats || {}).forEach(function (id) { messages(data.chats[id], 'chats.' + id); });
    Object.keys(data.cfg || {}).forEach(function (id) { config(data.cfg[id], 'cfg.' + id); });
    Object.keys(data.branches || {}).forEach(function (id) {
      data.branches[id].forEach(function (branch) {
        strings(branch, ['id', 'name'], 'branches.' + id);
        if (branch.messages !== undefined) messages(branch.messages, 'branches.' + id + '.messages');
        if (branch.cfg !== undefined) config(branch.cfg, 'branches.' + id + '.cfg');
      });
    });
    return data;
  }
  function storage() {
    try { return root.localStorage; }
    catch (error) { throw fail('account/storage', 'El almacenamiento del navegador no está disponible.'); }
  }
  function readKey(key) {
    try { return storage().getItem(key); }
    catch (error) { throw fail('account/storage', 'No se pueden leer los datos locales.'); }
  }
  function putKey(key, value) {
    try { storage().setItem(key, value); }
    catch (error) { throw fail('account/storage', 'No hay espacio o acceso para guardar el respaldo. No se reemplazaron los datos anteriores.'); }
  }
  function lock() {
    enabled = false;
    root.document.documentElement.removeAttribute('data-nb-account-ready');
    if (root.speechSynthesis) root.speechSynthesis.cancel();
  }
  function activate(user) {
    if (principal !== null) throw fail('account/reinitialize', 'La sesión ya fue inicializada.');
    var id = identity(user);
    // Authentication hydration is complete before state can be accessed.
    if (id !== identity(currentAuth())) throw fail('account/session-changed', 'La sesión cambió durante la carga.');
    principal = id;
    enabled = true;
    return id;
  }
  function sourceKey(source) {
    if (source === 'legacy') return readKey(LEGACY) !== null ? LEGACY : 'mochi-chat-v3';
    if (source === 'guest') return keyFor('guest');
    throw fail('account/bad-source', 'Origen de importación desconocido.');
  }
  function replace(raw, reason) {
    var id = assertActive();
    var data = validate(raw);
    var serialized = JSON.stringify(data);
    var target = keyFor(id);
    var before = readKey(target);
    if (before === serialized) return data;
    // A recovery copy is mandatory when replacing an existing snapshot.
    // If there is insufficient room for that copy, abort without touching target.
    if (before !== null) {
      var recoveryKey;
      do { recoveryKey = PREFIX + 'recovery:' + id + ':' + Date.now() + ':' + (++backupSequence); }
      while (readKey(recoveryKey) !== null);
      putKey(recoveryKey, before);
    }
    assertActive();
    putKey(target, serialized);
    return data;
  }
  root.NubbiAccountStore = {
    principalFor: identity,
    activate: activate,
    lock: lock,
    get principal() { return principal; },
    get locked() { return !enabled; },
    key: function () { return keyFor(assertActive()); },
    keyFor: keyFor,
    // Recovery exports raw bytes even when an active snapshot is malformed.
    // It never reads another authenticated account's namespace.
    exportRaw: function (source) {
      var id = identity(currentAuth());
      if (principal !== null && principal !== id) throw fail('account/session-changed', 'Recargá antes de recuperar datos.');
      return readKey(source === 'legacy' ? sourceKey('legacy') : keyFor(id));
    },
    assertActive: assertActive,
    assertUser: function (user) {
      if (assertActive() !== identity(user)) throw fail('account/session-changed', 'No se pueden mezclar datos de diferentes cuentas.');
    },
    validate: validate,
    read: function () {
      var raw = readKey(keyFor(assertActive()));
      return raw === null ? null : validate(raw);
    },
    write: function (snapshot) {
      var target = keyFor(assertActive());
      var raw = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
      validate(raw);
      assertActive();
      putKey(target, raw);
    },
    replace: replace,
    listRecoveries: function () {
      var prefix = PREFIX + 'recovery:' + assertActive() + ':';
      var store = storage(), results = [];
      try {
        for (var i = 0; i < store.length; i++) {
          var key = store.key(i);
          if (key && key.indexOf(prefix) === 0) results.push(key);
        }
      } catch (error) { throw fail('account/storage', 'No se pueden revisar los respaldos de recuperación.'); }
      return results.sort(function (a, b) {
        var x = a.slice(prefix.length).split(':').map(Number);
        var y = b.slice(prefix.length).split(':').map(Number);
        return y[0] - x[0] || y[1] - x[1];
      });
    },
    restoreRecovery: function (recoveryKey) {
      if (this.listRecoveries().indexOf(recoveryKey) < 0) {
        throw fail('account/bad-source', 'Ese respaldo no pertenece a la cuenta activa.');
      }
      var raw = readKey(recoveryKey);
      if (raw === null) throw fail('account/no-source', 'La copia ya no está disponible.');
      return replace(raw, 'recovery');
    },
    hasSource: function (source) {
      var target = keyFor(assertActive());
      var from = sourceKey(source);
      return from !== target && readKey(from) !== null;
    },
    importSource: function (source) {
      assertActive();
      var from = sourceKey(source);
      if (from === keyFor(principal)) throw fail('account/self-import', 'No se puede importar el espacio activo.');
      var raw = readKey(from);
      if (raw === null) throw fail('account/no-source', 'No existe ese respaldo en este navegador.');
      return replace(raw, source);
    }
  };
})(window);
