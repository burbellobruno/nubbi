// Uso: con Forge y "npm run dev" andando -> npm run portraits [cantidad]
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/catalog.js"), "utf8"), ctx);
const RAW = ctx.window.NUBBI_RAW;
const EN = [
"adult male vampire, pale skin, red eyes, black coat, arrogant smirk, gothic mansion",
"adult man in sleek black suit, CEO, cold expression, glasses, office at night",
"adult man mafia boss, tailored suit, slicked hair, calm smile, dim lounge",
"adult male literature professor, glasses, cardigan, warm smile, library",
"adult male samurai, long dark hair, haori, katana, stoic, cherry blossoms",
"adult young man, casual hoodie, messy hair, playful grin, cozy apartment",
"adult male demon, small horns, golden eyes, elegant dark clothes, smirk, smoke",
"adult man mechanic, leather jacket, motorcycle, rebellious look",
"adult woman, warm smile, long dark hair, cozy sweater, night sky, moon",
"adult woman art student, shy blush, pink hair, paintbrush, art club room",
"adult woman assassin, black outfit, sharp eyes, short hair, rooftop at night",
"adult female elf mage, long silver hair, pointed ears, robe, glowing magic",
"adult woman streamer, headset, gaming room, neon lights, energetic",
"adult woman CEO, elegant dress, confident look, city skyline",
"adult woman doctor, scrubs, tired kind eyes, hospital corridor",
"adult woman thief, dark cloak, mischievous smile, moonlit rooftops",
"adult androgynous bard, lute, colorful travel clothes, dreamy smile",
"adult android, androgynous, glowing seams, curious expression, white outfit",
"adult androgynous detective, trench coat, sharp eyes, rainy street",
"adult androgynous forest spirit, leaves in hair, soft glow, mystical forest",
"adult androgynous cosmic entity, starry eyes, flowing dark robe, galaxy",
"adult man orphanage guardian, warm tired smile, simple shirt, cozy doorway, gentle eyes",
"adult woman homicide detective, dark blazer, sharp eyes, notebook, night city street",
"adult young man street musician, acoustic guitar, scarf, flirty smile, evening plaza"
];
if (EN.length !== RAW.length) {
  throw new Error("Faltan prompts de retrato: " + EN.length + " para " + RAW.length + " personajes.");
}
const limit = Number(process.argv[2]) || RAW.length;
const dir = path.join(__dirname, "../public/portraits"); fs.mkdirSync(dir, { recursive: true });
(async () => {
  for (let i = 0; i < Math.min(limit, RAW.length); i++) {
    const file = path.join(dir, "p" + i + ".png");
    if (fs.existsSync(file)) { console.log("ya existe", RAW[i][1]); continue; }
    console.log("generando", RAW[i][1], "...");
    const r = await fetch("http://localhost:" + (process.env.PORT || 3000) + "/api/image", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: EN[i] + ", anime style, masterpiece, best quality, upper body portrait, looking at viewer", style: "anime" }),
    });
    const j = await r.json();
    if (j.error) { console.log("error:", j.error); break; }
    fs.writeFileSync(file, Buffer.from(j.image, "base64"));
  }
  console.log("listo");
})();
