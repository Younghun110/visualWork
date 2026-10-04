const {chromium}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {createForm,validate}=require('../src/model');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 let model=createForm(),version=1,exported=false;
 await page.exposeFunction('hostMessage',message=>{
   if(message.type==='export'){exported=true;return null;}
   if(message.type==='edit'){assert.equal(message.version,version);model=validate(message.model);version++;}
   return {type:'model',model,version};
 });
 await page.addInitScript(()=>{window.acquireVsCodeApi=()=>({postMessage:async message=>{const data=await window.hostMessage(message);if(data)window.dispatchEvent(new MessageEvent('message',{data}));}});});
 const html=fs.readFileSync(path.join(__dirname,'../media/designer.html'),'utf8').replaceAll('__CSP__',"'self'").replaceAll('__NONCE__','testnonce').replace('__CSS__','http://localhost:5179/designer.css').replace('__LAYOUT__','http://localhost:5179/layout.js').replace('__JS__','http://localhost:5179/designer.js');
 await page.route('http://localhost:5179/**',route=>{const name=new URL(route.request().url()).pathname.slice(1);return route.fulfill({contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html',body:name?fs.readFileSync(path.join(__dirname,'../media',name),'utf8'):html});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5179/');await page.locator('.field').nth(1).waitFor();
 await page.locator('[data-type=input]').dragTo(page.locator('#fields'),{targetPosition:{x:360,y:100}});
 await page.waitForFunction(()=>document.querySelectorAll('.component').length===4);
 assert(model.components.some(node=>node.type==='input'&&node.position?.x===360&&node.position?.y===100));
 await page.locator('#label').fill('나이');await page.locator('#label').press('Tab');
 await page.waitForFunction(()=>document.querySelector('.selected .caption').textContent==='나이');
 await page.locator('#type').selectOption('number');
 await page.locator('[data-type=container]').click();
 await page.waitForFunction(()=>document.querySelector('.selected .caption').textContent==='Container · Flow Layout');
 await page.locator('[data-type=text]').click();
 await page.waitForFunction(()=>document.querySelector('.selected .preview-text'));
 await page.locator('#text').fill('안내');await page.locator('#text').press('Tab');
 await page.waitForFunction(()=>document.querySelector('.selected .preview-text').textContent==='안내');
 await page.locator('[data-type=grid]').dragTo(page.locator('#canvas'));
 await page.waitForFunction(()=>document.querySelector('.selected .caption').textContent==='Grid · 2행 × 2열');
 const input=page.locator('[data-id="'+model.components.find(node=>node.type==='input'&&node.field==='field_1').id+'"]');
 await input.dragTo(page.locator('[data-id^="cell_"] .drop-zone').first());
 await page.waitForFunction(()=>document.querySelector('[data-id^="cell_"] .component .caption')?.textContent==='나이');
 await page.locator('#export').click();assert(exported);
 await page.screenshot({path:'/tmp/visualweb-designer.png',fullPage:true});
 assert.equal(model.fields.length,3);assert.deepEqual(errors,[]);
 console.log('PASS: designer load/add/select/properties/reorder/delete/export; no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
