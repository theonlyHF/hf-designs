import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve, extname, sep} from 'node:path';

const root = resolve(process.argv[2] || '.');
const stage = process.argv[3] || 'after';
const require = createRequire(process.env.HF_QA_MODULES ? resolve(process.env.HF_QA_MODULES, 'package.json') : import.meta.url);
const engines = require('playwright');
const axe = require.resolve('axe-core/axe.min.js');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if (!file.startsWith(root+sep)) {res.writeHead(403).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}).end(await readFile(file));
  } catch { if(!res.headersSent)res.writeHead(404);res.end(); }
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url = 'http://127.0.0.1:'+server.address().port+'/';
const output = resolve(root,'qa');
const devices = [[360,640],[375,667],[390,844],[412,915],[430,932],[720,1600],[768,1024],[844,390],[1024,768],[1280,720],[1440,900],[1920,1080],[2560,1440],[3440,1440]];
const results = [];
await mkdir(resolve(output,'shots'),{recursive:true});
for (const name of (process.env.HF_ENGINES || 'chromium,firefox,webkit').split(',')) {
  let browser;
  try {
    const edge = process.env.HF_QA_EDGE;
    browser = await engines[name].launch(name==='chromium' && edge ? {executablePath:edge} : {});
    for (const [width,height] of (name==='chromium' ? devices : [[390,844],[1280,720]])) {
      const mobile = width <= 844;
      const page = await browser.newPage({viewport:{width,height}, deviceScaleFactor:mobile?(width===390?3:2):1, hasTouch:mobile,
        reducedMotion:width===375?'reduce':'no-preference', forcedColors:width===412?'active':'none', serviceWorkers:'block'});
      const result = {name,width,height,errors:[],failed:[]};
      results.push(result);
      page.on('pageerror',e=>result.errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)result.failed.push(r.url());});
      await page.route(/https?:\/\/(?!127\.0\.0\.1[:/])/,r=>r.abort());
      await page.addInitScript(()=>{
        window.hfMetrics={lcp:0,cls:0,longTasks:0,maxEvent:0};
        for(const [type,apply] of [
          ['largest-contentful-paint',e=>window.hfMetrics.lcp=e.startTime],
          ['layout-shift',e=>{if(!e.hadRecentInput)window.hfMetrics.cls+=e.value;}],
          ['longtask',e=>window.hfMetrics.longTasks+=Math.max(0,e.duration-50)],
          ['event',e=>{if(e.interactionId)window.hfMetrics.maxEvent=Math.max(window.hfMetrics.maxEvent,e.duration);}]
        ])try{new PerformanceObserver(list=>list.getEntries().forEach(apply)).observe({type,buffered:true,durationThreshold:16});}catch{}
      });
      try {
        if(name==='chromium' && (width===360 || width===1280)) {
          const cdp=await page.context().newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate',{rate:width===360?6:3});
          if(width===360)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:95000});
          result.throttle=width===360?'6× + Slow 4G':'3×';
        }
        const shot = name==='chromium' && [390,1280].includes(width);
        await page.goto(url,{waitUntil:'load'});
        await page.waitForTimeout(width===360?1700:650);
        result.initial = await page.evaluate(()=>{
          const entries=[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')];
          const bytes={};
          for(const item of entries){const key=new URL(item.name).pathname.split('.').at(-1);bytes[key]=(bytes[key]||0)+item.transferSize;}
          return {...window.hfMetrics,requests:entries.length,bytes};
        });
        if(shot) await page.screenshot({path:resolve(output,'shots',stage+'-'+width+'-boot.png')});
        await page.locator('.console-power').click({timeout:12000});
        await page.locator('.screen-scroll:not([inert])').waitFor({timeout:15000});
        result.overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
        result.sizes=await page.locator('.control-dot').evaluateAll(buttons=>buttons.map(b=>Math.min(b.offsetWidth,b.offsetHeight)));
        if(shot){
          await page.screenshot({path:resolve(output,'shots',stage+'-'+width+'-home.png')});
          await page.addScriptTag({path:axe});
          result.axe=await page.evaluate(async()=> (await axe.run()).violations.map(v=>[v.id,v.impact,v.nodes.map(n=>n.target)]));
        }
        await page.evaluate(()=>{location.hash='/banners';});
        await page.locator('.work-card').first().waitFor({timeout:5000});
        if(shot) await page.screenshot({path:resolve(output,'shots',stage+'-'+width+'-gallery.png')});
        await page.locator('.work-card').first().click();
        await page.locator('dialog[open]').waitFor({timeout:4000});
        if(shot) {
          await page.screenshot({path:resolve(output,'shots',stage+'-'+width+'-viewer.png')});
          result.axeViewer=await page.evaluate(async()=> (await axe.run()).violations.map(v=>[v.id,v.impact,v.nodes.map(n=>n.target)]));
        }
        await page.goBack();
        await page.locator('dialog[open]').waitFor({state:'hidden',timeout:3000});
        result.back={hash:new URL(page.url()).hash,dialog:await page.locator('dialog[open]').count()};
        result.interaction=await page.evaluate(()=>window.hfMetrics);
      } catch(error) {result.errors.push(String(error));}
      await page.close();
    }
  } catch(error) {results.push({name,unavailable:String(error)});}
  finally {await browser?.close();}
}
server.close();
await writeFile(resolve(output,stage+'.json'),JSON.stringify(results,null,2));
