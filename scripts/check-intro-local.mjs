// Browser QA uses synthetic identities only against the local built server.
import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const base='http://127.0.0.1:5173';
const tabs=await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab=await (await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map();
socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);msg.error?reject(Error(JSON.stringify(msg.error))):resolve(msg.result)}});
function cdp(method,params={}){const id=++next;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;}
async function waitFor(expression){for(let i=0;i<60;i++){if(await evaluate(expression))return;await pause(150)}await shot('browser-failure');console.log(await evaluate('document.body.innerText'));throw Error('Timed out: '+expression)}
async function visit(path){await cdp('Page.navigate',{url:base+path});await waitFor("document.readyState!=='loading'");await pause(600);assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),path+' overflows horizontally');}
async function shot(name){const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('outputs/'+name+'.png',Buffer.from(result.data,'base64'));}
await mkdir('outputs',{recursive:true});await cdp('Page.enable');await cdp('Network.enable');await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await visit('/');await waitFor("!!document.querySelector('.intro-overlay')");await evaluate("document.querySelector('.intro-skip').click()");await waitFor("!document.querySelector('.intro-overlay')");
await visit('/');await waitFor("!!document.querySelector('.intro-overlay')");await waitFor("document.querySelector('.intro-overlay')?.dataset.phase==='1'");await shot('intro-local5173-scan');await evaluate("document.querySelector('.intro-skip').click()");await waitFor("!document.querySelector('.intro-overlay')");await evaluate("document.querySelector('.hero .text-btn').click()");await waitFor("!!document.querySelector('.intro-overlay')");assert(await evaluate("document.getElementById('site-content').inert"));await evaluate("document.querySelector('.intro-skip').click()");await waitFor("!document.querySelector('.intro-overlay')");assert(!await evaluate("document.getElementById('site-content').inert"));socket.close();console.log('PASS on localhost:5173: initial play, replay after refresh with seen storage, animated QR phase, hero replay button and skip cleanup.');
