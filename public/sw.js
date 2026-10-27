/* Only Nubbi's public, credential-free application shell belongs in Cache Storage. */
var C="nubbi-v40",SHELL=["./","index.html","style.css","ui-v2.css","experience.css","fantasy.css","immersive.css","immersive.js","story-engine.js","social-auth.css","social-auth.js","fantasy-hero.png","fantasy-portraits.png","account-store.css","account-store.js","account-bootstrap.js","ai-client.js","app.js","community.js","ui-v2.js","experience.js","nubbi-intro.webm","nubbi-intro-soft.wav","catalog.js","logo.png","favicon.png","icon-192.png","icon-512.png","manifest.webmanifest"];
var BASE=new URL(self.registration.scope),PUBLIC_URLS=new Set(SHELL.map(function(file){return new URL(file,BASE).href;}));
function browserAssetRequest(request,url){
 if(request.mode!=="no-cors"&&request.mode!=="cors")return false;
 var expected=/\.js$/.test(url.pathname)?"script":/\.css$/.test(url.pathname)?"style":/\.png$/.test(url.pathname)?"image":/\.wav$/.test(url.pathname)?"audio":/\.webm$/.test(url.pathname)?"video":/\.webmanifest$/.test(url.pathname)?"manifest":"";
 return !!expected&&request.destination===expected;
}
function publicRequest(request){
 var url=new URL(request.url),navigation=request.mode==="navigate";
 return request.method==="GET"&&url.origin===BASE.origin&&!url.search&&!url.username&&!url.password&&PUBLIC_URLS.has(url.href)
  &&!request.headers.has("authorization")&&!request.headers.has("proxy-authorization")&&!request.headers.has("cookie")&&!request.headers.has("range")
  &&!/(?:^|,)\s*(?:no-store|no-cache)\b/i.test(request.headers.get("cache-control")||"")&&request.cache!=="no-store"&&(request.credentials!=="include"||navigation&&(url.href===BASE.href||url.href===new URL("index.html",BASE).href)||browserAssetRequest(request,url));
}
function publicResponse(response,url){
 if(!response||!response.ok||response.status!==200||response.redirected||!/^basic$|^default$/.test(response.type))return false;
 if(response.url&&response.url!==url)return false;
 var control=response.headers.get("cache-control")||"",vary=response.headers.get("vary")||"";
 if(/(?:^|,)\s*(?:private|no-store|no-cache|must-revalidate|proxy-revalidate)\b/i.test(control)||/(?:^|,)\s*(?:\*|cookie|authorization|proxy-authorization)\s*(?:,|$)/i.test(vary)||response.headers.has("set-cookie"))return false;
 var type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase(),pathname=new URL(url).pathname;
 if(/\.js$/.test(pathname))return /^(?:application|text)\/(?:x-)?javascript$/.test(type);
 if(/\.css$/.test(pathname))return type==="text/css";
 if(/\.png$/.test(pathname))return type==="image/png";
 if(/\.webm$/.test(pathname))return type==="video/webm";
 if(/\.wav$/.test(pathname))return /^audio\/(?:x-)?wav(?:e)?$/.test(type);
 if(/\.webmanifest$/.test(pathname))return /^(?:application\/manifest\+json|application\/json)$/.test(type);
 return type==="text/html";
}
function shellFetch(url){
 // Never forward the page's cookies, authorization or user-specific request headers.
 return fetch(new Request(url,{method:"GET",credentials:"omit",cache:"no-store",redirect:"error"}));
}
function offlineUnavailable(){return new Response("Sin conexión. Este recurso no está disponible sin conexión.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});}
self.addEventListener("install",function(event){
 event.waitUntil(caches.open(C).then(function(cache){return Promise.all(Array.from(PUBLIC_URLS).map(async function(url){
  var response=await shellFetch(url);if(!publicResponse(response,url))throw new Error("Nubbi shell response is not safe to cache.");await cache.put(url,response);
 }));}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(event){
 event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(name){return name.indexOf("nubbi-")===0&&name!==C;}).map(function(name){return caches.delete(name);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(event){
 if(!publicRequest(event.request))return;
 var url=new URL(event.request.url).href;
 var operation=(async function(){
  try{
   var response=await shellFetch(url);
   try{var cache=await caches.open(C);if(publicResponse(response,url))await cache.put(url,response.clone());else await cache.delete(url);}catch(error){/* Cache failures must not hide a successful network response. */}
   return response;
  }catch(error){
   try{var active=await caches.open(C),cached=await active.match(url);if(publicResponse(cached,url))return cached;if(cached)await active.delete(url);}catch(cacheError){}
   return offlineUnavailable();
  }
 })();
 event.respondWith(operation);
 // Hold the worker alive until its cache write finishes, including slow storage.
 event.waitUntil(operation.then(function(){},function(){}));
});
