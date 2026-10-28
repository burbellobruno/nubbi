// Non-destructive browser smoke. Fresh guest contexts; no login, messages or remote writes.
// The adult gate is acknowledged only in the disposable browser storage. Welcome sound
// is disabled locally; the actual welcome animation is allowed to complete.
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const url=new URL(process.env.NUBBI_TEST_URL||'http://127.0.0.1:43840/');
if(!['127.0.0.1','localhost','nubbi.onrender.com'].includes(url.hostname)||url.pathname!=='/'||url.search||url.username||url.password)throw Error('Only the local or Nubbi production root is allowed');
if(url.hostname==='nubbi.onrender.com'&&url.protocol!=='https:')throw Error('Production requires HTTPS');
const local=url.hostname!=='nubbi.onrender.com';
const output=process.env.NUBBI_REVIEW_OUTPUT||path.join(__dirname,'../review/smoke');fs.mkdirSync(output,{recursive:true});
const report={origin:url.origin,mode:local?'local':'production',syntheticGuest:true,health:[],widths:[],offline:null};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.NUBBI_BROWSER_PATH});
 try{
  // Both handlers were inspected: health reads configuration, image health performs
  // provider GET verification/options only. Neither generates content or writes data.
  const api=await browser.newContext();
  for(const endpoint of ['/api/health','/api/image/health']){
   const response=await api.request.get(new URL(endpoint,url).href,{timeout:60000});
   const body=await response.json();
   report.health.push({endpoint,status:response.status(),ok:body.ok===true,provider:body.provider||null});
   assert.equal(typeof body.ok,'boolean','health response must be structured');
   // Local intentionally runs without provider credentials. Production failures are
   // preserved in the report and fail the smoke after browser evidence is captured.
  }
  await api.close();
  for(const width of [1440,1024,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
   const blocked=[];
   await context.route('**/*',route=>{
    const req=route.request();
    if(!['GET','HEAD','OPTIONS'].includes(req.method())){blocked.push({method:req.method(),host:new URL(req.url()).hostname});return route.abort('blockedbyclient');}
    return route.continue();
   });
   await context.addInitScript(()=>{
    localStorage.setItem('nubbi-adult-ok','1');localStorage.setItem('nubbi-intro-audio','off');
    window.__smokeCsp=[];document.addEventListener('securitypolicyviolation',e=>window.__smokeCsp.push({directive:e.violatedDirective,blocked:e.blockedURI}));
   });
   const page=await context.newPage(),errors=[],assets=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{const u=new URL(r.url());if(u.origin===url.origin&&/\.(?:js|css|webm|wav)$/.test(u.pathname))assets.push({path:u.pathname,status:r.status()});});
   const response=await page.goto(url.href,{waitUntil:'load',timeout:90000});assert.equal(response.status(),200);
   assert.ok(response.headers()['content-security-policy'],'CSP header missing');
   await page.waitForFunction(()=>window.NubbiApp&&window.st,{},{timeout:20000});
   await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});
   const check=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);
   await check();await page.screenshot({animations:'disabled',path:path.join(output,'home-'+width+'.png')});
   await page.locator('#grid').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(output,'catalog-'+width+'.png')});
   await page.evaluate(()=>NubbiApp.go('settings'));await check();
   await page.locator('#ptheme').selectOption('light');await page.waitForTimeout(250);
   await page.screenshot({animations:'disabled',path:path.join(output,'profile-light-'+width+'.png')});
   await page.locator('#ptheme').selectOption('dark');
   await page.evaluate(()=>NubbiOpenChat('p0'));await page.waitForSelector('#chat.open');await check();
   assert.ok(await page.locator('#inp').isVisible());
   await page.screenshot({animations:'disabled',path:path.join(output,'chat-'+width+'.png')});
   await page.locator('#back').click();
   assert.deepEqual(errors,[],'page errors');
   const csp=await page.evaluate(()=>window.__smokeCsp);assert.deepEqual(csp,[],'CSP violations');
   assert.ok(assets.length>0);assert.deepEqual(assets.filter(a=>a.status>=400),[],'failed shell assets');
   const principal=await page.evaluate(()=>window.NubbiAccountStore?.principal);
   assert.equal(principal,'guest','smoke must remain a guest');
   report.widths.push({width,pageErrors:errors,cspViolations:csp,failedAssets:[],blockedWrites:blocked.length,principal});
   await context.close();console.log('PASS browser smoke '+width);
  }
  if(local){
   // Keep the actual worker enabled; guard all network writes in a fresh guest.
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
   await context.addInitScript(()=>{localStorage.setItem('nubbi-adult-ok','1');localStorage.setItem('nubbi-intro-audio','off');});
   // Block SDK telemetry or any other background write in this disposable guest.
   const blockedWrites=[];
   await context.route('**/*',route=>{const r=route.request();if(!['GET','HEAD','OPTIONS'].includes(r.method())){blockedWrites.push(r.method());return route.abort('blockedbyclient');}return route.continue();});
   const page=await context.newPage();await page.goto(url.href,{waitUntil:'load'});
   await page.evaluate(()=>Promise.race([
    (async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));})(),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker did not activate')),60000))
   ]));
   const entries=await page.evaluate(async()=>{const cache=await caches.open('nubbi-v43');return(await cache.keys()).map(r=>new URL(r.url).pathname);});
   report.offline={cache:'nubbi-v43',entries};
   for(const asset of ['/index.html','/app.js','/fantasy.css','/fantasy-hero.png','/fantasy-portraits.png','/immersive.css','/immersive.js','/story-engine.js','/social-auth.js'])assert.ok(entries.includes(asset),'missing cached '+asset+' in '+JSON.stringify(entries));
   assert.ok(entries.every(p=>!p.startsWith('/api/')&&!/firebase|account.*json/i.test(p)),'private cache entry');
   await context.setOffline(true);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.reload({waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
   await page.waitForFunction(()=>window.NubbiApp&&window.NubbiStory&&document.documentElement.dataset.nbImmersive==='1',{},{timeout:15000});
   await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});
   assert.ok(await page.locator('#grid .card').count()>0);
   assert.equal(await page.locator('#v-home .hero').evaluate(el=>getComputedStyle(el).borderRadius),'24px');
   assert.deepEqual(errors,[]);await page.screenshot({animations:'disabled',path:path.join(output,'offline-390.png')});
   report.offline={cache:'nubbi-v43',entries:entries.length,reloadStatus:200,pageErrors:errors,blockedWrites:blockedWrites.length};await context.close();console.log('PASS real service-worker install and offline reload v43');
  }
  if(!local)assert.ok(report.health.every(h=>h.status===200&&h.ok),'Production health endpoint failed; see smoke-report.json');
 }finally{fs.writeFileSync(path.join(output,'smoke-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

