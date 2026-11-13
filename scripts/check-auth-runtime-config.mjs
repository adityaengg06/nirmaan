// Offline runtime-configuration regressions. No Cloudflare/Google service calls.
import assert from 'node:assert/strict';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createTestD1} from './helpers/test-d1.mjs';
await mkdir('outputs',{recursive:true});
await build({entryPoints:['lib/auth/service.ts'],bundle:true,platform:'node',format:'esm',external:['jose'],outfile:'outputs/auth-runtime-config-test.mjs'});
const {createAuthService}=await import('../outputs/auth-runtime-config-test.mjs');
const memory=createTestD1();
const previous=new Map(['GOOGLE_CLIENT_ID','APP_ORIGIN'].map(key=>[key,process.env[key]]));
try {
  for(const migration of(await readdir('drizzle')).filter(name=>/^\d+.*\.sql$/.test(name)).sort())memory.sqlite.exec(await readFile('drizzle/'+migration,'utf8'));
  const now=Date.now(),seconds=Math.floor(now/1000),pair=await generateKeyPair('RS256',{extractable:true});
  const publicKey={...await exportJWK(pair.publicKey),kid:'offline-runtime-key',alg:'RS256',use:'sig'};
  const service=createAuthService({now:()=>now,googleKeySet:createLocalJWKSet({keys:[publicKey]})});
  const clientId='runtime-google-client.apps.googleusercontent.com',origin='https://shop.example.test';
  const runtime={DB:memory.DB,APP_ORIGIN:origin,GOOGLE_CLIENT_ID:clientId,AUTH_ENV:'production'};
  async function send(path,{env=runtime,method='GET',body,headers={},requestOrigin=origin}={}) {
    const requestHeaders=new Headers(headers);if(body!==undefined)requestHeaders.set('Content-Type','application/json');
    const response=await service.handleAuthRequest(new Request(requestOrigin+path,{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body)}),env);
    assert(response instanceof Response,'Known auth route is handled');return response;
  }
  async function data(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json()}
  function privateResponse(response){assert.match(response.headers.get('cache-control')||'',/private/);assert.match(response.headers.get('cache-control')||'',/no-store/);assert.equal(response.headers.get('access-control-allow-credentials'),null)}
  async function missing(response,field){const value=await data(response,503);assert.equal(value.error,'auth_not_configured');assert.equal(value.configuration,field);assert.equal(typeof value.message,'string');privateResponse(response);return value}

  // The public endpoint cannot read DB/origin or expose unrelated runtime values.
  const publicOnly={GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:'fixture-secret-never-public',AUTH_SECRET:'another-fixture-secret'};
  Object.defineProperty(publicOnly,'DB',{get(){throw Error('Public config must not inspect DB')}});
  Object.defineProperty(publicOnly,'APP_ORIGIN',{get(){throw Error('Public config must not inspect APP_ORIGIN')}});
  const publicResponse=await send('/api/auth/config',{env:publicOnly});assert.deepEqual(await data(publicResponse),{clientId});privateResponse(publicResponse);assert.equal(publicResponse.headers.getSetCookie().length,0);assert.equal(publicResponse.headers.get('access-control-allow-origin'),null);
  const padded=await send('/api/auth/config',{env:{GOOGLE_CLIENT_ID:'  '+clientId+'  '}});assert.deepEqual(await data(padded),{clientId});
  for(const method of ['POST','PUT','OPTIONS','HEAD'])await data(await send('/api/auth/config',{env:publicOnly,method}),405);
  for(const value of [undefined,'','  ',null,123,'not-a-google-client','https://attacker.example/client','bad.apps.googleusercontent.com/path','<script>.apps.googleusercontent.com','x'.repeat(501)+'.apps.googleusercontent.com'])await missing(await send('/api/auth/config',{env:{GOOGLE_CLIENT_ID:value}}),'GOOGLE_CLIENT_ID');
  console.log('PASS: public GET config returns only the validated runtime client ID, trims whitespace, never reads DB/origin, sets no cookies, uses private/no-store and rejects malformed IDs/other methods.');

  // Build-process values are deliberately different: only Worker runtime env wins.
  delete process.env.GOOGLE_CLIENT_ID;delete process.env.APP_ORIGIN;
  const response=await send('/api/auth/challenge');const challenge=await data(response);assert.equal(challenge.clientId,clientId);assert.match(challenge.nonce,/^[A-Za-z0-9_-]{43}$/);assert.match(challenge.csrfToken,/^[A-Za-z0-9_-]{43}$/);privateResponse(response);
  const challengeCookie=response.headers.getSetCookie().find(value=>value.startsWith('__Host-nirmaan_challenge='));assert(challengeCookie&&challengeCookie.includes('Secure')&&challengeCookie.includes('HttpOnly')&&challengeCookie.includes('SameSite=Lax'));
  process.env.GOOGLE_CLIENT_ID='ci-build-value.apps.googleusercontent.com';process.env.APP_ORIGIN='https://ci-build-value.example.test';
  assert.equal((await data(await send('/api/auth/challenge'))).clientId,clientId);
  assert.deepEqual(await data(await send('/api/auth/config')),{clientId});
  await missing(await send('/api/auth/challenge',{env:{...runtime,GOOGLE_CLIENT_ID:undefined}}),'GOOGLE_CLIENT_ID');
  await missing(await send('/api/auth/challenge',{env:{...runtime,DB:undefined}}),'DB');
  await missing(await send('/api/auth/challenge',{env:{...runtime,APP_ORIGIN:undefined},headers:{Host:'shop.example.test',Origin:origin,'X-Forwarded-Host':'shop.example.test','X-Forwarded-Proto':'https'}}),'APP_ORIGIN');
  for(const APP_ORIGIN of ['', 'not-a-url','http://shop.example.test','https://shop.example.test/path','https://user:pass@shop.example.test','https://shop.example.test?query=1','https://shop.example.test/#fragment'])await missing(await send('/api/auth/challenge',{env:{...runtime,APP_ORIGIN}}),'APP_ORIGIN');
  await data(await send('/api/auth/challenge',{requestOrigin:'https://attacker.example.test',headers:{Host:'shop.example.test',Origin:origin,'X-Forwarded-Host':'shop.example.test','X-Forwarded-Proto':'https'}}),403);
  console.log('PASS: production challenges use only Worker runtime values; missing DB, APP_ORIGIN and GOOGLE_CLIENT_ID have distinct safe diagnostics; Host/Origin/forwarded headers cannot supply a missing or different trusted origin.');

  for(const AUTH_ENV of ['production',undefined])await missing(await send('/api/auth/challenge',{env:{...runtime,APP_ORIGIN:'http://localhost:5173',AUTH_ENV},requestOrigin:'http://localhost:5173'}),'APP_ORIGIN');
  const development={...runtime,APP_ORIGIN:'http://localhost:5173',AUTH_ENV:'development'};
  const localResponse=await send('/api/auth/challenge',{env:development,requestOrigin:development.APP_ORIGIN});await data(localResponse);const localCookie=localResponse.headers.getSetCookie().find(value=>value.startsWith('nirmaan_dev_challenge='));assert(localCookie&&localCookie.includes('HttpOnly')&&!/; Secure(?:;|$)/.test(localCookie));
  await missing(await send('/api/auth/challenge',{env:{...development,APP_ORIGIN:'http://192.0.2.1:5173'},requestOrigin:'http://192.0.2.1:5173'}),'APP_ORIGIN');
  console.log('PASS: HTTP auth is rejected in production and allowed only for explicit loopback development with separate cookie names.');

  async function credential(nonce,audience){return new SignJWT({sub:'runtime-config-user',email:'runtime-user@example.test',email_verified:true,name:'Runtime User',nonce}).setProtectedHeader({alg:'RS256',kid:publicKey.kid}).setIssuer('https://accounts.google.com').setAudience(audience).setIssuedAt(seconds).setExpirationTime(seconds+600).sign(pair.privateKey)}
  const attackerClient='attacker-client.apps.googleusercontent.com';
  const wrongAudience=await send('/api/auth/google',{method:'POST',headers:{Origin:origin,Cookie:challengeCookie.split(';')[0]},body:{credential:await credential(challenge.nonce,attackerClient),csrfToken:challenge.csrfToken,clientId:attackerClient,GOOGLE_CLIENT_ID:attackerClient,audience:attackerClient}});const rejected=await data(wrongAudience,401);assert.equal(rejected.error,'invalid_google_token');assert.equal(memory.sqlite.prepare('SELECT count(*) AS n FROM auth_sessions').get().n,0);
  const valid=await send('/api/auth/google',{method:'POST',headers:{Origin:origin,Cookie:challengeCookie.split(';')[0]},body:{credential:await credential(challenge.nonce,clientId),csrfToken:challenge.csrfToken,clientId:attackerClient,GOOGLE_CLIENT_ID:attackerClient,audience:attackerClient}});const signedIn=await data(valid);assert.equal(signedIn.user.email,'runtime-user@example.test');
  console.log('PASS: Google verification pins the audience to the server runtime client ID; request-body client/audience overrides are ignored.');
} finally {
  memory.close();for(const [key,value] of previous){if(value===undefined)delete process.env[key];else process.env[key]=value}
}
