require("dotenv").config();
const express = require("express");
const app = express();
app.set("trust proxy", 1);
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
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (!b || now - b.start > 60000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();
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

// ---- Cuota diaria de imágenes por usuario ----
const imageQuota = new Map();
function utcDay() {
  return new Date().toISOString().slice(0, 10);
}
function imageQuotaFor(uid) {
  const day = utcDay();
  let q = imageQuota.get(uid);
  if (!q || q.day !== day) {
    q = { day, count: 0 };
    imageQuota.set(uid, q);
  }
  return q;
}
function takeImageQuota(uid) {
  const limit = num(process.env.IMAGE_DAILY_LIMIT, 5, 1, 1000);
  const q = imageQuotaFor(uid);
  if (q.count >= limit) return false;
  q.count++;
  return true;
}
const quotaCleanup = setInterval(() => {
  const day = utcDay();
  for (const [uid, q] of imageQuota) {
    if (!q || q.day !== day) imageQuota.delete(uid);
  }
}, 60 * 60 * 1000);
if (quotaCleanup.unref) quotaCleanup.unref();

// ---- Sesión de Firebase para /api/image ----
function bearerToken(req) {
  const raw = String(req.headers.authorization || "");
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}
async function verifyFirebaseToken(idToken) {
  const apiKey = (process.env.FIREBASE_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("Falta configurar FIREBASE_API_KEY en el servidor.");
    err.code = "FIREBASE_CONFIG";
    throw err;
  }
  const r = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(r.status >= 500 ? "No se pudo verificar la sesión. Intenta de nuevo." : "La sesión no es válida. Inicia sesión de nuevo.");
    err.code = r.status >= 500 ? "FIREBASE_LOOKUP" : "FIREBASE_INVALID_TOKEN";
    throw err;
  }
  const user = Array.isArray(j.users) ? j.users[0] : null;
  if (!user || !user.localId || user.disabled) return null;
  const providers = Array.isArray(user.providerUserInfo) ? user.providerUserInfo : [];
  const anonymous = !user.email && providers.length === 0;
  return { uid: String(user.localId), anonymous, email: user.email || null };
}

// ---- Prompt de imagen compartido: edad numérica adulta + anthro ----
function prepareImagePrompt(raw, style, tags, opts) {
  const cloudflare = !!(opts && opts.cloudflare);
  const adult = !opts || opts.adult !== false;
  let cleaned = String(raw || "")
    .replace(/\b18\s*\+/gi, " ")
    .replace(/\b(adult|adults|adulta|adultas|adulto|adultos|nsfw)\b/gi, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[\s,.;:]+/, "");
  const ageMatch = cleaned.match(/\b(\d{1,3})\s*(?:years?[\s-]*old|y\/o|años?|anos?)\b/i)
    || cleaned.match(/\b(?:age|edad)\s*:?\s*(\d{1,3})\b/i)
    || cleaned.match(/\b(\d{2})\b\s*\+?/);
  const detectedAge = ageMatch ? Number(ageMatch[1]) : 0;
  const ageText = detectedAge >= 21 ? detectedAge + " years old" : "28 years old";
  if (ageMatch) cleaned = cleaned.replace(ageMatch[0], ageText);
  else cleaned = ageText + ", " + (cleaned || "retrato de personaje, alta calidad, portrait");
  if (!cloudflare && adult) cleaned += ", adult";
  return addAnthro(cleaned, style, tags).slice(0, cloudflare ? 2048 : 1800);
}

const MINOR_TERMS = /\b(?:child(?:ren)?|kid(?:s)?|minor(?:s)?|underage|teen(?:ager|agers|aged|age)?|loli(?:s)?|shota(?:s)?|schoolgirls?|niñas?|niños?|menor(?:es)?|adolescentes?)\b|\byoung\s+(?:girl|boy)s?\b/i;
function containsMinorTerms(text) {
  return MINOR_TERMS.test(String(text || ""));
}
function addAnthro(prompt, style, tags) {
  const furry = /\bfurry\b/i.test(String(style || "")) || /\bfurry\b/i.test(String(tags || ""));
  if (!furry || /\banthro(?:pomorphic)?\b/i.test(prompt)) return prompt;
  return prompt + ", anthro, anthropomorphic";
}
function rejectMinor(res) {
  return res.status(400).json({ error: "Todos los personajes deben ser adultos." });
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
const HF_DEFAULT_MODEL = "cagliostrolab/animagine-xl-3.1";

function huggingFaceConfig() {
  const token = (process.env.HF_TOKEN || "").trim();
  const model = (process.env.HF_IMAGE_MODEL || HF_DEFAULT_MODEL).trim() || HF_DEFAULT_MODEL;
  const timeoutMs = num(process.env.HF_TIMEOUT_MS, 120000, 5000, 300000);
  let error = null;
  if (!token) error = "Falta HF_TOKEN (token de HuggingFace).";
  else if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(model)) error = "HF_IMAGE_MODEL debe tener el formato usuario/modelo.";
  const endpoint = !error
    ? "https://router.huggingface.co/hf-inference/models/" + model.split("/").map(encodeURIComponent).join("/")
    : "";
  return { token, model, timeoutMs, endpoint, error };
}

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

function imageConfig(providerOverride) {
  const cf = cloudflareConfig();
  const hf = huggingFaceConfig();
  const override = String(providerOverride || "").trim().toLowerCase();
  const envProvider = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  const requested = ["forge", "cloudflare", "huggingface"].includes(override)
    ? override
    : envProvider;
  const provider = ["forge", "cloudflare", "huggingface"].includes(requested)
    ? requested
    : (cf.accountId || cf.apiToken ? "cloudflare" : hf.token ? "huggingface" : "forge");

  if (provider === "huggingface") {
    return {
      provider: "huggingface",
      baseUrl: "",
      endpoint: hf.endpoint,
      isLocal: false,
      auth: "",
      timeoutMs: hf.timeoutMs,
      checkpoints: DEFAULT_CHECKPOINTS,
      host: "router.huggingface.co",
      urlError: hf.error,
      hf,
    };
  }

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
  if (c.provider === "huggingface") {
    return {
      provider: "huggingface",
      configured: !!c.endpoint,
      host: c.host,
      local: false,
      model: c.hf.model,
      free: false,
      hasAuth: !!c.hf.token,
      timeoutMs: c.timeoutMs,
      urlError: c.urlError,
      note: "HuggingFace Inference API · modelo configurable con HF_IMAGE_MODEL.",
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
    if (containsMinorTerms(req.body.prompt)) return rejectMinor(res);
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
        content: "Modo adulto: todos los personajes y el usuario son mayores de 18 años. La ficción sexual explícita entre adultos con consentimiento está permitida. Está terminantemente prohibido generar contenido sexual con personas no adultas, personajes que aparenten no ser adultos, personas reales o situaciones no consentidas. Prohibido el contenido sexual con animales reales (zoofilia). Los personajes antropomórficos adultos (furry) están permitidos como cualquier otro personaje. Si la conversación intenta eso, rechazá esa parte y continuá sin contenido sexual.",
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
app.get("/api/image/models", async (req, res) => {
  const cf = imageConfig("cloudflare");
  const forge = imageConfig("forge");
  const hf = imageConfig("huggingface");
  const out = {
    defaultProvider: imageConfig().provider,
    dailyLimit: num(process.env.IMAGE_DAILY_LIMIT, 5, 1, 1000),
    requiresAccount: true,
    providers: {
      cloudflare: {
        available: !!cf.endpoint,
        configured: !!cf.endpoint,
        model: cf.cf.model,
        free: true,
        note: "FLUX.1 schnell. No usa modelos locales ni genera imágenes explícitas.",
        error: cf.urlError || null,
      },
      forge: {
        available: false,
        configured: !!forge.baseUrl,
        host: forge.host,
        local: forge.isLocal,
        models: [],
        error: forge.urlError || null,
      },
      huggingface: {
        available: !!hf.endpoint,
        configured: !!hf.hf.token,
        model: hf.hf.model,
        free: false,
        note: "HuggingFace Inference API. Modelo configurable con HF_IMAGE_MODEL.",
        error: hf.urlError || null,
      },
    },
  };

  if (forge.baseUrl) {
    try {
      const r = await fetch(forge.baseUrl + "/sdapi/v1/sd-models", {
        headers: sdHeaders(),
        signal: AbortSignal.timeout(Math.min(forge.timeoutMs, 6000)),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const list = await r.json();
      out.providers.forge.models = (Array.isArray(list) ? list : []).map((m) => ({
        title: String(m.title || m.model_name || ""),
        name: String(m.model_name || m.title || ""),
        filename: String(m.filename || ""),
      })).filter((m) => m.title);
      out.providers.forge.available = out.providers.forge.models.length > 0;
      if (!out.providers.forge.available) out.providers.forge.error = "Forge no devolvió modelos.";
    } catch (e) {
      out.providers.forge.error = "No pude leer los modelos de Forge: " + e.message;
    }
  } else {
    out.providers.forge.error = forge.urlError || "Falta configurar SD_URL.";
  }

  res.json(out);
});

app.get("/api/image/health", async (req, res) => {
  const c = imageConfig(req.query.provider);
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

  if (c.provider === "huggingface") {
    if (!c.endpoint) {
      return res.status(500).json({
        ok: false,
        provider: "huggingface",
        error: c.urlError || "Falta configurar HF_TOKEN y HF_IMAGE_MODEL.",
      });
    }
    try {
      const r = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: { authorization: "Bearer " + c.hf.token },
        signal: AbortSignal.timeout(Math.min(c.timeoutMs, 15000)),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return res.json({
        ok: true,
        provider: "huggingface",
        host: c.host,
        model: c.hf.model,
        note: "No se generó una imagen de prueba para no consumir cuota.",
      });
    } catch (e) {
      return res.status(502).json({
        ok: false,
        provider: "huggingface",
        host: c.host,
        error: "No pude verificar HF_TOKEN. Revisa el token y el acceso al modelo. " + e.message,
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
  // Cloudflare bloquea imágenes explícitas. Además, su filtro confunde las
  // etiquetas meta "adult"/"adulta"/"18+" con NSFW, así que las quitamos del
  // prompt y las reemplazamos por una edad adulta explícita. No reescribimos
  // descripciones explícitas: Cloudflare las sigue bloqueando.
  const safePrompt = prepareImagePrompt(prompt, req.body.style, req.body.tags, { cloudflare: true });
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

async function generateHuggingFaceImage(req, res, c) {
  if (!c.endpoint) {
    return res.status(500).json({ error: c.urlError || "Falta configurar HF_TOKEN y HF_IMAGE_MODEL." });
  }
  const prompt = String(req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Falta el prompt de la imagen." });
  const safePrompt = prepareImagePrompt(prompt, req.body.style, req.body.tags, {
    adult: req.body.adult !== false,
  });
  const negative = (process.env.SD_NEGATIVE ||
    "child, minor, underage, teen, loli, shota, kid, lowres, bad anatomy, extra fingers, watermark, text"
  ).slice(0, 1200);
  const body = {
    inputs: safePrompt,
    parameters: {
      negative_prompt: negative,
      width: num(req.body.width, 512, 256, 1024),
      height: num(req.body.height, 704, 256, 1344),
      num_inference_steps: num(req.body.steps, 28, 8, 60),
    },
    options: { wait_for_model: true, use_cache: false },
  };
  try {
    const r = await fetch(c.endpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer " + c.hf.token,
        "content-type": "application/json",
        "x-wait-for-model": "true",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (ct.startsWith("image/")) {
      const buf = Buffer.from(await r.arrayBuffer());
      return res.json({
        image: buf.toString("base64"),
        mime: ct.split(";")[0] || "image/jpeg",
        provider: "huggingface",
        model: c.hf.model,
      });
    }
    const txt = await r.text().catch(() => "");
    let j = null;
    try { j = JSON.parse(txt); } catch (e) {}
    if (!r.ok || (j && j.error)) {
      const msg = (j && (j.error || j.message)) || txt.slice(0, 300) || ("HTTP " + r.status);
      throw new Error("HuggingFace respondió " + r.status + ": " + msg);
    }
    const raw = (j && (j.image || j.output || (Array.isArray(j) && j[0] && j[0].image))) || "";
    const b64 = String(raw).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
    if (!b64) throw new Error("HuggingFace no devolvió ninguna imagen.");
    return res.json({ image: b64, mime: "image/jpeg", provider: "huggingface", model: c.hf.model });
  } catch (e) {
    res.status(502).json({
      error: "No pude generar la imagen con HuggingFace. Revisa HF_TOKEN, HF_IMAGE_MODEL y que el modelo esté disponible. " + e.message,
    });
  }
}

app.post("/api/image", async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "Falta el prompt de la imagen." });
    if (containsMinorTerms(prompt)) return rejectMinor(res);

    {
      const idToken = bearerToken(req);
      if (!idToken) {
        return res.status(401).json({ error: "Inicia sesión con una cuenta para generar imágenes." });
      }
      let user;
      try {
        user = await verifyFirebaseToken(idToken);
      } catch (e) {
        return res.status(e.code === "FIREBASE_INVALID_TOKEN" ? 401 : 503).json({ error: e.message });
      }
      if (!user || user.anonymous) {
        return res.status(401).json({ error: "Inicia sesión con una cuenta para generar imágenes." });
      }
      if (!takeImageQuota(user.uid)) {
        return res.status(429).json({ error: "Llegaste al límite diario de imágenes. Vuelve mañana." });
      }
    }

    const c = imageConfig(req.body.provider);
    if (c.provider === "cloudflare") return generateCloudflareImage(req, res, c);
    if (c.provider === "huggingface") return generateHuggingFaceImage(req, res, c);
    if (!c.baseUrl) return res.status(500).json({ error: c.urlError || "Falta configurar SD_URL." });
  try {
    const anime = req.body.style === "anime";
    const requestedModel = String(req.body.model || "").trim();
    const checkpoint = c.checkpoints[requestedModel]
      || (/\.(safetensors|ckpt)\b/i.test(requestedModel) ? requestedModel : "");
    const adult = req.body.adult !== false;
    const safePrompt = prepareImagePrompt(prompt, req.body.style, req.body.tags, { adult });
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
  } catch (e) {
    res.status(500).json({ error: "No pude procesar la solicitud de imagen: " + e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log("Nubbi en http://localhost:" + port));
