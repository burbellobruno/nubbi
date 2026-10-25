const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:4176';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Run these bounded tests only against the local test server.');
(async()=>{
 const home=await fetch(base);assert.equal(home.status,200);assert.equal(home.headers.get('x-content-type-options'),'nosniff');assert.equal(home.headers.get('x-frame-options'),'DENY');assert.equal(home.headers.get('x-powered-by'),null);assert.match(home.headers.get('content-security-policy'),/object-src 'none'/);
 async function post(path,body,headers={'Content-Type':'application/json'}){return fetch(base+path,{method:'POST',headers,body});}
 assert.equal((await post('/api/chat','{}')).status,400);
 assert.equal((await post('/api/chat','[]')).status,400);
 assert.equal((await post('/api/chat','{bad')).status,400);
 assert.equal((await post('/api/chat','plain',{'Content-Type':'text/plain'})).status,415);
 assert.equal((await post('/api/chat',JSON.stringify({prompt:'Hello'}),{'Content-Type':'application/json',Origin:'https://attacker.example'})).status,403);
 assert.equal((await post('/api/chat',JSON.stringify({prompt:'x'.repeat(32001)}))).status,400);
 assert.equal((await post('/api/chat',JSON.stringify({prompt:'x'.repeat(140000)}))).status,413);
 const image=await post('/api/image',JSON.stringify({prompt:'Person, 29 years old'}));assert.equal(image.status,401);assert.match(image.headers.get('cache-control'),/no-store/);
 const missing=await fetch(base+'/.env');assert.equal(missing.status,404);
 console.log('Security: headers/CSP, JSON, size bounds, origin check, image authentication and .env isolation: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
