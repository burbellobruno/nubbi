const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const routes = {};
const app = {
  set() {}, use() {},
  get(route, handler) { routes["GET " + route] = handler; },
  post(route, handler) { routes["POST " + route] = handler; },
  listen() {},
};
const express = () => app;
express.json = express.static = () => () => {};

const env = {
  CHAT_BASE_URL: "https://api.groq.test/openai/v1",
  CHAT_API_KEY: "test-only",
  CHAT_MODEL: "openai/gpt-oss-20b",
};
let lastChat = null;

const ctx = {
  require(name) {
    if (name === "dotenv") return { config() {} };
    if (name === "express") return express;
    if (name === "./public/ai-client.js") return require("../public/ai-client.js");
    throw new Error("Unexpected dependency: " + name);
  },
  process: { env }, Buffer, URL, AbortController, AbortSignal, Date,
  setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), console, TextDecoder,
  async fetch(url, options) {
    if (String(url).includes("/chat/completions")) {
      lastChat = { url, payload: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
    }
    throw new Error("Unexpected fetch: " + url);
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../server.js"), "utf8"), ctx);

function call(method, route, body) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const req = { body: body || {}, headers: {}, method, path: route.replace("/api", ""), get: () => "" };
    const res = {
      code: 200, headersSent: false, destroyed: false, writableEnded: false,
      status(code) { this.code = code; return this; },
      json(value) { this.body = value; finish(this); return this; },
      once() { return this; }, removeListener() { return this; },
      setHeader() {}, write() {}, end() { finish(this); },
    };
    try { await routes[method + " " + route](req, res); } catch (error) { reject(error); }
  });
}

async function chat(extra) {
  lastChat = null;
  const res = await call("POST", "/api/chat", { prompt: "Hello", ...extra });
  return { status: res.code, body: res.body, model: lastChat && lastChat.payload.model, request: lastChat };
}

(async () => {
  let out = await chat({ model: "openai/gpt-oss-120b" });
  assert.equal(out.status, 200);
  assert.equal(out.body.text, "ok");
  assert.equal(out.model, "openai/gpt-oss-20b", "model override must be denied by default");

  env.CHAT_MODEL_ALLOWLIST = "openai/gpt-oss-120b";
  out = await chat({ model: "openai/gpt-oss-120b" });
  assert.equal(out.model, "openai/gpt-oss-120b", "allowed override must be honored");
  out = await chat({ max_tokens: 3000 });
  assert.equal(out.request.payload.max_tokens, 3000, "chapter budget must reach provider");
  out = await chat({ max_tokens: 9000 });
  assert.equal(out.request.payload.max_tokens, 4096, "provider budget must remain bounded");
  const structured = [{role:"system",content:"Iria, cartógrafa adulta de 28 años."},{role:"assistant",content:"La llave sigue en tu mochila."},{role:"user",content:"Seguimos en el faro."}];
  out = await chat({ storyMessages: structured });
  assert.deepEqual(JSON.parse(JSON.stringify(out.request.payload.messages.slice(1))), structured);
  assert.match(out.request.payload.messages[0].content, /no explícita/);
  for(const storyMessages of [[], [{role:"user",content:"x"}], [{role:"system",content:"x"},{role:"system",content:"y"}], [{role:"system",content:"x"},{role:"tool",content:"y"}], [{role:"system",content:"x"},{role:"user",content:"y",tool_calls:[]}], [{role:"system",content:"x".repeat(32000)},{role:"user",content:"y"}]]) {
    out = await chat({ storyMessages });assert.equal(out.status,400);assert.equal(out.request,null,"invalid structured context must not reach provider");
  }

  out = await chat({ model: "evil/model" });
  assert.equal(out.model, "openai/gpt-oss-20b", "unknown model must fall back to the configured one");

  out = await chat({ model: 123 });
  assert.equal(out.model, "openai/gpt-oss-20b", "non-string model must fall back safely");

  let health = await call("GET", "/api/health");
  assert.deepEqual(Array.from(health.body.models).sort(), ["openai/gpt-oss-120b", "openai/gpt-oss-20b"].sort());

  delete env.CHAT_MODEL_ALLOWLIST;
  health = await call("GET", "/api/health");
  assert.deepEqual(Array.from(health.body.models), ["openai/gpt-oss-20b"]);

  env.ADULT_CHAT_BASE_URL = "https://adult.example.test/v1";
  env.ADULT_CHAT_MODEL = "adult-model";
  env.ADULT_CHAT_API_KEY = "test-only";
  out = await chat({ adult: true, model: "openai/gpt-oss-120b" });
  assert.equal(out.model, "adult-model", "dedicated adult provider must keep its own model");
  assert.match(out.request.payload.messages[0].content, /Ficción madura no explícita/);
  assert.match(out.request.payload.messages[0].content, /18 años o más/);
  assert.match(out.request.payload.messages[0].content, /sin descripción gráfica/);

  console.log("Chat: allowlist de modelos, fallback seguro, health y proveedor adulto: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
