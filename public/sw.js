var C="nubbi-v10",SHELL=["./","index.html","style.css","ui-v2.css","app.js","community.js","ui-v2.js","catalog.js","logo.png","manifest.webmanifest"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(SHELL)}));self.skipWaiting();});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}));self.clients.claim();});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET"||new URL(r.url).pathname.indexOf("/api/")===0)return;
e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});return res;}).catch(function(){return caches.match(r)}));});
