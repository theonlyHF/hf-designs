import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';

const req=createRequire(process.env.HF_QA_MODULES ? resolve(process.env.HF_QA_MODULES,'package.json') : import.meta.url);
const {chromium}=req('playwright');
const base=process.argv[2] || 'http://127.0.0.1:4173/';
const result=[];
const browser=await chromium.launch();
try {
  for(const rate of [1,3,6]){
    const phone=rate===6;
    const page=await browser.newPage({viewport:phone?{width:360,height:640}:{width:1280,height:720},hasTouch:phone,deviceScaleFactor:phone?2:1});
    await page.addInitScript(()=>{
      window.hfFirstAudio=null;
      const nativeStart=window.OscillatorNode.prototype.start;
      window.OscillatorNode.prototype.start=function(...args){
        if(window.hfFirstAudio===null)window.hfFirstAudio=performance.now();
        return nativeStart.apply(this,args);
      };
      window.addEventListener('click',event=>{
        if(event.target.closest('.console-power'))window.hfBootPress=performance.now();
      },true);
    });
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate});
    if(phone)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:95000});
    await cdp.send('Performance.enable');
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.locator('.console-power').click({timeout:12000});
    await page.locator('.screen-scroll:not([inert])').waitFor({timeout:15000});
    const audio=await page.evaluate(()=>window.hfFirstAudio===null?null:Math.round(window.hfFirstAudio-window.hfBootPress));
    const getHeap=async()=>{
      await cdp.send('HeapProfiler.collectGarbage');
      return (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize').value;
    };
    const fromHeap=await getHeap();
    const nav=await page.evaluate(async(count)=>{
      let recorder;
      const effect=window.hfTransition;
      window.hfTransition=async function(...args){
        const started=performance.now();
        let frames=0, frame;
        const tick=()=>{frames++;frame=requestAnimationFrame(tick);};
        frame=requestAnimationFrame(tick);
        try { return await effect(...args); }
        finally {cancelAnimationFrame(frame);recorder?.({length:performance.now()-started,frames});}
      };
      const runs=[];
      for(let i=0;i<count;i++){
        runs.push(await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Navegação não concluiu')),5000);
          recorder=data=>{clearTimeout(timer);resolve(data);};
          location.hash=i%2?'/':'/banners';
        }));
      }
      return runs;
    },rate===1?100:12);
    const toHeap=await getHeap();
    const average=(items)=>items.reduce((a,b)=>a+b,0)/items.length;
    result.push({rate,views:nav.length,bootAudioMs:audio, fps:average(nav.map(r=>r.frames*1000/r.length)),
      averageTransitionMs:average(nav.map(r=>r.length)), heapBefore:fromHeap, heapAfter:toHeap, errors});
    await page.close();
  }
} finally{await browser.close();}
await writeFile(process.argv[3] || 'qa/profile.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
