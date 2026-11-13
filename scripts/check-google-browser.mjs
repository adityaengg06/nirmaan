// Local UI contract tests. GIS is stubbed only inside this browser tab; the
// server still verifies every real credential. Real cryptography is tested by
// check-google-auth.mjs. No production identity or database is modified.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.NIRMAAN_QA_BASE||'http://localhost:5173';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const tab=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let next=0;const pending=new Map(),exceptions=[],requests=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(JSON.stringify(message.error))):resolve(message.result)}if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text)});
function cdp(method,params={}){const id=++next;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value}
async function waitFor(expression){for(let n=0;n<80;n++){if(await evaluate(expression))return;await pause(100)}throw Error('Timed out: '+expression+'\n'+await evaluate('document.body.innerText'))}
async function visit(path){await cdp('Page.navigate',{url:base+path});await waitFor("document.readyState==='complete'&&!!document.querySelector('h1')");await pause(350);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),path+' overflows');assert(!await evaluate("document.body.innerText.includes('Continue with ChatGPT')"));assert.deepEqual(await evaluate('window.__unhandled'),[])}
await mkdir('outputs',{recursive:true});await cdp('Page.enable');await cdp('Page.bringToFront');await cdp('Runtime.enable');await cdp('Network.enable');
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('nirmaan-intro-seen-v1','1');window.__unhandled=[];window.addEventListener('unhandledrejection',event=>window.__unhandled.push(String(event.reason)))"});
try{
 for(const width of [320,390,1440]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});for(const path of ['/create-account','/signin?return_to=%2Faccount','/account','/upload-design','/design-studio?product=menu'])await visit(path)}
 console.log('PASS: real local account/sign-in/protected-page and upload/studio views fit mobile and desktop without ChatGPT sign-in or rejected promises.');
 const stub="window.google={accounts:{id:{initialize(options){window.__gisOptions=options},renderButton(parent,options){window.__gisButton=options;const button=document.createElement('button');button.textContent='Continue with Google';button.dataset.gisTest='1';button.style.width=options.width+'px';button.onclick=()=>window.__gisOptions.callback({credential:'browser-test-credential'});parent.appendChild(button)},disableAutoSelect(){}}}}";
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:stub});
 const intercept=event=>{const message=JSON.parse(event.data);if(message.method!=='Fetch.requestPaused')return;const {requestId,request}=message.params;requests.push(request);let body;if(request.url.endsWith('/api/auth/config'))body={clientId:'browser-test.apps.googleusercontent.com'};else if(request.url.endsWith('/api/auth/challenge'))body={clientId:'browser-test.apps.googleusercontent.com',nonce:'test-nonce',csrfToken:'test-csrf'};else if(request.url.endsWith('/api/auth/google'))body={error:'invalid_google_token',message:'Google sign-in could not be verified. Start sign-in again.'};else{void cdp('Fetch.continueRequest',{requestId});return}void cdp('Fetch.fulfillRequest',{requestId,responseCode:request.url.endsWith('/google')?401:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')})};
 socket.addEventListener('message',intercept);await cdp('Fetch.enable',{patterns:[{urlPattern:base+'/api/auth/*',requestStage:'Request'}]});
 await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:850,deviceScaleFactor:1,mobile:true});await visit('/create-account?product=menu&design=menu-espresso-bar');await waitFor("!!document.querySelector('[data-gis-test]')");
 assert.deepEqual(await evaluate('({client_id:window.__gisOptions.client_id,nonce:window.__gisOptions.nonce,auto_select:window.__gisOptions.auto_select,ux_mode:window.__gisOptions.ux_mode,text:window.__gisButton.text})'),{client_id:'browser-test.apps.googleusercontent.com',nonce:'test-nonce',auto_select:false,ux_mode:'popup',text:'continue_with'});
 await evaluate("document.querySelector('[data-gis-test]').click()");await waitFor("document.body.innerText.includes('Google sign-in could not be verified')");
 const post=requests.find(request=>request.url.endsWith('/api/auth/google'));assert(post);assert.deepEqual(JSON.parse(post.postData),{credential:'browser-test-credential',csrfToken:'test-csrf'});assert.equal(await evaluate("document.querySelectorAll('.signup-card form').length"),0,'a failed credential must not reveal authenticated profile form');
 await evaluate("document.querySelector('.google-auth-error button').click()");await waitFor("!!document.querySelector('[data-gis-test]')");assert.deepEqual(await evaluate('window.__unhandled'),[]);assert.equal(exceptions.length,0,exceptions.join('\n'));
 const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('outputs/google-sign-in-mobile.png',Buffer.from(shot.data,'base64'));
 await cdp('Fetch.disable');socket.removeEventListener('message',intercept);
 console.log('PASS: official GIS initialize/renderButton integration, nonce/CSRF credential submission, readable invalid-login errors and retry without trusting client profile data. SDK and failure response were browser-only stubs.');
}finally{socket.close();await fetch('http://127.0.0.1:9223/json/close/'+tab.id).catch(()=>{})}
