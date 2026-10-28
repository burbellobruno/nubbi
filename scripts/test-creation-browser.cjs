// Synthetic model catalogue and popup cancellation; no real authentication or generation.
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.NUBBI_TEST_URL||'http://127.0.0.1:43983';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Loopback only');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.NUBBI_BROWSER_PATH});try{
 for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==new URL(url).origin)return route.abort();if(u.pathname==='/api/image/models')return route.fulfill({json:{defaultProvider:'cloudflare',providers:{cloudflare:{available:true,model:'@cf/black-forest-labs/flux-1-schnell',models:[{title:'@cf/black-forest-labs/flux-1-schnell',name:'FLUX'},{title:'@cf/leonardo/lucid-origin',name:'Lucid',consumption:'alto'}]},forge:{available:false,models:[]},huggingface:{available:false}}}});if(!['GET','HEAD','OPTIONS'].includes(r.method()))throw Error('Unexpected network write');return route.continue();});
 await context.addInitScript(()=>localStorage.setItem('nubbi-adult-ok','1'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.NubbiApp&&document.documentElement.dataset.nbImmersive==='1');await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});
 await page.locator('#heroNew').click();await page.waitForFunction(()=>document.querySelector('#sdm').value==='auto');
 await page.locator('#n').fill('Iria');await page.locator('#d').fill('Cartógrafa, 18 años');await page.evaluate(()=>document.querySelector('#wzAuto').checked=false);await page.locator('#wzNext').click();await page.waitForFunction(()=>document.querySelector('#dlg').dataset.step==='2');
 assert.equal(await page.locator('#sty option').count(),10);
 for(const style of ['anime','webtoon','manhwa','manga','bl','realista','3d','semi-realista','furry','pintura digital']){await page.locator('#sty').selectOption(style);assert.match(await page.locator('#imageEngineNote').textContent(),style==='realista'?/FLUX/:/Lucid/);assert.equal(await page.locator('#sdm').inputValue(),'auto');}
 await page.locator('#sdm').selectOption('@cf/black-forest-labs/flux-1-schnell');await page.evaluate(()=>document.querySelector('#dlg').close());await page.locator('#heroNew').click();await page.waitForFunction(()=>document.querySelector('#sdm').value==='@cf/black-forest-labs/flux-1-schnell');
 await page.evaluate(()=>document.querySelector('#dlg').close());await page.evaluate(()=>NubbiApp.go('settings'));
 assert.equal(await page.locator('[data-provider=google]').isEnabled(),true);assert.equal(await page.locator('[data-provider=facebook]').isDisabled(),true);assert.equal(await page.locator('[data-provider=twitter]').isDisabled(),true);
 await page.evaluate(()=>{window.testSocialCalls=[];window.cloudSync={currentUser:()=>null,isAnonymous:()=>true,friendly:()=> 'Se canceló el acceso. Tus datos locales siguen intactos.',signInSocial:async id=>{window.testSocialCalls.push(id);throw Object.assign(Error('cancel'),{code:'auth/popup-closed-by-user'});}};NubbiApp.renderAll();});
 const before=await page.evaluate(()=>localStorage.getItem('nubbi:state:v2:guest'));await page.locator('[data-provider=google]').click();await page.waitForFunction(()=>document.querySelector('#socialAccessStatus').textContent.includes('Se canceló'));
 assert.deepEqual(await page.evaluate(()=>window.testSocialCalls),['google']);assert.equal(await page.locator('[data-provider=google]').isEnabled(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('nubbi:state:v2:guest')),before);
 assert.equal(await page.evaluate(()=>NubbiAccountStore.principal),'guest');assert.deepEqual(errors,[]);await context.close();console.log('PASS creation '+width+': ten styles, automatic model, explicit preference retained, social availability/cancellation, guest unchanged');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
