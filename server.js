require("dotenv").config();
const express = require("express");
const characterAge = require("./public/ai-client.js");
const app = express();
app.set("trust proxy", 1);
app.set("x-powered-by", false);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'",
    "script-src 'self' https://www.gstatic.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:",
    "font-src 'self' data:", "media-src 'self' blob:", "worker-src 'self' blob:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://*.web.app",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com https://recaptcha.google.com",
    "form-action 'self'"
  ].join("; "));
  if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
  next();
});
app.use(express.json({ limit: "128kb", strict: true }));
app.use(express.static("public"));
app.use("/api/", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      const source = new URL(origin);
      if (source.host !== req.get("host") || !/^https?:$/.test(source.protocol)) {
        return res.status(403).json({ error: "Origen de la solicitud no permitido." });
      }
    } catch (e) { return res.status(403).json({ error: "Origen de la solicitud no permitido." }); }
  }
  if (!req.is("application/json")) return res.status(415).json({ error: "Envía la solicitud como JSON." });
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object") return res.status(400).json({ error: "Solicitud inválida." });
  if (req.path === "/chat" || req.path === "/image") {
    const max = req.path === "/chat" ? 32000 : 8000;
    if (typeof req.body.prompt !== "string" || !req.body.prompt.trim() || req.body.prompt.length > max) {
      return res.status(400).json({ error: "El texto es obligatorio y debe tener como máximo " + max + " caracteres." });
    }
  }
  next();
});

// Concurrency protects a small free instance; it is not a distributed quota.
const activeRequests = { chat: 0, image: 0 };
app.use("/api/", (req, res, next) => {
  if (req.method !== "POST" || !["/chat", "/image"].includes(req.path)) return next();
  const kind = req.path === "/chat" ? "chat" : "image";
  const limit = kind === "chat" ? 8 : 2;
  if (activeRequests[kind] >= limit) {
    res.setHeader("Retry-After", "5");
    return res.status(429).json({ error: "Hay varias solicitudes en curso. Espera unos segundos." });
  }
  activeRequests[kind]++;
  let released = false;
  const release = () => { if (!released) { released = true; activeRequests[kind]--; } };
  res.once("finish", release); res.once("close", release);
  next();
});

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
  if (!ok) { res.setHeader("Retry-After", "60"); return res.status(429).json({ error: "Demasiadas solicitudes. Espera un momento." }); }
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
    q = { day, count: 0, pending: 0, attempts: 0 };
    imageQuota.set(uid, q);
  }
  return q;
}
// Reserve synchronously before dispatch: concurrent requests share pending slots.
// Failed attempts release the image slot, but still consume a bounded attempt budget.
function reserveImageQuota(uid) {
  const limit = Math.floor(num(process.env.IMAGE_DAILY_LIMIT, 5, 1, 1000));
  const attemptLimit = Math.floor(num(process.env.IMAGE_DAILY_ATTEMPT_LIMIT, limit * 2, limit, 10000));
  const q = imageQuotaFor(uid);
  if (q.count + q.pending >= limit || q.attempts >= attemptLimit) return null;
  q.pending++;
  q.attempts++;
  let settled = false;
  function settle(success) {
    if (settled) return false;
    settled = true;
    q.pending--;
    if (success) q.count++;
    return true;
  }
  // Capture the original daily bucket so a late completion cannot modify the next day.
  return { commit: () => settle(true), release: () => settle(false) };
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
  const issue = characterAge.NubbiImageAgeIssue(raw);
  if (issue) throw new Error(issue.message);
  const ageText = characterAge.NubbiExtractAges(raw)[0] + " years old";
  const profile = imageStyleProfile(style);
  cleaned = ageText + (profile ? ", " + profile.promptHint : "") + ", " + characterAge.NubbiNormalizeAgeText(cleaned);
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

// El cliente solo puede elegir modelos de esta allowlist. Si no se define
// CHAT_MODEL_ALLOWLIST, solo se permite el modelo configurado en CHAT_MODEL.
function chatModelAllowlist(defaultModel) {
  const allow = new Set((process.env.CHAT_MODEL_ALLOWLIST || "")
    .split(",").map(s => s.trim()).filter(Boolean));
  if (defaultModel) allow.add(defaultModel);
  return allow;
}

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
const CF_IMAGE_MODELS = [
  { id: CF_DEFAULT_MODEL, name: "FLUX.1 schnell · rápido", engine: "flux", styles: ["realista", "semi-realista", "pintura digital"], consumption: "bajo" },
  { id: "@cf/leonardo/lucid-origin", name: "Lucid Origin · ilustración", engine: "lucid", styles: ["anime", "webtoon", "manhwa", "manga", "bl", "furry", "3d", "pintura digital", "semi-realista"], consumption: "alto" },
  { id: "@cf/leonardo/phoenix-1.0", name: "Phoenix 1.0 · detalle", engine: "phoenix", styles: ["realista", "semi-realista", "pintura digital"], consumption: "alto" }
];
// Style guidance is composition, not a guarantee of model quality. No provider
// retry/fan-out is performed: an explicit model choice always takes precedence.
const IMAGE_STYLE_PROFILES = [
  { id: "anime", label: "Anime", promptHint: "anime illustration, clean line art, expressive facial features, cel shading" },
  { id: "webtoon", label: "Webtoon", promptHint: "full-color webtoon illustration, clean outlines, expressive character acting, cinematic color gradients" },
  { id: "manhwa", label: "Manhwa", promptHint: "Korean manhwa illustration, refined linework, expressive eyes, luminous color shading" },
  { id: "manga", label: "Manga", promptHint: "black-and-white manga illustration, ink line art, screentone shading, expressive composition" },
  { id: "bl", label: "BL · romance", promptHint: "romantic character illustration, tender emotion, expressive gaze, fully clothed adult characters" },
  { id: "realista", label: "Realista", promptHint: "photorealistic portrait, natural skin texture, believable anatomy, cinematic natural lighting" },
  { id: "3d", label: "3D", promptHint: "stylized 3D character render, sculpted forms, physically based materials, soft studio lighting" },
  { id: "semi-realista", label: "Semirealista", promptHint: "semi-realistic character illustration, painterly detail, believable proportions, cinematic lighting" },
  { id: "furry", label: "Furry antropomórfico", promptHint: "anthropomorphic character illustration, expressive animal face, upright human-like posture, detailed fur, fully clothed" },
  { id: "pintura digital", label: "Fantasía", promptHint: "digital fantasy painting, richly textured brushwork, atmospheric depth, cinematic composition" }
];
function imageStyleProfile(value) {
  const style = String(value || "").trim().toLowerCase();
  const aliases = { "semirealista": "semi-realista", "semi realista": "semi-realista", "manwha": "manhwa", "furry antropomorfico": "furry", "furry antropomórfico": "furry", "boys love": "bl", "boy's love": "bl", "3d render": "3d" };
  return IMAGE_STYLE_PROFILES.find(profile => profile.id === (aliases[style] || style)) || null;
}
function recommendedImageModel(style) {
  const profile = imageStyleProfile(style);
  return profile && profile.id !== "realista" ? "@cf/leonardo/lucid-origin" : CF_DEFAULT_MODEL;
}
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

function cloudflareConfig(modelOverride) {
  const accountId = (process.env.CF_ACCOUNT_ID || "").trim();
  const apiToken = (process.env.CF_API_TOKEN || "").trim();
  const model = modelOverride || (process.env.CF_IMAGE_MODEL || CF_DEFAULT_MODEL).trim() || CF_DEFAULT_MODEL;
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
    models: Array.from(chatModelAllowlist(def.model)),
    hasApiKey: !!def.apiKey,
    local: def.isLocal,
    adultConfigured: adult.dedicated,
    adultProvider: adult.dedicated ? adult.provider : null,
    adultModel: adult.dedicated ? adult.model : null,
    adultHasApiKey: adult.dedicated ? !!adult.apiKey : false,
    image: imageInfo(),
  });
});

function validateStoryMessages(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length < 2 || value.length > 42) throw new Error("La conversación estructurada no tiene un formato válido.");
  let size = 0;
  return value.map((message, index) => {
    if (!message || Array.isArray(message) || typeof message !== "object"
      || typeof message.content !== "string" || !message.content.trim()
      || (index === 0 ? message.role !== "system" : !["user", "assistant"].includes(message.role))
      || Object.keys(message).some(key => !["role", "content"].includes(key))) throw new Error("La conversación contiene un mensaje no permitido.");
    size += message.content.length;
    if (size > 32000) throw new Error("La conversación excede el presupuesto de contexto.");
    return { role: message.role, content: message.content };
  });
}

app.post("/api/chat", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  if (timeout.unref) timeout.unref();
  const disconnect = () => { if (!res.writableEnded) controller.abort(); };
  res.once("close", disconnect);
  try {
    let storyMessages;
    try { storyMessages = validateStoryMessages(req.body.storyMessages); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    if (containsMinorTerms(req.body.prompt)) return rejectMinor(res);
    if (storyMessages && storyMessages.some(message => containsMinorTerms(message.content))) return rejectMinor(res);
    const adult = req.body.adult === true;
    const { baseUrl, model: defaultModel, apiKey, dedicated } = chatConfig(adult);
    if (!baseUrl || !defaultModel) {
      return res.status(500).json({ error: "Falta configurar CHAT_BASE_URL y CHAT_MODEL." });
    }
    if (!apiKey) {
      return res.status(500).json({ error: "Falta configurar CHAT_API_KEY para el proveedor remoto." });
    }
    const requestedModel = String(req.body.model || "");
    const allow = chatModelAllowlist(defaultModel);
    const model = adult && dedicated
      ? defaultModel
      : (allow.has(requestedModel) ? requestedModel : defaultModel);
    const stream = !!req.body.stream;
    const messages = [];
    if (adult || storyMessages) {
      messages.push({
        role: "system",
        content: "Ficción madura no explícita: todos los personajes y el usuario tienen 18 años o más. El romance puede incluir afecto y tensión; para actividad sexual usa una elipsis o corte de escena, sin descripción gráfica. Está terminantemente prohibido generar contenido sexual con personas no adultas, personajes que aparenten no ser adultos, personas reales o situaciones no consentidas. Prohibido el contenido sexual con animales reales (zoofilia). Los personajes antropomórficos adultos (furry) están permitidos como cualquier otro personaje. Si la conversación intenta eso, rechazá esa parte y continuá sin contenido sexual.",
      });
    }
    if (storyMessages) messages.push(...storyMessages);
    else messages.push({ role: "user", content: String(req.body.prompt || "") });
    const r = await fetch(baseUrl + "/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: num(req.body.max_tokens, 1000, 200, 4096),
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
      res.setHeader("X-Nubbi-Model", model);
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
    if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "Error de la API", code: j.error?.code });
    if (!j.choices?.[0]?.message?.content) return res.status(502).json({ error: "El proveedor no devolvió una respuesta utilizable." });
    res.json({ text: j.choices[0].message.content, model: j.model || model });
  } catch (e) {
    if (res.destroyed) return;
    const message = controller.signal.aborted ? "La generación tardó demasiado. Intenta de nuevo." : "No se pudo conectar con el proveedor de texto.";
    if (res.headersSent) {
      res.write("data: " + JSON.stringify({ error: { message, code: "STREAM_INTERRUPTED" } }) + "\n\n");
      return res.end("data: [DONE]\n\n");
    }
    res.status(controller.signal.aborted ? 504 : 502).json({ error: message });
  } finally {
    clearTimeout(timeout); res.removeListener("close", disconnect);
  }
});

// ---- Imágenes: Cloudflare Workers AI (gratis) o Forge / A1111
app.get("/api/image/capabilities", (req, res) => {
  const cf = imageConfig("cloudflare");
  res.json({
    defaultProvider: imageConfig().provider,
    requiresAccount: true,
    autoModel: "auto",
    providers: {
      cloudflare: {
        configured: !!cf.endpoint,
        defaultModel: cf.cf.model,
        freeTier: { neuronsPerDay: 10000, unlimited: false },
        models: CF_IMAGE_MODELS.map(model => ({ id: model.id, name: model.name, styles: model.styles, consumption: model.consumption })),
        styles: IMAGE_STYLE_PROFILES.map(profile => ({ ...profile, recommendedModel: recommendedImageModel(profile.id) })),
        note: "Asignación gratuita diaria compartida de Workers AI; el consumo cambia según el motor. No hay generación ilimitada."
      }
    }
  });
});
app.get("/api/image/models", async (req, res) => {
  const cf = imageConfig("cloudflare");
  const forge = imageConfig("forge");
  const hf = imageConfig("huggingface");
  const out = {
    defaultProvider: imageConfig().provider,
    dailyLimit: Math.floor(num(process.env.IMAGE_DAILY_LIMIT, 5, 1, 1000)),
    requiresAccount: true,
    providers: {
      cloudflare: {
        available: !!cf.endpoint,
        configured: !!cf.endpoint,
        model: cf.cf.model,
        models: CF_IMAGE_MODELS.map(m => ({ title: m.id, name: m.name, styles: m.styles, consumption: m.consumption })),
        free: true,
        autoModel: "auto",
        freeTier: { neuronsPerDay: 10000, unlimited: false },
        note: "FLUX.1 schnell para rapidez; Lucid Origin para estilos ilustrados. Asignación gratuita diaria compartida, no ilimitada. Sin imágenes explícitas.",
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

// Build the complete Forge request before reserving any image/attempt capacity.
function prepareForgeRequest(req, c, safePrompt) {
  const aliases = (process.env.SD_CHECKPOINTS || "").trim();
  if (aliases) {
    try {
      const parsed = JSON.parse(aliases);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid mapping");
    } catch (error) {
      return { status: 500, error: "La configuración de aliases de Forge no es un objeto JSON válido." };
    }
  }
  const raw = req.body.model;
  if (raw != null && typeof raw !== "string") return { status: 400, error: "El modelo de Forge debe ser texto." };
  const requested = (raw || "").trim();
  if (!characterAge.NubbiIsValidImageModelForProvider("forge", requested)
      || /[\x00-\x1f\x7f]/.test(requested)
      || Object.prototype.hasOwnProperty.call(Object.prototype, requested)
      || requested === "prototype") return { status: 400, error: "Ese modelo no corresponde a Forge." };
  let checkpoint = "";
  if (requested) {
    checkpoint = Object.prototype.hasOwnProperty.call(c.checkpoints, requested) ? c.checkpoints[requested] : requested;
    if (typeof checkpoint !== "string" || !checkpoint.trim()
        || !characterAge.NubbiIsValidImageModelForProvider("forge", checkpoint)
        || /[\x00-\x1f\x7f]/.test(checkpoint)) {
      return { status: 500, error: "El alias de checkpoint de Forge tiene una configuración inválida." };
    }
    checkpoint = checkpoint.trim();
  }
  function parameter(key, fallback, min, max, integer) {
    if (req.body[key] === undefined) return fallback;
    const value = req.body[key];
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") throw new Error(key);
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || integer && !Number.isInteger(n)) throw new Error(key);
    return n;
  }
  let body;
  try {
    body = { prompt: safePrompt,
      negative_prompt: (process.env.SD_NEGATIVE || "child, minor, underage, teen, loli, shota, kid, lowres, bad anatomy, extra fingers, watermark, text").slice(0, 1200),
      width: parameter("width", 512, 256, 1024, true),
      height: parameter("height", 704, 256, 1344, true),
      steps: parameter("steps", 25, 8, 60, true),
      cfg_scale: parameter("cfg_scale", req.body.style === "anime" ? 7 : 6, 1, 20, false),
    };
    if (checkpoint) body.override_settings = { sd_model_checkpoint: checkpoint };
    if (req.body.seed !== undefined) body.seed = parameter("seed", -1, -1, 2147483647, true);
  } catch (error) {
    return { status: 400, error: "El parámetro de Forge " + error.message + " no es válido." };
  }
  const headers = sdHeaders();
  if (Object.values(headers).some(value => /[^\x20-\x7e]/.test(value))) return { status: 500, error: "La autenticación de Forge tiene un formato inválido." };
  return { body, headers };
}

function imagePreflight(req) {
  let c = imageConfig(req.body.provider);
  if (c.provider === "cloudflare") {
    const requested = String(req.body.model || "").trim();
    if (requested === "auto") {
      const cf = cloudflareConfig(recommendedImageModel(req.body.style));
      c = { ...c, cf, endpoint: cf.endpoint, urlError: cf.error };
    } else if (requested && requested !== c.cf.model) {
      const selection = CF_IMAGE_MODELS.find(m => m.id === requested);
      if (selection) {
        const cf = cloudflareConfig(selection.id);
        c = { ...c, cf, endpoint: cf.endpoint, urlError: cf.error };
      } else if (/^@cf\//i.test(requested)) {
        // Un modelo guardado puede desaparecer de la whitelist. Usamos el
        // modelo configurado si sigue permitido; si no, el default seguro.
        const fallback = CF_IMAGE_MODELS.some(m => m.id === c.cf.model) ? c.cf.model : CF_DEFAULT_MODEL;
        const cf = cloudflareConfig(fallback);
        c = { ...c, cf, endpoint: cf.endpoint, urlError: cf.error };
      } else {
        return { status: 400, error: "Ese modelo de imagen no está permitido." };
      }
    }

  }
  if (!c.endpoint) return { status: 500, error: c.urlError || "Falta configurar el proveedor de imágenes." };
  if (!Number.isInteger(c.timeoutMs)) return { status: 500, error: "El tiempo de espera de imágenes debe ser un número entero." };
  const endpoint = new URL(c.endpoint);
  if (!/^https?:$/.test(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.hash || endpoint.search) {
    return { status: 500, error: "La URL del proveedor de imágenes tiene una configuración no admitida." };
  }
  // Finish local prompt validation before reserving quota. No provider calls occur here.
  const safePrompt = prepareImagePrompt(req.body.prompt, req.body.style, req.body.tags, { cloudflare: c.provider === "cloudflare", adult: req.body.adult !== false });
  const forge = c.provider === "forge" ? prepareForgeRequest(req, c, safePrompt) : null;
  if (forge && forge.error) return forge;
  return { config: c, forge };
}

// Reject empty and obvious non-image provider payloads without adding a decoder dependency.
function checkedImageBytes(buffer) {
  const png = buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString("ascii", 12, 16) === "IHDR";
  const jpeg = buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const webp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  const gif = buffer.length >= 13 && /^(GIF87a|GIF89a)$/.test(buffer.toString("ascii", 0, 6));
  if (!png && !jpeg && !webp && !gif) throw new Error("El proveedor no devolvió una imagen reconocible.");
  return buffer;
}

function checkedBase64Image(raw) {
  if (typeof raw !== "string") throw new Error("El proveedor devolvió una imagen inválida.");
  const value = raw.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || !Buffer.from(value, "base64").length) {
    throw new Error("El proveedor no devolvió una imagen utilizable.");
  }
  checkedImageBytes(Buffer.from(value, "base64"));
  return value;
}

async function generateCloudflareImage(req, res, c, onImage) {
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
      body: JSON.stringify(c.cf.model === "@cf/leonardo/lucid-origin"
        ? { prompt: safePrompt, width: 768, height: 1024, num_steps: 20 }
        : c.cf.model === "@cf/leonardo/phoenix-1.0"
          ? { prompt: safePrompt, width: 768, height: 1024, num_steps: 25, negative_prompt: "child, minor, underage, teen, loli, shota, kid, lowres, bad anatomy, watermark" }
          : { prompt: safePrompt, steps: c.cf.steps }),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (r.ok && ct.startsWith("image/")) {
      const buf = Buffer.from(await r.arrayBuffer());
      checkedImageBytes(buf);
      onImage();
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
    const b64 = checkedBase64Image(raw);
    if (!b64) throw new Error("Cloudflare no devolvió ninguna imagen.");
    onImage();
    res.json({ image: b64, mime: "image/jpeg", provider: "cloudflare", model: c.cf.model });
  } catch (e) {
    const filterHint = /NSFW|safety|content|policy|blocked|filter|sensitive/i.test(e.message)
      ? " Cloudflare bloquea imágenes explícitas; probá un retrato sugerente o usá Forge."
      : " Revisá CF_ACCOUNT_ID, CF_API_TOKEN y la cuota diaria de Workers AI.";
    res.status(502).json({ error: "No pude generar la imagen con Cloudflare." + filterHint + " " + e.message });
  }
}

async function generateHuggingFaceImage(req, res, c, onImage) {
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
    if (r.ok && ct.startsWith("image/")) {
      const buf = Buffer.from(await r.arrayBuffer());
      checkedImageBytes(buf);
      onImage();
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
    const b64 = checkedBase64Image(raw);
    if (!b64) throw new Error("HuggingFace no devolvió ninguna imagen.");
    onImage();
    return res.json({ image: b64, mime: "image/jpeg", provider: "huggingface", model: c.hf.model });
  } catch (e) {
    res.status(502).json({
      error: "No pude generar la imagen con HuggingFace. Revisa HF_TOKEN, HF_IMAGE_MODEL y que el modelo esté disponible. " + e.message,
    });
  }
}

app.post("/api/image", async (req, res) => {
  let reservation = null;
  let imageUser;
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
      const ageIssue = characterAge.NubbiImageAgeIssue(prompt);
      if (ageIssue) return res.status(400).json({ error: ageIssue.message, code: ageIssue.code });
      imageUser = user;
    }

    const preflight = imagePreflight(req);
    if (preflight.error) return res.status(preflight.status).json({ error: preflight.error });
    const c = preflight.config;
    reservation = reserveImageQuota(imageUser.uid);
    if (!reservation) return res.status(429).json({ error: "Alcanzaste el límite diario de imágenes o intentos. Vuelve mañana.", code: "IMAGE_QUOTA" });
    if (c.provider === "cloudflare") return await generateCloudflareImage(req, res, c, reservation.commit);
    if (c.provider === "huggingface") return await generateHuggingFaceImage(req, res, c, reservation.commit);
  try {
    const r = await fetch(c.endpoint, {
      method: "POST",
      headers: preflight.forge.headers,
      body: JSON.stringify(preflight.forge.body),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error("Forge respondió " + r.status + (txt ? ": " + txt.slice(0, 200) : ""));
    }
    const j = await r.json();
    if (!j.images || !j.images[0]) throw new Error("Forge no devolvió ninguna imagen.");
    const image = checkedBase64Image(j.images[0]);
    reservation.commit();
    res.json({ image, mime: "image/png", provider: "forge" });
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
  } finally {
    // Idempotent: a committed image is never refunded by finish/error/disconnect paths.
    if (reservation) reservation.release();
  }
});

const port = process.env.PORT || 3001;
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.type === "entity.too.large" ? 413 : err instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 413 ? "La solicitud es demasiado grande." : status === 400 ? "El JSON de la solicitud no es válido." : "No se pudo procesar la solicitud." });
});
app.listen(port, () => console.log("Nubbi en http://localhost:" + port));
