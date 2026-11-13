// Run only against the local built Worker. Fixtures write to .wrangler/state,
// not remote D1. The application itself never accepts these test identity headers.
import assert from 'node:assert/strict';
import {createLocalAuthFixtures} from './helpers/auth-fixtures.mjs';
const base='http://127.0.0.1:8787';
const fixtures=await createLocalAuthFixtures();
try{
 const {rawFetch}=fixtures.installFetch(base);
 const forged=await rawFetch(base+'/api/requests?admin=1',{headers:{'oai-authenticated-user-id':'qa-admin','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'}});
 assert.equal(forged.status,401,'forged admin identity headers must not authenticate');
 const profile=await(await rawFetch(base+'/api/profile',{headers:{'oai-authenticated-user-id':'qa-admin','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'}})).json();assert.equal(profile.signedIn,false);
 for(const script of ['check-local','check-catalog','check-printing','check-themes','check-release'])await import('./'+script+'.mjs');
 const auth=fixtures.headersFor({'oai-authenticated-user-id':'qa-auth-'+crypto.randomUUID(),'oai-authenticated-user-email':'local-auth-test@example.test'});
 const savedSession=await rawFetch(base+'/api/auth/session',{headers:auth});const session=await savedSession.json();assert(session.user,'seeded session must persist across requests');
 assert.equal((await rawFetch(base+'/api/requests',{headers:auth})).status,200);
 assert.equal((await rawFetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:auth.Cookie,Origin:base,'X-CSRF-Token':'wrong'}})).status,403);
 assert.equal((await rawFetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:auth.Cookie,Origin:base,'X-CSRF-Token':session.csrfToken}})).status,200);
 assert.equal((await rawFetch(base+'/api/requests',{headers:auth})).status,401,'revoked session must not authorize protected routes');
 console.log('PASS: native Worker protected APIs, account creation, private R2 uploads, orders/quotes/manual payment, subscriptions, students and theme suites using real D1 sessions. Forged headers rejected.');
}finally{fixtures.close()}
