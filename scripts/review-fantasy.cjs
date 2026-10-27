// Local visual regression: synthetic guest state, no external services.
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const url=process.env.NUBBI_TEST_URL||'http://127.0.0.1:43840';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Local server required');
const output=process.env.NUBBI_REVIEW_OUTPUT||path.join(__dirname,'../review');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.NUBBI_BROWSER_PATH});
 try{for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  await context.addInitScript(()=>localStorage.setItem('nubbi-adult-ok','1'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.NubbiApp&&window.st);
  await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:10000});
  const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow at '+width);
  await overflow();await page.screenshot({path:path.join(output,'home-'+width+'.png')});
  await page.locator('#grid').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  assert.ok(await page.locator('.card.portrait-fallback').count()>0);
  await page.screenshot({path:path.join(output,'catalog-'+width+'.png')});
  await page.evaluate(()=>{st.chats.p0=[{role:'user',content:'Una historia de prueba',ts:1},{role:'assistant',content:'Continuemos nuestra historia',ts:2}];NubbiApp.renderAll();});
  await page.waitForSelector('#recentStories:not([hidden])');
  await page.evaluate(()=>document.querySelector('#views').scrollTop=0);
  await page.screenshot({path:path.join(output,'recent-'+width+'.png')});
  await page.locator('#q').fill('Kael');await page.waitForTimeout(350);
  assert.ok(await page.locator('#grid .card').count()>0);await page.locator('#q').fill('');await page.waitForTimeout(350);
  await page.locator('#grid .card .fav').first().click();
  await page.evaluate(()=>NubbiApp.go('favs'));assert.equal(await page.locator('#fg .card').count(),1);
  for(const view of ['chats','community','prof']){
   await page.evaluate(view=>NubbiApp.go(view),view);await overflow();
   if(view==='prof'){
    await page.screenshot({path:path.join(output,'profile-'+width+'.png')});
    await page.locator('#ptheme').selectOption('light');await overflow();
    await page.screenshot({path:path.join(output,'profile-light-'+width+'.png')});
    await page.locator('#ptheme').selectOption('dark');
   }
  }
  await page.evaluate(()=>NubbiApp.go('home'));
  for(let i=0;i<7;i++){
   await page.locator('.style-tile').nth(i).click();await page.waitForSelector('#dlg[open]');
   assert.ok(await page.locator('#sty').inputValue());
   await page.evaluate(()=>document.querySelector('#dlg').close());
  }
  await page.locator('#heroNew').click();await page.waitForSelector('#dlg[open]');
  await overflow();await page.screenshot({path:path.join(output,'creator-'+width+'.png')});
  await page.evaluate(()=>document.querySelector('#dlg').close());
  await page.evaluate(()=>NubbiOpenChat('p0'));await page.waitForSelector('#chat.open');
  await overflow();assert.ok(await page.locator('#inp').isVisible());
  await page.screenshot({path:path.join(output,'chat-'+width+'.png')});
  await page.locator('#back').click();
  assert.deepEqual(errors,[]);console.log('PASS visual '+width+': navigation, search, favorites, profile, light/dark, creator, chat, no page errors/overflow');
  await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
