// Offline security tests: generated RSA keys, injected local JWKS, real ephemeral
// SQLite and a controllable clock. No Google, user credentials or production IO.
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createTestD1} from './helpers/test-d1.mjs';
await mkdir('outputs',{recursive:true});
await build({entryPoints:['lib/auth/service.ts'],bundle:true,platform:'node',format:'esm',external:['jose'],outfile:'outputs/google-auth-test.mjs'});
const {createAuthService}=await import('../outputs/google-auth-test.mjs');
const memory=createTestD1();
try{
  for(const migration of(await readdir('drizzle')).filter(name=>/^\d+.*\.sql$/.test(name)).sort())memory.sqlite.exec(await readFile('drizzle/'+migration,'utf8'));
  const pair=await generateKeyPair('RS256',{extractable:true});
  const wrongPair=await generateKeyPair('RS256');
  const jwk={...await exportJWK(pair.publicKey),kid:'offline-google-rsa',alg:'RS256',use:'sig'};
  const googleKeySet=createLocalJWKSet({keys:[jwk]});
  let now=Date.now();
  const config={DB:memory.DB,APP_ORIGIN:'https://shop.example.test',GOOGLE_CLIENT_ID:'offline-test.apps.googleusercontent.com',AUTH_ENV:'production'};
  const service=createAuthService({googleKeySet,now:()=>now});
  function jar(){const values=new Map();return{header(){return [...values].map(([key,value])=>key+'='+value).join('; ')},apply(response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],equals=pair.indexOf('='),name=pair.slice(0,equals),value=pair.slice(equals+1);if(!value||/Max-Age=0(?:;|$)/i.test(cookie))values.delete(name);else values.set(name,value)}},values};}
  async function request(path,{method='GET',cookies=jar(),body,headers={},origin=config.APP_ORIGIN,handler=service}={}){
    const h=new Headers(headers);if(origin!==null)h.set('Origin',origin);if(cookies.header())h.set('Cookie',cookies.header());if(body!==undefined)h.set('Content-Type','application/json');
    const response=await handler.handleAuthRequest(new Request(config.APP_ORIGIN+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}),config);
    assert(response instanceof Response,'Auth route handled '+path);cookies.apply(response);return response;
  }
  async function success(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
  async function rejected(response,label){assert(response.status>=400&&response.status<500,label+': expected fail-closed 4xx, received '+response.status+' '+await response.clone().text());}
  async function challenge(cookies=jar()){const response=await request('/api/auth/challenge',{cookies});const data=await success(response);for(const field of ['nonce','csrfToken','clientId'])assert.equal(typeof data[field],'string');assert.equal(data.clientId,config.GOOGLE_CLIENT_ID);assert(response.headers.getSetCookie().some(cookie=>cookie.includes('HttpOnly')&&cookie.includes('Secure')&&cookie.includes('Path=/')),'challenge cookie is secure/HttpOnly');return{cookies,...data};}
  async function credential(nonce,claims={},privateKey=pair.privateKey,algorithm='RS256'){
    const second=Math.floor(now/1000),payload={sub:'google-user-1',email:'member@example.com',email_verified:true,name:'Test Member',nonce,...claims};
    return new SignJWT(payload).setProtectedHeader({alg:algorithm,kid:jwk.kid}).setIssuer(claims.iss||'https://accounts.google.com').setAudience(claims.aud||config.GOOGLE_CLIENT_ID).setIssuedAt(typeof claims.iat==='number'?claims.iat:second).setExpirationTime(typeof claims.exp==='number'?claims.exp:second+600).sign(privateKey);
  }
  async function login(claims={}){const c=await challenge();const response=await request('/api/auth/google',{method:'POST',cookies:c.cookies,body:{credential:await credential(c.nonce,claims),csrfToken:c.csrfToken}});return{...c,response,data:response.status===200?await response.clone().json():null};}

  const anonymous=await success(await request('/api/auth/session',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'}}));assert.equal(anonymous.user,null,'identity headers are never authentication');
  const valid=await login();assert.equal(valid.response.status,200,await valid.response.clone().text());assert.match(valid.data.user.userId,/^[0-9a-f-]{36}$/i);assert.equal(memory.sqlite.prepare('SELECT user_id FROM auth_google_identities WHERE google_sub=?').get('google-user-1').user_id,valid.data.user.userId);assert.equal(valid.data.user.email,'member@example.com');assert.equal(typeof valid.data.csrfToken,'string');
  const sessionCookie=valid.response.headers.getSetCookie().find(cookie=>!cookie.includes('Max-Age=0')&&cookie.split(';')[0].split('=')[1]);assert(sessionCookie&&sessionCookie.includes('HttpOnly')&&sessionCookie.includes('Secure')&&sessionCookie.includes('SameSite=Lax'));
  const opaque=sessionCookie.split(';')[0].slice(sessionCookie.split(';')[0].indexOf('=')+1);assert.match(opaque,/^[A-Za-z0-9_-]{43,}$/,'session is an opaque random capability');assert(!JSON.stringify(memory.sqlite.prepare('SELECT * FROM auth_sessions').all()).includes(opaque),'database stores a hash, not the bearer session value');
  const freshService=createAuthService({googleKeySet,now:()=>now});
  const persistent=await success(await request('/api/auth/session',{cookies:valid.cookies,handler:freshService,headers:{'oai-authenticated-user-id':'forged-admin','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'}}));assert.equal(persistent.user.userId,valid.data.user.userId,'session persists across service instances and ignores forged headers');
  console.log('PASS: real RS256 Google credential verification, verified identity, opaque hashed persistent sessions, secure cookies and forged-header rejection.');

  for(const [label,claims,key]of[
    ['invalid signature',{},wrongPair.privateKey],['wrong issuer',{iss:'https://attacker.example'}],['wrong audience',{aud:'another-client.apps.googleusercontent.com'}],['expired credential',{exp:Math.floor(now/1000)-60}],['nonce mismatch',{nonce:'wrong-nonce'}],['email not verified',{email_verified:false}],['nonboolean email verification',{email_verified:'true'}],['missing email',{email:undefined}],['missing subject',{sub:undefined}],['wrong authorized party',{azp:'different-client.apps.googleusercontent.com'}],
  ]){const c=await challenge();const token=await credential(c.nonce,claims,key||pair.privateKey);await rejected(await request('/api/auth/google',{method:'POST',cookies:c.cookies,body:{credential:token,csrfToken:c.csrfToken}}),label);}
  const noNonce=await challenge();await rejected(await request('/api/auth/google',{method:'POST',cookies:noNonce.cookies,body:{credential:await credential(noNonce.nonce,{nonce:undefined}),csrfToken:noNonce.csrfToken}}),'missing nonce');
  console.log('PASS: signature, issuer, audience, expiry, nonce, subject, verified-email and authorized-party failures are rejected.');

  const cross=await challenge();const crossCredential=await credential(cross.nonce,{sub:'csrf-user'});
  await rejected(await request('/api/auth/google',{method:'POST',cookies:cross.cookies,origin:'https://attacker.example',body:{credential:crossCredential,csrfToken:cross.csrfToken}}),'cross-origin login');
  const wrongCsrf=await challenge();await rejected(await request('/api/auth/google',{method:'POST',cookies:wrongCsrf.cookies,body:{credential:await credential(wrongCsrf.nonce),csrfToken:'wrong'}}),'wrong csrf');
  const conflict=await challenge();await rejected(await request('/api/auth/google',{method:'POST',cookies:conflict.cookies,headers:{'X-CSRF-Token':'wrong'},body:{credential:await credential(conflict.nonce),csrfToken:conflict.csrfToken}}),'conflicting csrf channels');
  const replay=await challenge();const oldCookies=jar();for(const [key,value]of replay.cookies.values)oldCookies.values.set(key,value);const replayBody={credential:await credential(replay.nonce,{sub:'replay-user',email:'replay@example.com'}),csrfToken:replay.csrfToken};await success(await request('/api/auth/google',{method:'POST',cookies:replay.cookies,body:replayBody}));await rejected(await request('/api/auth/google',{method:'POST',cookies:oldCookies,body:replayBody}),'challenge replay');
  const concurrent=await challenge();const concurrentBody={credential:await credential(concurrent.nonce,{sub:'parallel-replay-user',email:'parallel@example.com'}),csrfToken:concurrent.csrfToken};const copies=[jar(),jar()];for(const copy of copies)for(const [key,value]of concurrent.cookies.values)copy.values.set(key,value);const races=await Promise.all(copies.map(cookies=>request('/api/auth/google',{method:'POST',cookies,body:concurrentBody})));assert.deepEqual(races.map(response=>response.status).sort(),[200,400],'one challenge cannot produce two concurrent sessions');
  const stale=await challenge();const staleBody={credential:await credential(stale.nonce,{sub:'stale-challenge-user'}),csrfToken:stale.csrfToken};now+=6*60_000;await rejected(await request('/api/auth/google',{method:'POST',cookies:stale.cookies,body:staleBody}),'expired challenge');
  console.log('PASS: exact-origin CSRF, conflicting proof rejection, one-use challenge replay protection and challenge expiry.');

  // A verified email match does not prove ownership of old Sites records.
  const legacy='legacy-sites-user';const legacyEmail='legacy@example.com';const timestamp=new Date(now).toISOString();
  memory.sqlite.prepare('INSERT INTO profiles(user_id,email,name,phone,business,address,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(legacy,legacyEmail,'Legacy Owner','9876543210','Legacy Business','{}',timestamp,timestamp);
  memory.sqlite.prepare('INSERT INTO requests(id,user_id,email,kind,business,phone,details,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-order',legacy,legacyEmail,'order','Legacy Business','9876543210','{}',99,'active',timestamp);
  memory.sqlite.prepare('INSERT INTO artwork(id,user_id,kind,filename,content_type,size,created_at) VALUES (?,?,?,?,?,?,?)').run('legacy-artwork',legacy,'design','legacy.png','image/png',100,timestamp);
  memory.sqlite.prepare('INSERT INTO student_records(id,order_id,issuer_id,student_email,name,student_id,class_name,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-student','legacy-order',legacy,'student@example.com','Student','S-1','Class 1','{}',timestamp,timestamp);
  const pending=await login({sub:'legacy-google-sub',email:legacyEmail});assert.equal(pending.response.status,409,await pending.response.clone().text());assert.match(await pending.response.clone().text(),/account_link_required/);
  for(const [table,column,idColumn,id]of[['profiles','user_id','user_id',legacy],['requests','user_id','id','legacy-order'],['artwork','user_id','id','legacy-artwork'],['student_records','issuer_id','id','legacy-student']])assert.equal(memory.sqlite.prepare(`SELECT ${column} AS owner FROM ${table} WHERE ${idColumn}=?`).get(id).owner,legacy);
  assert(memory.sqlite.prepare('SELECT count(*) AS n FROM auth_account_links').get().n>=1,'manual review request persisted');
  // Emulate an operator's explicit, reviewed mapping; the application must use
  // that existing stable ID rather than rewriting any business foreign keys.
  memory.sqlite.prepare('INSERT INTO auth_google_identities(google_sub,user_id,email,full_name,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('legacy-google-sub',legacy,legacyEmail,'Legacy Owner',now,now);
  memory.sqlite.prepare("UPDATE auth_account_links SET status='approved' WHERE google_sub=?").run('legacy-google-sub');
  const approved=await login({sub:'legacy-google-sub',email:legacyEmail});assert.equal(approved.response.status,200);assert.equal(approved.data.user.userId,legacy);for(const [table,column,idColumn,id]of[['profiles','user_id','user_id',legacy],['requests','user_id','id','legacy-order'],['artwork','user_id','id','legacy-artwork'],['student_records','issuer_id','id','legacy-student']])assert.equal(memory.sqlite.prepare(`SELECT ${column} AS owner FROM ${table} WHERE ${idColumn}=?`).get(id).owner,legacy);
  console.log('PASS: legacy email collisions require explicit account linking; reviewed mappings retain all profile, order, artwork and student ownership IDs.');

  await rejected(await request('/api/auth/logout',{method:'POST',cookies:valid.cookies,body:{csrfToken:'wrong'}}),'logout csrf');
  assert.equal((await success(await request('/api/auth/session',{cookies:valid.cookies}))).user.userId,valid.data.user.userId);
  const revokedCookie=jar();for(const [key,value]of valid.cookies.values)revokedCookie.values.set(key,value);
  await success(await request('/api/auth/logout',{method:'POST',cookies:valid.cookies,headers:{'X-CSRF-Token':valid.data.csrfToken}}));
  assert.equal((await success(await request('/api/auth/session',{cookies:revokedCookie}))).user,null,'logout revokes persisted session even with the previous cookie');
  const expiring=await login({sub:'expiry-user',email:'expiry@example.com'});assert.equal(expiring.response.status,200);now+=8*24*60*60_000;assert.equal((await success(await request('/api/auth/session',{cookies:expiring.cookies}))).user,null,'expired session cannot authorize');
  console.log('PASS: logout requires CSRF, revokes the stored session, and session expiry is enforced.');
  console.log('PASS: Google Identity Services auth security tests. All keys, identities and database records are offline fixtures only.');
}finally{memory.close();}
