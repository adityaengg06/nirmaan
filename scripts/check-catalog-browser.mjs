// Browser QA uses synthetic identities only against the local built server.
import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const base='http://127.0.0.1:8787';
const tabs=await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab=tabs.find(t=>t.type==='page');
const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map();
socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);msg.error?reject(Error(JSON.stringify(msg.error))):resolve(msg.result)}});
function cdp(method,params={}){const id=++next;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;}
async function waitFor(expression){for(let i=0;i<60;i++){if(await evaluate(expression))return;await pause(150)}await shot('browser-failure');console.log(await evaluate('document.body.innerText'));throw Error('Timed out: '+expression)}
async function visit(path){await cdp('Page.navigate',{url:base+path});await waitFor("document.readyState!=='loading'");await pause(600);if(await evaluate("!!document.querySelector('.intro-skip')")){await evaluate("document.querySelector('.intro-skip').click()");await waitFor("!document.querySelector('.intro-overlay')");}assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),path+' overflows horizontally');}
async function shot(name){const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('outputs/'+name+'.png',Buffer.from(result.data,'base64'));}
await mkdir('outputs',{recursive:true});await cdp('Page.enable');await cdp('Network.enable');await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('nirmaan-intro-seen-v1','1')"});
const fixture=JSON.parse(await readFile('outputs/catalog-qa.json','utf8'));
await cdp('Network.setExtraHTTPHeaders',{headers:fixture.issuer});
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await visit('/menu');assert.equal(await evaluate("document.querySelectorAll('[data-design-card]').length"),2);await shot('catalog-menu-desktop');
await evaluate("document.querySelector('.featured-designs').scrollIntoView({block:'start'})");await pause(250);await shot('black-white-designs');
await visit('/designs/menu');const whiteInk=await evaluate("getComputedStyle(document.querySelector('[data-design-card=white-classic] .display-business')).color");const blackInk=await evaluate("getComputedStyle(document.querySelector('[data-design-card=black-signature] .display-business')).color");assert.equal(whiteInk,'rgb(32, 36, 32)');assert.equal(blackInk,'rgb(255, 255, 255)');
assert.equal(await evaluate("document.querySelectorAll('[data-design-card]').length"),10);await shot('ten-designs-desktop');
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
for(const path of ['/reviews','/menu','/id-card','/social','/business-card','/custom','/designs/menu','/designs/id-card']){await visit(path);}
await visit('/id-card');await evaluate("document.querySelector('.featured-designs .design-info .text-link').click()");await waitFor("!!document.querySelector('.design-modal .student-tabs')");await evaluate("Array.from(document.querySelectorAll('.design-modal .student-tabs button')).find(b=>b.textContent==='Attendance').click()");await waitFor("!!document.querySelector('.design-modal .attendance-score')");await shot('id-experience-modal-mobile');await evaluate("document.querySelector('.modal-close').click()");
await visit('/checkout?product=menu&design=black-signature');await waitFor("!!document.querySelector('.checkout-form select')");assert.equal(await evaluate("document.querySelectorAll('.checkout-form select')[1].value"),'black-signature');
await visit('/upload-design?product=menu');await waitFor("!!document.querySelector('.design-mode-toggle .active')");assert.equal(await evaluate("document.querySelector('.design-mode-toggle .active').textContent"),'Upload my own design');
await writeFile('outputs/browser-custom-design.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64'));
const input=await cdp('Runtime.evaluate',{expression:"document.querySelectorAll('.upload-box input[type=file]')[1]"});await cdp('DOM.setFileInputFiles',{objectId:input.result.objectId,files:[process.cwd()+'/outputs/browser-custom-design.png']});await waitFor("document.querySelector('.checkout-form').textContent.includes('browser-custom-design.png')");assert(await evaluate("!!document.querySelector('.uploaded-design-preview')"));await shot('direct-upload-mobile');
await cdp('Network.setExtraHTTPHeaders',{headers:fixture.student});await visit('/student/'+fixture.studentRecordId);await waitFor("!!document.querySelector('.student-tabs')");assert(await evaluate("document.body.textContent.includes('QA Student')"));for(const tabName of ['Results','Fees','Attendance','Profile']){await evaluate("Array.from(document.querySelectorAll('.student-tabs button')).find(b=>b.textContent==='"+tabName+"').click()");await pause(100);assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'));await shot('student-'+tabName.toLowerCase()+'-mobile');}
await cdp('Network.setExtraHTTPHeaders',{headers:fixture.issuer});await visit('/institution');await waitFor("!!document.querySelector('.student-editor')");await shot('institution-mobile');
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await visit('/');await shot('catalog-home-desktop');
socket.close();console.log('PASS: black/white contrast, two featured vs 10 gallery designs, mobile layouts, interactive ID preview, design selection in checkout, actual direct file upload, student record tabs and institution editor.');
