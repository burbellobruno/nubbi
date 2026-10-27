const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const routes = {};
let now = Date.parse("2026-10-24T23:59:00Z");
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}
const app = {
  set() {}, use() {}, get(route, handler) { routes["GET " + route] = handler; }, listen() {},
  post(route, handler) { routes[route] = handler; },
};
const express = () => app;
express.json = express.static = () => () => {};
let providerCalls = 0;
let lastProviderRequest;
const env = {
  FIREBASE_API_KEY: "test-only",
  IMAGE_PROVIDER: "cloudflare",
  CF_ACCOUNT_ID: "a".repeat(32),
  CF_API_TOKEN: "test-only",
  IMAGE_DAILY_LIMIT: "5",
};
const ctx = {
  require(name) {
    if (name === "dotenv") return { config() {} };
    if (name === "express") return express;
    if (name === "./public/ai-client.js") return require("../public/ai-client.js");
    throw new Error("Unexpected dependency: " + name);
  },
  process: { env }, Buffer, URL, AbortSignal, Date: Clock,
  setInterval: () => ({ unref() {} }), console,
  async fetch(url, options) {
    if (url.includes("accounts:lookup")) {
      const token = JSON.parse(options.body).idToken;
      const user = token === "anonymous" ? { localId: "anon" }
        : token === "disabled" ? { localId: "disabled", email: "test@example.test", disabled: true }
        : { localId: token, email: "test@example.test" };
      return { ok: token !== "invalid", status: token === "invalid" ? 400 : 200,
        json: async () => token === "invalid" ? { error: { message: "INVALID_ID_TOKEN" } } : { users: [user] } };
    }
    providerCalls++;
    const payload = JSON.parse(options.body);lastProviderRequest={url,payload};
    const prompt = payload.prompt;
    assert.match(prompt, /years old/);
    if(url.includes('lucid-origin'))return {ok:true,status:200,headers:{get:()=>"application/json"},text:async()=>JSON.stringify({result:{image:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64').toString('base64')}})};
    return { ok: true, status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64') };
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../server.js"), "utf8"), ctx);
async function request(token, prompt = "Portrait of a person, 28 years old", extra = {}) {
  const req = { body: { prompt, ...extra }, headers: token ? { authorization: "Bearer " + token } : {} };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await routes["/api/image"](req, res);
  return res;
}
(async () => {
  for (const token of [undefined, "invalid", "anonymous", "disabled"]) {
    assert.equal((await request(token)).code, 401, String(token));
  }
  assert.equal(providerCalls, 0);
  assert.equal((await request("user-a", "child portrait")).code, 400);
  // Invalid numeric ages fail before provider calls and do not spend the daily quota.
  for (const prompt of ["Portrait without an age", "Portrait, 0 years old", "Portrait, 17 years old", "Portrait, 29 years old, 12 years old", "Portrait, 29 years old, 30 years old", "Portrait, age: 21.5"]) {
    const invalid = await request("age-user", prompt);
    assert.equal(invalid.code, 400, prompt);
    assert.equal(invalid.body.code, "INVALID_AGE");
  }
  assert.equal(providerCalls, 0);
  assert.equal((await request("age-user", "Vampire, 300 years old")).code, 200);
  assert.match(lastProviderRequest.payload.prompt, /300 years old/);
  for (let i = 0; i < 4; i++) assert.equal((await request("age-user", "Portrait, 21‑year‑old explorer")).code, 200);
  assert.equal((await request("age-user")).code, 429);
  const longPrompt = "portrait, " + "detailed texture, ".repeat(150) + "29 years old";
  assert.equal((await request("long-prompt-user", longPrompt)).code, 200);
  assert.match(lastProviderRequest.payload.prompt, /^29 years old/);
  assert.ok(lastProviderRequest.payload.prompt.length <= 2048);
  for (let i = 0; i < 5; i++) assert.equal((await request("user-a")).code, 200);
  assert.equal((await request("user-a")).code, 429);
  assert.equal((await request("user-b")).code, 200);
  now += 120000;
  assert.equal((await request("user-a")).code, 200);
  assert.equal((await request('model-user',undefined,{model:'@cf/leonardo/lucid-origin'})).code,200);
  assert.equal(lastProviderRequest.payload.num_steps,20);
  assert.equal(lastProviderRequest.payload.width,768);
  assert.equal((await request('model-user',undefined,{model:'@cf/leonardo/phoenix-1.0'})).code,200);
  assert.match(lastProviderRequest.payload.negative_prompt,/underage/);
  const stale=await request('stale-user',undefined,{model:'@cf/leonardo/removed-model'});
  assert.equal(stale.code,200);
  assert.match(lastProviderRequest.url,/@cf\/black-forest-labs\/flux-1-schnell/);
  assert.equal(stale.body.model,'@cf/black-forest-labs/flux-1-schnell');
  assert.equal((await request('model-user',undefined,{model:'https://attacker.example/model'})).code,400);
  assert.equal((await request('model-user',undefined,{model:'Counterfeit-V3.0_fp16'})).code,400);
  assert.equal((await request('model-user',undefined,{provider:'forge',model:'@cf/leonardo/lucid-origin'})).code,400);
  // Adult boundary and automatic style routing retain explicit model control.
  for(const age of [18,19,20])assert.equal((await request('adult-'+age,'Portrait, '+age+' years old')).code,200);
  for(const style of ['anime','webtoon','manhwa','manga','bl','3d','semi-realista','furry','pintura digital','realista']){
    const out=await request('style-'+style,undefined,{model:'auto',style});
    assert.equal(out.code,200,style);
    assert.equal(out.body.model,style==='realista'?'@cf/black-forest-labs/flux-1-schnell':'@cf/leonardo/lucid-origin');
    assert.match(lastProviderRequest.payload.prompt,/29|28/);
    assert.ok(lastProviderRequest.payload.prompt.length<=2048);
    if(style==='manga')assert.match(lastProviderRequest.payload.prompt,/black-and-white manga/);
    if(style==='furry')assert.match(lastProviderRequest.payload.prompt,/anthropomorphic/);
  }
  assert.equal((await request('explicit-style',undefined,{style:'anime',model:'@cf/black-forest-labs/flux-1-schnell'})).code,200);
  assert.match(lastProviderRequest.url,/flux-1-schnell/,'explicit choice must take precedence over style recommendation');
  assert.equal((await request('auto-alias',undefined,{style:'manwha',model:'auto'})).code,200);
  assert.match(lastProviderRequest.url,/lucid-origin/);
  let capabilities;
  routes['GET /api/image/capabilities']({}, {json(value){capabilities=value;}});
  assert.equal(capabilities.providers.cloudflare.freeTier.unlimited,false);
  assert.equal(capabilities.providers.cloudflare.styles.length,10);
  assert.ok(!JSON.stringify(capabilities).includes('test-only'),'capabilities must not expose tokens');
  delete env.FIREBASE_API_KEY;
  assert.equal((await request("user-c")).code, 503);
  console.log("Imágenes: sesión, rechazo anónimo/inhabilitado, menores, cuota por uid, modelos por proveedor y reinicio UTC: OK (proveedores simulados)");
})().catch(error => { console.error(error); process.exitCode = 1; });
