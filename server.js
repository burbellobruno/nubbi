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
  const isImage = req.path === "/image";
  const ok = rateLimit(ip + (isImage ? ":img" : ":chat"), isImage ? 5 : 20, 60000);
  if (!ok) return res.status(429).json({ error: "Demasiadas solicitudes. Esperá un momento." });
  next();
});

// ---- Chat: cualquier servidor compatible con OpenAI (Ollama, OpenRouter, Groq...)
app.post("/api/chat", async (req, res) => {
  try {
    const baseUrl = process.env.CHAT_BASE_URL || "http://localhost:11434/v1";
    const stream = !!req.body.stream;
    const r = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + (process.env.CHAT_API_KEY || "ollama"),
      },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: String(req.body.prompt || "") }],
        ...(req.body.response_format ? { response_format: req.body.response_format } : {}),
        stream: stream,
        ...(String(process.env.CHAT_MODEL || "").includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
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

// ---- Imágenes: Stable Diffusion local (Forge / A1111 con --api)
app.post("/api/image", async (req, res) => {
  try {
    const url = (process.env.SD_URL || "http://127.0.0.1:7860") + "/sdapi/v1/txt2img";
    const anime = req.body.style === "anime";
    const models = {
      counterfeit: "Counterfeit-V3.0_fp16",
      anything: "anything-v5",
      realistic: "RealisticVision_v5.1",
      chillout: "ChilloutMix_fp16",
      dreamshaper: "DreamShaper_8",
      manhwa: "AImanhwa_v2"
    };
    const checkpoint = models[String(req.body.model || "")];
    const body = {
      prompt: req.body.prompt,
      negative_prompt: "child, minor, young, lowres, bad anatomy, extra fingers, watermark, text",
      width: 512,
      height: 704,
      steps: 25,
      cfg_scale: anime ? 7 : 6,
    };
    if (checkpoint) body.override_settings = { sd_model_checkpoint: checkpoint };
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("El servidor de imágenes respondió " + r.status);
    const j = await r.json();
    res.json({ image: j.images[0] });
  } catch (e) {
    res.status(500).json({ error: "No pude conectar con Stable Diffusion (¿está abierto con --api?). " + e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log("Nubbi en http://localhost:" + port));
