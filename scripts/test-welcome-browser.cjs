// Run against a local server only; dependencies are supplied by the test environment.
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.NUBBI_TEST_URL||'http://127.0.0.1:43828';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Local test server required');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.NUBBI_BROWSER_PATH?{executablePath:process.env.NUBBI_BROWSER_PATH}:{})});
 try{for(const mobile of [false,true])for(const mode of ['normal','blocked','reduced']){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
   await context.addInitScript(({mode})=>{
    if(!sessionStorage.getItem('test-seeded')){
     localStorage.setItem('nubbi-adult-ok','1');localStorage.setItem('nubbi-intro-motion','off');
     localStorage.setItem('nubbi-intro-audio','off');localStorage.setItem('nubbi-anim','off');
     localStorage.setItem('preserve-sentinel','unchanged');sessionStorage.setItem('test-seeded','1');
    }
    window.testMedia={video:0,audio:0};const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){window.testMedia[this.tagName==='VIDEO'?'video':'audio']++;
     if(mode==='blocked'&&this.tagName==='VIDEO')return Promise.reject(new Error('Simulated autoplay denial'));
     return original.call(this);
    };
   },{mode});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(let load=0;load<2;load++){
    if(load)await page.reload();else await page.goto(url);
    await page.waitForSelector('#nb-intro[open]');
    await page.evaluate(()=>{st.prof.anim=false;save();applyPrefs();});
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.anim),'off');
    assert.equal(await page.locator('#welcomeMotion').count(),0);
    assert.equal(await page.locator('#nb-intro').getAttribute('data-motion'),mode==='reduced'?'gentle':'on');
    if(mode!=='normal')await page.waitForSelector('#nb-intro.using-fallback');
    const animation=await page.locator('#nb-intro .intro-cloud-blue').evaluate(e=>getComputedStyle(e).animationName);
    assert.notEqual(animation,'none');if(mode==='reduced')assert.equal(animation,'nb-cloud-gentle');
    assert.equal(await page.evaluate(()=>testMedia.audio),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('nubbi-intro-motion')),'off');
    assert.equal(await page.evaluate(()=>localStorage.getItem('preserve-sentinel')),'unchanged');
    if(mode==='reduced')assert.equal(await page.evaluate(()=>testMedia.video),0);
    else assert.ok(await page.evaluate(()=>testMedia.video)>0);
    await page.waitForFunction(()=>!document.querySelector('#nb-intro').open,{},{timeout:6500});
   }
   await page.evaluate(()=>NubbiApp.go('prof'));await page.locator('.intro-settings summary').click();
   await page.locator('#panim').selectOption('on');assert.equal(await page.evaluate(()=>document.documentElement.dataset.anim),'on');
   await page.locator('#panim').selectOption('off');assert.equal(await page.evaluate(()=>document.documentElement.dataset.anim),'off');
   await page.locator('#welcomeSound').check();assert.equal(await page.evaluate(()=>localStorage.getItem('nubbi-intro-audio')),'on');
   await page.locator('#welcomeSound').uncheck();
   await page.locator('.intro-settings button').click();await page.waitForSelector('#nb-intro[open]');
   await page.waitForFunction(()=>!document.querySelector('#nb-intro').open,{},{timeout:6500});
   assert.equal(await page.evaluate(()=>testMedia.audio),0);
   await page.evaluate(()=>NubbiApp.go('home'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal layout overflow');
   assert.deepEqual(errors,[]);console.log('PASS welcome '+(mobile?'mobile':'desktop')+' '+mode+': animation, legacy preferences, reload, replay, audio and layout');
  }finally{await context.close()}
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
