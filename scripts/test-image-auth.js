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
  set() {}, use() {}, get() {}, listen() {},
  post(route, handler) { routes[route] = handler; },
};
const express = () => app;
express.json = express.static = () => () => {};
let providerCalls = 0;
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
    const prompt = JSON.parse(options.body).prompt;
    assert.match(prompt, /years old/);
    return { ok: true, status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => Buffer.from("test-image") };
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../server.js"), "utf8"), ctx);
async function request(token, prompt = "Portrait of a person, 28 years old") {
  const req = { body: { prompt }, headers: token ? { authorization: "Bearer " + token } : {} };
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
  for (let i = 0; i < 5; i++) assert.equal((await request("user-a")).code, 200);
  assert.equal((await request("user-a")).code, 429);
  assert.equal((await request("user-b")).code, 200);
  now += 120000;
  assert.equal((await request("user-a")).code, 200);
  delete env.FIREBASE_API_KEY;
  assert.equal((await request("user-c")).code, 503);
  console.log("Imágenes: sesión, rechazo anónimo/inhabilitado, menores, cuota por uid y reinicio UTC: OK (proveedores simulados)");
})().catch(error => { console.error(error); process.exitCode = 1; });
