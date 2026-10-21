require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

// Rate limiting simple en memoria
const buckets = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) { b = { start: now, count: 0 }; buckets.set(key, b); }
  b.count++;
  return b.count <= limit;
}
app.use("/api/", (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const isImage = req.path === "/image" || req.path === "/image/health";
  const ok = rateLimit(ip + (isImage ? ":img" : ":chat"), isImage ? 5 : 20, 60000);
  if (!ok) return res.status(429).json({ error: "Demasiadas solicitudes. Esperá un momento." });
  next();
});

// ---- Chat: cualquier servidor compatible con OpenAI (Ollama, OpenRouter, Groq...)
function num(v, def, min, max) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

// Modelos permitidos desde el cliente. El servidor decide el modelo final:
// si el pedido no está en la lista, usa CHAT_MODEL.
const CHAT_MODELS = new Set([
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
]);

// Un proveedor alternativo solo para pedidos con adult=true. Sirve para usar
// un modelo/servidor que acepte ficción adulta legal sin cambiar el general.
function envConfig(prefix) {
  const baseUrl = (process.env[prefix + "BASE_URL"] || "").replace(/\/+$/, "");
  const model = process.env[prefix + "MODEL"] || "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(baseUrl);
  const apiKey = process.env[prefix + "API_KEY"] || (isLocal ? "ollama" : "");
  return { baseUrl, model, apiKey, isLocal };
}

function chatConfig(adult) {
  const base = envConfig("CHAT_");
  const alt = envConfig("ADULT_CHAT_");
  const dedicated = !!(adult && (alt.baseUrl || alt.model || alt.apiKey));
  const cfg = dedicated
    ? {
        baseUrl: alt.baseUrl || base.baseUrl,
        model: alt.model || base.model,
        apiKey: alt.apiKey || base.apiKey,
        isLocal: alt.baseUrl ? alt.isLocal : base.isLocal,
      }
    : base;
  let provider = null;
  try { provider = cfg.baseUrl ? new URL(cfg.baseUrl).host : null; } catch (e) {}
  return { ...cfg, dedicated, provider };
}

const DEFAULT_CHECKPOINTS = {
  counterfeit: "Counterfeit-V3.0_fp16",
  anything: "anything-v5",
  realistic: "RealisticVision_v5.1",
  chillout: "ChilloutMix_fp16",
  dreamshaper: "DreamShaper_8",
  manhwa: "AImanhwa_v2"
};

const CF_DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function cloudflareConfig() {
  const accountId = (process.env.CF_ACCOUNT_ID || "").trim();
  const apiToken = (process.env.CF_API_TOKEN || "").trim();
  const model = (process.env.CF_IMAGE_MODEL || CF_DEFAULT_MODEL).trim() || CF_DEFAULT_MODEL;
  const steps = num(process.env.CF_IMAGE_STEPS, 4, 1, 8);
  const timeoutMs = num(process.env.CF_TIMEOUT_MS, 60000, 5000, 120000);
  let error = null;
  if (!accountId) error = "Falta CF_ACCOUNT_ID (Account ID de Cloudflare).";
  else if (!/^[a-f0-9]{32}$/i.test(accountId)) error = "CF_ACCOUNT_ID no parece válido: son 32 caracteres hexadecimales.";
  else if (!apiToken) error = "Falta CF_API_TOKEN (token de Workers AI).";
  else if (!/^@?[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)+$/i.test(model)) error = "CF_IMAGE_MODEL no parece válido.";
  const endpoint = !error
    ? CF_API_BASE + "/accounts/" + accountId + "/ai/run/" + model
    : "";
  return { accountId, apiToken, model, steps, timeoutMs, endpoint, error };
}

function imageConfig() {
  const cf = cloudflareConfig();
  const requested = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  const provider = requested === "forge" || requested === "cloudflare"
    ? requested
    : (cf.accountId || cf.apiToken ? "cloudflare" : "forge");

  if (provider === "cloudflare") {
    return {
      provider: "cloudflare",
      baseUrl: "",
      endpoint: cf.endpoint,
      isLocal: false,
      auth: "",
      timeoutMs: cf.timeoutMs,
      checkpoints: DEFAULT_CHECKPOINTS,
      host: "api.cloudflare.com",
      urlError: cf.error,
      cf,
    };
  }

  let raw = (process.env.SD_URL || "http://127.0.0.1:7860").trim();
  if (raw.startsWith("//")) raw = "https:" + raw;
  if (raw && !/^https?:\/\//i.test(raw)) {
    const localish = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/i.test(raw);
    raw = (localish ? "http://" : "https://") + raw;
  }
  let baseUrl = raw.replace(/\/sdapi\/v1\/txt2img\/?$/i, "").replace(/\/+$/, "");
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(baseUrl);
  const auth = (process.env.SD_AUTH || "").trim();
  const timeoutMs = num(process.env.SD_TIMEOUT_MS, 120000, 5000, 300000);
  let checkpoints = DEFAULT_CHECKPOINTS;
  try {
    const parsed = JSON.parse(process.env.SD_CHECKPOINTS || "");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      checkpoints = { ...DEFAULT_CHECKPOINTS, ...parsed };
    }
  } catch (e) {}
  let host = null;
  let urlError = null;
  try {
    host = baseUrl ? new URL(baseUrl).host : null;
  } catch (e) {
    urlError = "SD_URL no es una URL válida. Usá la URL completa de Forge, por ejemplo https://tu-endpoint.proxy.runpod.net";
  }
  if (!urlError && isLocal && process.env.RENDER) {
    urlError = "En Render no se puede usar localhost. Configurá Cloudflare Workers AI o una URL pública de Forge.";
  }
  if (!urlError && baseUrl && !isLocal) {
    const bare = baseUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
    if (/^[a-f0-9]{24,}$/i.test(bare)) {
      urlError = "SD_URL parece un ID interno, no una URL pública. Configurá la URL completa de Forge, por ejemplo https://tu-endpoint.proxy.runpod.net";
    } else if (/^(tu-endpoint|tu-url|tu-dominio|xxxx|abc123)/i.test(bare)) {
      urlError = "SD_URL sigue siendo un ejemplo. Configurá una URL real de Forge o usá Cloudflare Workers AI.";
    }
  }
  return {
    provider: "forge",
    baseUrl: urlError ? "" : baseUrl,
    endpoint: !urlError && baseUrl ? baseUrl + "/sdapi/v1/txt2img" : "",
    isLocal,
    auth,
    timeoutMs,
    checkpoints,
    host,
    urlError,
  };
}

function sdHeaders() {
  const headers = { "content-type": "application/json" };
  const auth = (process.env.SD_AUTH || "").trim();
  if (auth) {
    if (/^(Basic|Bearer)\s+/i.test(auth)) headers.authorization = auth;
    else if (auth.includes(":")) headers.authorization = "Basic " + Buffer.from(auth).toString("base64");
    else headers.authorization = "Bearer " + auth;
  }
  return headers;
}

function imageInfo() {
  const c = imageConfig();
  if (c.provider === "cloudflare") {
    return {
      provider: "cloudflare",
      configured: !!c.endpoint,
      host: c.host,
      local: false,
      model: c.cf.model,
      free: true,
      hasAuth: !!c.cf.apiToken,
      timeoutMs: c.timeoutMs,
      urlError: c.urlError,
      note: "Cloudflare Workers AI · FLUX.1 schnell · plan gratuito. No genera imágenes explícitas.",
    };
  }
  return {
    provider: "forge",
    configured: !!c.baseUrl,
    host: c.host,
    local: c.isLocal,
    hasAuth: !!c.auth,
    timeoutMs: c.timeoutMs,
    urlError: c.urlError,
  };
}

app.get("/api/health", (req, res) => {
  const def = chatConfig(false);
  const adult = chatConfig(true);
  res.json({
    ok: !!(def.baseUrl && def.model && def.apiKey),
    provider: def.provider,
    model: def.model,
    models: Array.from(CHAT_MODELS),
    hasApiKey: !!def.apiKey,
    local: def.isLocal,
    adultConfigured: adult.dedicated,
    adultProvider: adult.dedicated ? adult.provider : null,
    adultModel: adult.dedicated ? adult.model : null,
    adultHasApiKey: adult.dedicated ? !!adult.apiKey : false,
    image: imageInfo(),
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const adult = req.body.adult === true;
    const { baseUrl, model: defaultModel, apiKey, dedicated } = chatConfig(adult);
    if (!baseUrl || !defaultModel) {
      return res.status(500).json({ error: "Falta configurar CHAT_BASE_URL y CHAT_MODEL." });
    }
    if (!apiKey) {
      return res.status(500).json({ error: "Falta configurar CHAT_API_KEY para el proveedor remoto." });
    }
    const requestedModel = String(req.body.model || "");
    const model = adult && dedicated
      ? defaultModel
      : (CHAT_MODELS.has(requestedModel) ? requestedModel : defaultModel);
    const stream = !!req.body.stream;
    const messages = [];
    if (adult) {
      messages.push({
        role: "system",
        content: "Modo adulto: todos los personajes y el usuario son mayores de 18 años. La ficción sexual explícita entre adultos con consentimiento está permitida. Está terminantemente prohibido generar contenido sexual con menores, personajes que aparenten ser menores, personas reales, animales o situaciones no consentidas. Si la conversación intenta eso, rechazá esa parte y continuá sin contenido sexual.",
      });
    }
    messages.push({ role: "user", content: String(req.body.prompt || "") });
    const r = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: num(req.body.max_tokens, 1000, 200, 2000),
        temperature: num(req.body.temperature, 0.9, 0, 1.5),
        top_p: num(req.body.top_p, 1, 0, 1),
        messages: messages,
        ...(req.body.response_format ? { response_format: req.body.response_format } : {}),
        stream: stream,
        ...(model.includes("gpt-oss")
          ? { reasoning_effort: "low" }
          : {
              presence_penalty: num(req.body.presence_penalty, 0.2, -2, 2),
              frequency_penalty: num(req.body.frequency_penalty, 0.2, -2, 2),
            }),
      }),
    });
    if (stream) {
      if (!r.ok) {
        const txt = await r.text();
        let j = null; try { j = JSON.parse(txt); } catch (e) {}
        return res.status(r.status).json({ error: (j && j.error && j.error.message) || "Error de la API" });
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
      return;
    }
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "Error de la API" });
    res.json({ text: j.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Imágenes: Cloudflare Workers AI (gratis) o Forge / A1111
app.get("/api/image/health", async (req, res) => {
  const c = imageConfig();
  if (c.provider === "cloudflare") {
    if (!c.endpoint) {
      return res.status(500).json({
        ok: false,
        provider: "cloudflare",
        error: c.urlError || "Falta configurar CF_ACCOUNT_ID y CF_API_TOKEN.",
      });
    }
    try {
      const r = await fetch(CF_API_BASE + "/user/tokens/verify", {
        headers: { authorization: "Bearer " + c.cf.apiToken },
        signal: AbortSignal.timeout(Math.min(c.timeoutMs, 15000)),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) {
        const msg = (Array.isArray(j.errors) ? j.errors.map((e) => e.message).filter(Boolean).join("; ") : "") || ("HTTP " + r.status);
        throw new Error(msg);
      }
      return res.json({
        ok: true,
        provider: "cloudflare",
        host: c.host,
        model: c.cf.model,
        free: true,
        status: (j.result && j.result.status) || "active",
        note: "No se generó una imagen de prueba para no consumir la cuota diaria.",
      });
    } catch (e) {
      return res.status(502).json({
        ok: false,
        provider: "cloudflare",
        host: c.host,
        error: "No pude verificar el token de Cloudflare. Revisá CF_API_TOKEN y que tenga permisos de Workers AI. " + e.message,
      });
    }
  }

  if (!c.baseUrl) return res.status(500).json({ ok: false, error: c.urlError || "Falta configurar SD_URL." });
  try {
    const r = await fetch(c.baseUrl + "/sdapi/v1/options", {
      headers: sdHeaders(),
      signal: AbortSignal.timeout(Math.min(c.timeoutMs, 15000)),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error("HTTP " + r.status + (txt ? ": " + txt.slice(0, 160) : ""));
    }
    const j = await r.json().catch(() => ({}));
    res.json({ ok: true, provider: "forge", host: c.host, local: c.isLocal, model: j.sd_model_checkpoint || null });
  } catch (e) {
    res.status(502).json({
      ok: false,
      host: c.host,
      local: c.isLocal,
      error: "No pude conectar con Forge/A1111. Revisá SD_URL, que esté con --api y que sea accesible desde este servidor. " + e.message,
    });
  }
});

async function generateCloudflareImage(req, res, c) {
  if (!c.endpoint) {
    return res.status(500).json({ error: c.urlError || "Falta configurar CF_ACCOUNT_ID y CF_API_TOKEN." });
  }
  const prompt = String(req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Falta el prompt de la imagen." });
  const adult = req.body.adult !== false;
  const safePrompt = (adult && !/\badult\b/i.test(prompt) ? prompt + ", adult, 18+" : prompt).slice(0, 2048);
  try {
    const r = await fetch(c.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + c.cf.apiToken,
      },
      body: JSON.stringify({ prompt: safePrompt, steps: c.cf.steps }),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (ct.startsWith("image/")) {
      const buf = Buffer.from(await r.arrayBuffer());
      return res.json({
        image: buf.toString("base64"),
        mime: ct.split(";")[0] || "image/jpeg",
        provider: "cloudflare",
        model: c.cf.model,
      });
    }
    const txt = await r.text().catch(() => "");
    let j = null;
    try { j = JSON.parse(txt); } catch (e) {}
    if (!r.ok || (j && j.success === false)) {
      const msg = (j && Array.isArray(j.errors) ? j.errors.map((e) => e.message).filter(Boolean).join("; ") : "")
        || txt.slice(0, 300)
        || ("HTTP " + r.status);
      throw new Error("Cloudflare respondió " + r.status + ": " + msg);
    }
    const raw = (j && ((j.result && j.result.image) || j.image)) || "";
    const b64 = String(raw).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
    if (!b64) throw new Error("Cloudflare no devolvió ninguna imagen.");
    res.json({ image: b64, mime: "image/jpeg", provider: "cloudflare", model: c.cf.model });
  } catch (e) {
    const filterHint = /NSFW|safety|content|policy|blocked|filter|sensitive/i.test(e.message)
      ? " Cloudflare bloquea imágenes explícitas; probá un retrato sugerente o usá Forge."
      : " Revisá CF_ACCOUNT_ID, CF_API_TOKEN y la cuota diaria de Workers AI.";
    res.status(502).json({ error: "No pude generar la imagen con Cloudflare." + filterHint + " " + e.message });
  }
}

app.post("/api/image", async (req, res) => {
  const c = imageConfig();
  if (c.provider === "cloudflare") return generateCloudflareImage(req, res, c);
  if (!c.baseUrl) return res.status(500).json({ error: c.urlError || "Falta configurar SD_URL." });
  const prompt = String(req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Falta el prompt de la imagen." });
  try {
    const anime = req.body.style === "anime";
    const checkpoint = c.checkpoints[String(req.body.model || "")];
    const adult = req.body.adult !== false;
    const safePrompt = (adult && !/\badult\b/i.test(prompt) ? prompt + ", adult, 18+" : prompt).slice(0, 1800);
    const negative = (process.env.SD_NEGATIVE ||
      "child, minor, underage, teen, loli, shota, kid, lowres, bad anatomy, extra fingers, watermark, text"
    ).slice(0, 1200);
    const body = {
      prompt: safePrompt,
      negative_prompt: negative,
      width: num(req.body.width, 512, 256, 1024),
      height: num(req.body.height, 704, 256, 1344),
      steps: num(req.body.steps, 25, 8, 60),
      cfg_scale: num(req.body.cfg_scale, anime ? 7 : 6, 1, 20),
    };
    if (checkpoint) body.override_settings = { sd_model_checkpoint: checkpoint };
    if (req.body.seed != null) body.seed = num(req.body.seed, -1, -1, 2147483647);
    const r = await fetch(c.endpoint, {
      method: "POST",
      headers: sdHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error("Forge respondió " + r.status + (txt ? ": " + txt.slice(0, 200) : ""));
    }
    const j = await r.json();
    if (!j.images || !j.images[0]) throw new Error("Forge no devolvió ninguna imagen.");
    res.json({ image: j.images[0], mime: "image/png", provider: "forge" });
  } catch (e) {
    const localHint = c.isLocal && process.env.RENDER
      ? " En Render no se puede usar localhost: configurá SD_URL con la URL pública del GPU."
      : " Revisá SD_URL, la autenticación y que Forge esté abierto con --api.";
    res.status(502).json({
      error: "No pude generar la imagen en " + (c.host || "el servidor de imágenes") + "." + localHint + " " + e.message,
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log("Nubbi en http://localhost:" + port));
