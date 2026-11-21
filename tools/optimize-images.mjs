import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const require = createRequire(process.env.HF_QA_MODULES
  ? resolve(process.env.HF_QA_MODULES, "package.json")
  : import.meta.url);
const sharp = require("sharp");
const base = resolve(process.argv[2] || ".");
const assets = join(base,"assets");
const originals = join(assets,"designs");
const thumbs = join(originals,"thumbs");
await mkdir(thumbs,{recursive:true});
const script = await readFile(join(base,"data/designs.js"),"utf8");
const current = await readFile(join(base,"data/thumbnails.js"),"utf8");
const items = JSON.parse(script.slice(script.indexOf("window.HF_DESIGNS =")+"window.HF_DESIGNS =".length).trim().replace(/;$/,""));
const metadata = JSON.parse(current.slice(current.indexOf("=")+1).trim().replace(/;$/,""));
for (const {arquivo} of items) {
  if (!/^[^\\/:*?"<>|]+\.(png|jpe?g|gif|webp|avif)$/i.test(arquivo)) continue;
  const input = join(originals,arquivo);
  const {width,height} = await sharp(input).metadata();
  const variants = [];
  for (const size of [...new Set([480,768,1200,1920].map(w=>Math.min(w,width)))]) {
    const name = arquivo + "." + size + ".webp";
    await sharp(input).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:78}).toFile(join(thumbs,name));
    variants.push([name,size]);
  }
  const stats = await sharp(input).resize(32,32,{fit:"inside"}).png().toBuffer().then(img=>sharp(img).stats());
  const dominant = "#" + ["r","g","b"].map(key=>stats.dominant[key].toString(16).padStart(2,"0")).join("");
  metadata[arquivo] = [...(metadata[arquivo] || [null,width,height]).slice(0,3), variants, dominant];
}
await writeFile(join(base,"data/thumbnails.js"),"window.HF_THUMBNAILS = "+JSON.stringify(metadata)+";\n");

const logo = await readFile(join(assets,"hf-mark.svg"));
for (const size of [32,180,192,512]) {
  const mark = await sharp(logo,{density:240}).resize({width:Math.round(size*.57)}).png().toBuffer();
  await sharp({create:{width:size,height:size,channels:4,background:"#11151d"}})
    .composite([{input:mark,gravity:"centre"}]).png().toFile(join(assets,"icon-"+size+".png"));
}
const preview = await sharp(join(assets,"hf-social-preview.png")).resize(480,480).png().toBuffer();
await sharp({create:{width:1200,height:630,channels:4,background:"#11151d"}})
  .composite([{input:preview,gravity:"centre"}]).png().toFile(join(assets,"hf-social-wide.png"));
