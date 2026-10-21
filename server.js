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

function imageConfig() {
  let baseUrl = (process.env.SD_URL || "http://127.0.0.1:7860").trim();
  baseUrl = baseUrl.replace(/\/sdapi\/v1\/txt2img\/?$/i, "").replace(/\/+$/, "");
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
  try { host = baseUrl ? new URL(baseUrl).host : null; } catch (e) {}
  return {
    baseUrl,
    endpoint: baseUrl ? baseUrl + "/sdapi/v1/txt2img" : "",
    isLocal,
    auth,
    timeoutMs,
    checkpoints,
    host,
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
  return { provider: "forge", host: c.host, local: c.isLocal, hasAuth: !!c.auth, timeoutMs: c.timeoutMs };
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

// ---- Imágenes: Forge / A1111 remoto o local con --api
app.get("/api/image/health", async (req, res) => {
  const c = imageConfig();
  if (!c.baseUrl) return res.status(500).json({ ok: false, error: "Falta configurar SD_URL." });
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

app.post("/api/image", async (req, res) => {
  const c = imageConfig();
  if (!c.baseUrl) return res.status(500).json({ error: "Falta configurar SD_URL." });
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
    res.json({ image: j.images[0] });
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
