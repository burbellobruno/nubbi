// Real browser UI + synthetic provider response. Loopback only, no external requests.
const {chromium}=require(process.env.NUBBI_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.NUBBI_TEST_URL||'http://127.0.0.1:43981';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Only local testing is allowed');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.NUBBI_BROWSER_PATH});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),requests=[];
  await context.route('**/*',route=>{
   const req=route.request(),target=new URL(req.url());
   if(target.origin!==new URL(url).origin)return route.abort();
   if(target.pathname==='/api/chat'){
    requests.push(req.postDataJSON());
    return route.fulfill({contentType:'text/event-stream',body:'data: {"choices":[{"delta":{"content":"[neutral]\\n*Luna señala la mochila.* La llave sigue allí. Podemos volver al faro cuando quieras."}}]}\n\ndata: [DONE]\n\n'});
   }
   return route.continue();
  });
  await context.addInitScript(()=>{localStorage.setItem('nubbi-adult-ok','1');localStorage.setItem('nubbi-intro-seen','1');localStorage.setItem('nubbi-intro-audio','off');});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.NubbiApp&&window.NubbiStory&&document.documentElement.dataset.nbAccountReady==='1');
  await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});
  await page.evaluate(()=>NubbiApp.openChat('p0'));
  await page.locator('#cfg').click();await page.waitForSelector('#cdlg[open]');
  assert.equal(await page.locator('#storyStyle option').count(),4);
  await page.locator('#storyStyle').selectOption('literary');
  await page.locator('#storyLength').selectOption('extended');
  await page.locator('#storyCanon').fill('La llave está en mi mochila. Seguimos en el faro.');
  await page.locator('#csave').click();
  assert.deepEqual(await page.evaluate(()=>({style:st.cfg.p0.storyStyle,length:st.cfg.p0.storyLength,canon:st.cfg.p0.storyCanon})),{style:'literary',length:'extended',canon:'La llave está en mi mochila. Seguimos en el faro.'});
  await page.reload();await page.waitForFunction(()=>window.NubbiApp&&document.documentElement.dataset.nbAccountReady==='1');
  await page.waitForFunction(()=>!document.querySelector('#nb-intro')?.open,{},{timeout:12000});
  await page.evaluate(()=>{NubbiApp.openChat('p0');st.chats.p0=Array.from({length:80},(_,i)=>({role:i%2?'assistant':'user',content:'Recuerdo '+i+' '+('x'.repeat(4500)),ts:i}));});
  await page.locator('#inp').fill('¿Dónde está la llave?');await page.locator('#f').evaluate(el=>el.requestSubmit());
  await page.waitForFunction(()=>st.chats.p0.at(-1)?.role==='assistant'&&st.chats.p0.at(-1)?.content.includes('La llave sigue allí'));
  assert.equal(requests.length,1);const body=requests[0];
  assert.equal(body.max_tokens,3000);assert.equal(body.stream,true);
  assert.ok(body.prompt.length<=30000);assert.match(body.prompt,/Dirección narrativa: Novela/);
  assert.match(body.prompt,/La llave está en mi mochila/);assert.match(body.prompt,/¿Dónde está la llave\?/);
  assert.match(body.prompt,/no escribas diálogo, pensamientos, consentimiento ni decisiones del usuario/);
  assert.match(body.prompt,/ficción no explícita/);
  assert.ok(Array.isArray(body.storyMessages));assert.ok(body.storyMessages.length<=41);
  assert.equal(body.storyMessages[0].role,'system');
  assert.equal(body.storyMessages.filter(m=>m.role==='system').length,1);
  assert.match(body.storyMessages[0].content,/La llave está en mi mochila/);
  assert.equal(body.storyMessages.at(-1).role,'user');assert.equal(body.storyMessages.at(-1).content,'¿Dónde está la llave?');
  assert.ok(body.storyMessages.reduce((n,m)=>n+m.content.length,0)<=30000);
  assert.ok(Buffer.byteLength(JSON.stringify(body),'utf8')<128*1024);
  assert.equal(await page.evaluate(()=>st.chats.p0.length),82,'context truncation must not delete history');
  await page.locator('#bCont').click();
  await page.waitForFunction(()=>st.chats.p0.length===83);
  assert.equal(requests.length,2);assert.equal(requests[1].storyMessages.at(-1).role,'user');
  assert.match(requests[1].storyMessages.at(-1).content,/Indicación de dirección de escena:/);
  assert.equal(requests[1].storyMessages.filter(m=>m.role==='system').length,1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);console.log('PASS narrative browser '+width+': styles, canon, bounded structured-role SSE request, continue direction and unchanged history');
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
