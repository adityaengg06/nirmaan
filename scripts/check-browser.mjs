// Browser QA uses synthetic identities only against the local built server.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
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
async function visit(path){await cdp('Page.navigate',{url:base+path});await waitFor("document.readyState==='complete'");await pause(600);if(await evaluate("!!document.querySelector('.intro-skip')")){await evaluate("document.querySelector('.intro-skip').click()");await waitFor("!document.querySelector('.intro-overlay')");}assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),path+' overflows horizontally');}
async function shot(name){const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('outputs/'+name+'.png',Buffer.from(result.data,'base64'));}
await mkdir('outputs',{recursive:true});await cdp('Page.enable');await cdp('Network.enable');await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('nirmaan-intro-seen-v1','1')"});
const user={'oai-authenticated-user-id':'browser-qa-'+crypto.randomUUID(),'oai-authenticated-user-email':'browser@example.test'};
await cdp('Network.setExtraHTTPHeaders',{headers:user});
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await visit('/create-account');await waitFor("!!document.querySelector('.signup-card form')");await shot('signup-mobile');
const address={recipient:'Browser QA',phone:'9876543210',line1:'12 Test Building',line2:'Test Road',landmark:'Near the park',city:'Lucknow',district:'Lucknow',state:'Uttar Pradesh',pincode:'226001',country:'India'};
const profile={name:'Browser QA',phone:'9876543210',business:'The Daily Brew',address};
const saved=await fetch(base+'/api/profile',{method:'POST',headers:{...user,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(profile)});assert.equal(saved.status,200);
await visit('/checkout?product=menu');await waitFor("!!document.querySelector('.checkout-form input[type=url]')");
await evaluate("(()=>{const input=document.querySelector('.checkout-form input[type=url]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'https://example.com/menu');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()");
await pause(150);await evaluate("document.querySelector('.checkout-actions button[type=submit]').click()");
await waitFor("document.querySelector('.checkout-form h2')?.textContent==='Where should it arrive?'");
await evaluate("document.querySelector('.checkout-actions button[type=submit]').click()");
await waitFor("!!document.querySelector('.checkout-plan')");
assert(await evaluate("document.querySelector('.checkout-plan').textContent.includes('₹99')"));assert(await evaluate("document.querySelector('.terms-checkbox input').required"));
assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'checkout summary overflows');
await evaluate("document.querySelector('.checkout-plan').scrollIntoView({block:'start'})");await pause(300);await shot('checkout-summary-mobile');
for(const [path,name] of [['/menu','menu-mobile'],['/social','social-mobile'],['/id-card','id-card-mobile'],['/business-card','business-mobile'],['/renewals','locked-renewals-mobile']]){await visit(path);if(path==='/renewals')await waitFor("document.body.textContent.includes('unlocks after purchase')");await shot(name)}
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await visit('/');await shot('home-desktop');await visit('/menu');await shot('menu-desktop');
await cdp('Network.setExtraHTTPHeaders',{headers:{'oai-authenticated-user-id':'qa-admin','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'}});await visit('/admin');await waitFor("!!document.querySelector('.stat-grid')");await shot('admin-desktop');
socket.close();console.log('PASS: mobile account creation, checkout steps 1–3, required terms, no horizontal overflow, menu/social/ID/business pages, locked renewals, desktop storefront and admin dashboard. Screenshots saved to outputs/.');
