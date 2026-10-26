/* Wait for Firebase auth hydration before loading modules that can read personal state. */
(function (root) {
  'use strict';
  var store = root.NubbiAccountStore;
  var notice = root.document.getElementById('nb-account-loading');
  var started = false;
  var transitioning = false;
  function status(message) { if (notice) notice.textContent = message; }
  function showError(error) {
    store.lock();
    status('No se pudieron cargar tus datos de forma segura. No se borró ningún respaldo. ' +
      (error && error.message ? error.message : 'Recargá la página para reintentar.'));
    if (notice) {
      ['current', 'legacy'].forEach(function (source) {
        var button = root.document.createElement('button');
        button.textContent = source === 'legacy' ? 'Exportar datos anteriores sin modificar' : 'Exportar datos locales sin modificar';
        button.onclick = function () {
          try {
            var raw = store.exportRaw(source);
            if (raw === null) { root.alert('No hay datos en ese espacio.'); return; }
            var link = root.document.createElement('a');
            link.href = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
            link.download = 'nubbi-recovery-' + source + '.json';link.click();URL.revokeObjectURL(link.href);
          } catch (failure) { root.alert(failure.message); }
        };
        notice.appendChild(button);
      });
    }
  }
  function transition() {
    if (transitioning) return;
    transitioning = true;
    store.lock();
    status('Cambiando de cuenta de forma segura…');
    // Reload destroys old app closures and pending asynchronous chat/image callbacks.
    root.location.reload();
  }
  function include(src) {
    return new Promise(function (resolve, reject) {
      var script = root.document.createElement('script');
      script.src = src;
      script.onload = function () {
        if (src === 'app.js' && !root.NubbiApp) reject(new Error('El estado de Nubbi no pudo inicializarse.'));
        else resolve();
      };
      script.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      root.document.body.appendChild(script);
    });
  }
  function boot(user) {
    try { store.activate(user); }
    catch (error) { showError(error); return; }
    var scripts = ['app.js', 'community.js', 'ui-v2.js', 'experience.js'];
    scripts.reduce(function (chain, src) {
      return chain.then(function () {
        if (store.locked) throw new Error('La sesión cambió durante la carga.');
        return include(src);
      });
    }, Promise.resolve()).then(function () {
      if (store.locked) return;
      root.document.documentElement.setAttribute('data-nb-account-ready', '1');
      status('');
    }).catch(function (error) { if (!transitioning) showError(error); });
  }
  var auth = root.cloudSync && root.firebase && root.firebase.auth ? root.firebase.auth() : null;
  if (!auth) { started = true; boot(null); return; }
  auth.onAuthStateChanged(function (user) {
    if (!started) { started = true; boot(user); return; }
    try {
      if (store.principal !== store.principalFor(user)) transition();
    } catch (error) { showError(error); }
  }, showError);
})(window);
