import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require = createRequire(process.env.HF_QA_MODULES ? resolve(process.env.HF_QA_MODULES,'package.json') : import.meta.url);
const {chromium} = require('playwright');
const target = process.argv[2] || 'http://127.0.0.1:4175/';
const browser = await chromium.launch();
try {
  for(const mobile of [false,true]){
    const page = await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:720},
      deviceScaleFactor:mobile?3:1,hasTouch:mobile,reducedMotion:'reduce'});
    const messages=[], requests=[];
    page.on('pageerror',e=>messages.push(e.message));
    page.on('request',r=>requests.push(new URL(r.url()).pathname));
    const response = await page.goto(target);
    assert.equal(response.status(),200);
    assert.equal(requests.some(url=>url.endsWith('.wav')),false);
    assert.equal(await page.locator('.console-power').evaluate(el=>el===document.activeElement),true);
    await page.locator('.console-power').click();
    await page.locator('.screen-scroll:not([inert])').waitFor();
    const cover=page.locator('.game-cover.is-centered');
    assert.equal(await cover.getAttribute('data-collection'),'posters');
    assert.equal(await cover.getAttribute('data-case-type'),'dvd');
    assert.equal(await cover.locator('.disc-title').textContent(),'Teste');
    assert.equal(await cover.evaluate(el=>el.style.getPropertyValue('--custom-disc-hole')),'20%');
    const discArt=await cover.locator('.custom-disc-art').getAttribute('src');
    assert.match(discArt,/qa-arte\.png$/);
    if (mobile) await cover.locator('.case-hit').tap();
    else await cover.locator('.case-trigger').press('Enter');
    const disc=cover.locator('.disc-link');
    await disc.focus();
    await disc.press('Enter');
    await page.waitForURL('**/#/posters');
    await page.locator('.work-card').first().waitFor();
    if(!requests.some(path=>path.endsWith('qa-onda.wav'))) await page.waitForRequest(r=>r.url().endsWith('qa-onda.wav'),{timeout:3500}).catch(error=>{
      if(!requests.some(path=>path.endsWith('qa-onda.wav')))throw error;
    });
    await page.locator('.work-card').first().click();
    await page.locator('dialog[open]').waitFor();
    await page.goBack();
    await page.locator('dialog[open]').waitFor({state:'hidden'});
    assert.match(page.url(),/#\/posters$/);
    await page.reload();
    await page.locator('.screen-scroll:not([inert])').waitFor();
    assert.equal(await page.locator('.console-power').innerText().then(s=>s.includes('Desligar')),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual(messages,[]);
    console.log('OK',mobile?'celular':'desktop','boot, capa inicial, tipo de caixa, arte/rótulo do CD, solicitação da faixa, Voltar, sessão');
    await page.close();
  }
  const noScript = await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(target);
  assert.equal(await noScript.getByRole('heading',{name:'Obras do catálogo'}).isVisible(),true);
  await noScript.close();
  const missing = await browser.newPage();
  await missing.route('**/data/designs.js',route=>route.abort());
  await missing.route('**/js/audio.js*',route=>route.abort());
  await missing.goto(target+'?boot=0#/designs');
  assert.equal(await missing.getByText('Nenhum trabalho por aqui ainda.').isVisible(),true);
  await missing.close();
  console.log('OK fallback sem JavaScript e navegação após falhas de catálogo e áudio');
} finally {await browser.close();}
