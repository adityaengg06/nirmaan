// Loopback-only middleware checks; no hosted identities, database or network calls.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('outputs',{recursive:true});
await build({entryPoints:['scripts/vite/sites-vite-plugin.ts'],bundle:true,platform:'node',format:'esm',outfile:'outputs/local-preview-auth-test.mjs'});
const {sites}=await import('../outputs/local-preview-auth-test.mjs');
let middleware;
const plugin=sites({mockAuth:true});
plugin.configureServer({config:{server:{https:false},logger:{info(){}}},middlewares:{use(handler){middleware=handler}}});
function run(url,headers={},options={}){
 const all={host:'localhost:5173',...headers};
 const request={url,method:options.method||'GET',headers:all,rawHeaders:Object.entries(all).flat(),socket:{remoteAddress:options.remoteAddress||'127.0.0.1'}};
 const result={request,statusCode:200,headers:{},ended:false,next:false};
 middleware(request,{get statusCode(){return result.statusCode},set statusCode(value){result.statusCode=value},setHeader(name,value){result.headers[name.toLowerCase()]=value},end(){result.ended=true}},()=>result.next=true);
 return result;
}
const start=run('/signin-with-chatgpt?preview_email=Client%40Example.com&return_to=%2Fcreate-account');
assert.equal(start.statusCode,302);assert.equal(start.headers.location,'/create-account');assert.equal(start.headers['set-cookie'].length,2);assert(start.headers['set-cookie'].every(cookie=>cookie.includes('HttpOnly; SameSite=Lax')));
const chosenCookies=start.headers['set-cookie'].map(value=>value.split(';')[0]).join('; ');
const chosen=run('/api/profile',{cookie:chosenCookies+'; app_cookie=retained','oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.test'});
assert(chosen.next);assert.equal(chosen.request.headers['oai-authenticated-user-email'],'client@example.com');assert.match(chosen.request.headers['oai-authenticated-user-id'],/^local_preview_[a-f0-9]{64}$/);assert.equal(chosen.request.headers.cookie,'app_cookie=retained');
assert(!chosen.request.rawHeaders.includes('forged'));assert(!chosen.request.rawHeaders.includes('forged@example.test'));
assert.equal(run('/api/profile',{cookie:chosenCookies}).request.headers['oai-authenticated-user-id'],chosen.request.headers['oai-authenticated-user-id'],'stable preview identity');
const second=run('/signin-with-chatgpt?preview_email=other%40example.com');const secondCookies=second.headers['set-cookie'].map(value=>value.split(';')[0]).join('; ');assert.notEqual(run('/api/profile',{cookie:secondCookies}).request.headers['oai-authenticated-user-id'],chosen.request.headers['oai-authenticated-user-id'],'separate accounts');
assert.equal(run('/api/profile',{cookie:'__sites_local_auth=1'}).request.headers['oai-authenticated-user-id'],'local_seedy','legacy default identity retained');
assert.equal(run('/api/profile',{'oai-authenticated-user-email':'forged@example.test'}).request.headers['oai-authenticated-user-email'],undefined,'forged auth stripped');
assert.equal(run('/api/profile',{cookie:'__sites_local_auth=1; __nirmaan_preview_email=%E0%A4%A'}).request.headers['oai-authenticated-user-id'],undefined,'invalid preview cookie fails closed');
for(const query of ['bad','a%40b','a%40b.com&preview_email=b%40c.com',encodeURIComponent('नाम@example.com')]){const invalid=run('/signin-with-chatgpt?preview_email='+query);assert.equal(invalid.statusCode,400);assert.equal(invalid.headers['set-cookie'],undefined);}
assert.equal(run('/signin-with-chatgpt?preview_email=ok%40example.com',{origin:'https://untrusted.test'}).statusCode,403);
assert.equal(run('/signin-with-chatgpt?preview_email=ok%40example.com',{'sec-fetch-site':'cross-site'}).statusCode,403);
assert.equal(run('/signin-with-chatgpt?preview_email=ok%40example.com',{}, {remoteAddress:'192.0.2.1'}).statusCode,403);
const prefetched=run('/signin-with-chatgpt?preview_email=ok%40example.com',{purpose:'prefetch'});assert.equal(prefetched.statusCode,204);assert.equal(prefetched.headers['set-cookie'],undefined);
const out=run('/signout-with-chatgpt',{cookie:chosenCookies});assert.equal(out.headers['set-cookie'].length,2);assert(out.headers['set-cookie'].every(value=>value.includes('Max-Age=0')));
let hostedMiddleware=false;sites({mockAuth:false}).configureServer({config:{server:{},logger:{info(){}}},middlewares:{use(){hostedMiddleware=true}}});assert.equal(hostedMiddleware,false,'mock disabled for hosted/managed configurations');
console.log('PASS: local preview email selection, separate stable identities, legacy seedy account, private cookies, logout cleanup, forged headers stripped, malformed input rejected, loopback/origin/prefetch restrictions and hosted mock disabled.');
