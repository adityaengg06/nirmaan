import type {AuthEnvironment,AuthOptions,AuthConfig,AuthUser,GoogleIdentity} from './types';
import {AuthError} from './types';
import {verifyGoogleCredential} from './google';
import {configuration,publicGoogleConfiguration,cookieName,cookie,readCookie,randomToken,hashToken,equalTokens,requireRequestOrigin,jsonBody,json,failure,SESSION_MS,CHALLENGE_MS} from './security';
export type {AuthEnvironment,AuthUser,AuthOptions} from './types';

type Challenge={challenge_hash:string;nonce:string;csrf_token:string;expires_at:number;created_at:number};
type Session={token_hash:string;google_sub:string;user_id:string;csrf_token:string;expires_at:number;email:string;full_name:string|null};
type Identity={google_sub:string;user_id:string;email:string;full_name:string|null};
function authUser(identity:{user_id:string;email:string;full_name:string|null}):AuthUser{return {userId:identity.user_id,email:identity.email,fullName:identity.full_name,displayName:identity.full_name||identity.email}}
function headersOf(value:Request|Headers):Headers{return 'headers' in value?value.headers:value}

export function createAuthService(options:AuthOptions={}) {
  const now=options.now||Date.now;
  async function loadSession(headers:Headers,config:AuthConfig):Promise<Session|null> {
    const token=readCookie(headers,cookieName(config,'session'));if(!token)return null;
    return config.db.prepare('SELECT s.token_hash,s.google_sub,s.user_id,s.csrf_token,s.expires_at,i.email,i.full_name FROM auth_sessions s JOIN auth_google_identities i ON i.google_sub=s.google_sub AND i.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hashToken(token),now()).first<Session>();
  }
  async function getSession(input:Request|Headers,env:AuthEnvironment):Promise<AuthUser|null> {
    try{const session=await loadSession(headersOf(input),configuration(env));return session?authUser(session):null}catch{return null}
  }
  async function challenge(request:Request,config:AuthConfig) {
    if(!config.clientId)throw new AuthError(503,'auth_not_configured','Configure the Google web client ID before signing in.','GOOGLE_CLIENT_ID');
    const token=randomToken(),nonce=randomToken(),csrfToken=randomToken(),createdAt=now();
    const previous=readCookie(request.headers,cookieName(config,'challenge'));
    const statements=[config.db.prepare('DELETE FROM auth_challenges WHERE expires_at<=?').bind(createdAt)];
    if(previous)statements.push(config.db.prepare('DELETE FROM auth_challenges WHERE challenge_hash=?').bind(await hashToken(previous)));
    statements.push(config.db.prepare('INSERT INTO auth_challenges (challenge_hash,nonce,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?)').bind(await hashToken(token),nonce,csrfToken,createdAt+CHALLENGE_MS,createdAt));
    await config.db.batch(statements);
    return json({clientId:config.clientId,nonce,csrfToken},200,[cookie(config,'challenge',token,CHALLENGE_MS/1000)]);
  }
  async function identityForLogin(google:GoogleIdentity,config:AuthConfig):Promise<Identity|null> {
    const timestamp=now();
    // Subject owns the identity. Email is only a collision signal for manual
    // migration, and never permission to claim an existing business account.
    await config.db.prepare(`INSERT INTO auth_google_identities (google_sub,user_id,email,full_name,created_at,updated_at)
      SELECT ?,?,?,?,?,? WHERE NOT EXISTS (
        SELECT 1 FROM profiles WHERE lower(email)=?
        UNION ALL SELECT 1 FROM requests WHERE lower(email)=?
        UNION ALL SELECT 1 FROM auth_google_identities WHERE lower(email)=? AND google_sub<>?
      ) ON CONFLICT(google_sub) DO NOTHING`).bind(google.sub,crypto.randomUUID(),google.email,google.fullName,timestamp,timestamp,google.email,google.email,google.email,google.sub).run();
    const identity=await config.db.prepare('SELECT google_sub,user_id,email,full_name FROM auth_google_identities WHERE google_sub=?').bind(google.sub).first<Identity>();
    if(identity){
      await config.db.prepare('UPDATE auth_google_identities SET email=?,full_name=?,updated_at=? WHERE google_sub=?').bind(google.email,google.fullName,timestamp,google.sub).run();
      return {...identity,email:google.email,full_name:google.fullName};
    }
    await config.db.prepare(`INSERT INTO auth_account_links (google_sub,email,full_name,status,requested_at,last_requested_at)
      VALUES (?,?,?,'pending',?,?) ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email,full_name=excluded.full_name,last_requested_at=excluded.last_requested_at`).bind(google.sub,google.email,google.fullName,timestamp,timestamp).run();
    return null;
  }
  async function googleSignIn(request:Request,config:AuthConfig) {
    if(!config.clientId)throw new AuthError(503,'auth_not_configured','Configure the Google web client ID before signing in.','GOOGLE_CLIENT_ID');
    const body=await jsonBody(request),token=readCookie(request.headers,cookieName(config,'challenge'));
    const headerCsrf=request.headers.get('x-csrf-token');
    if(headerCsrf&&body.csrfToken!==undefined&&headerCsrf!==body.csrfToken)throw new AuthError(403,'invalid_csrf','Start sign-in again from this browser.');
    const csrf=headerCsrf||body.csrfToken;
    if(!token)throw new AuthError(400,'invalid_challenge','Start sign-in again from this browser.');
    const pending=await config.db.prepare('SELECT challenge_hash,nonce,csrf_token,expires_at,created_at FROM auth_challenges WHERE challenge_hash=? AND expires_at>?').bind(await hashToken(token),now()).first<Challenge>();
    if(!pending)throw new AuthError(400,'invalid_challenge','This sign-in request expired or was already used. Start again.');
    if(!await equalTokens(csrf,pending.csrf_token))throw new AuthError(403,'invalid_csrf','Start sign-in again from this browser.');
    const google=await verifyGoogleCredential(body.credential,config.clientId,pending.nonce,pending.created_at,now(),options.googleKeySet);
    const consumed=await config.db.prepare('DELETE FROM auth_challenges WHERE challenge_hash=? AND csrf_token=? AND nonce=? AND expires_at>? RETURNING challenge_hash').bind(pending.challenge_hash,pending.csrf_token,pending.nonce,now()).first<{challenge_hash:string}>();
    if(!consumed)throw new AuthError(400,'invalid_challenge','This sign-in request expired or was already used. Start again.');
    const clearedChallenge=cookie(config,'challenge','',0);
    try {
      const identity=await identityForLogin(google,config);
      if(!identity)return json({error:'account_link_required',message:'An existing NIRMAAN account uses this email. Ask the account administrator to approve linking your Google identity. Your existing records have not been changed.',email:google.email},409,[clearedChallenge]);
      const sessionToken=randomToken(),csrfToken=randomToken(),createdAt=now();
      const statements=[config.db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(createdAt)];
      const oldToken=readCookie(request.headers,cookieName(config,'session'));
      if(oldToken)statements.push(config.db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await hashToken(oldToken)));
      statements.push(config.db.prepare('INSERT INTO auth_sessions (token_hash,google_sub,user_id,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?,?)').bind(await hashToken(sessionToken),identity.google_sub,identity.user_id,csrfToken,createdAt+SESSION_MS,createdAt));
      await config.db.batch(statements);
      return json({user:authUser(identity),csrfToken},200,[clearedChallenge,cookie(config,'session',sessionToken,SESSION_MS/1000)]);
    } catch(error){return failure(error,[clearedChallenge])}
  }
  async function session(request:Request,config:AuthConfig) {
    const row=await loadSession(request.headers,config);
    if(row)return json({user:authUser(row),csrfToken:row.csrf_token});
    const hasCookie=(request.headers.get('cookie')||'').split(';').some(value=>value.trim().startsWith(cookieName(config,'session')+'='));
    return json({user:null,csrfToken:null},200,hasCookie?[cookie(config,'session','',0)]:[]);
  }
  async function logout(request:Request,config:AuthConfig) {
    const row=await loadSession(request.headers,config);
    if(!row)return json({ok:true},200,[cookie(config,'session','',0),cookie(config,'challenge','',0)]);
    let csrf:unknown=request.headers.get('x-csrf-token');
    if(!csrf){const body=await jsonBody(request);csrf=body.csrfToken}
    if(!await equalTokens(csrf,row.csrf_token))throw new AuthError(403,'invalid_csrf','Refresh your session before signing out.');
    await config.db.prepare('DELETE FROM auth_sessions WHERE token_hash=? AND csrf_token=?').bind(row.token_hash,row.csrf_token).run();
    return json({ok:true},200,[cookie(config,'session','',0),cookie(config,'challenge','',0)]);
  }
  async function handleAuthRequest(request:Request,env:AuthEnvironment):Promise<Response|null> {
    const path=new URL(request.url).pathname;
    if(!['/api/auth/config','/api/auth/challenge','/api/auth/google','/api/auth/session','/api/auth/logout'].includes(path))return null;
    try {
      const expected=path==='/api/auth/config'||path==='/api/auth/challenge'||path==='/api/auth/session'?'GET':'POST';
      if(request.method!==expected)return json({error:'method_not_allowed',message:'Method not allowed.'},405);
      // Public, read-only runtime configuration; no cookies, credentials or
      // database access. Login still requires the configured trusted origin.
      if(path==='/api/auth/config')return json(publicGoogleConfiguration(env));
      const config=configuration(env);
      requireRequestOrigin(request,config,expected==='POST');
      if(path==='/api/auth/challenge')return await challenge(request,config);
      if(path==='/api/auth/google')return await googleSignIn(request,config);
      if(path==='/api/auth/session')return await session(request,config);
      return await logout(request,config);
    }catch(error){return failure(error)}
  }
  return {handleAuthRequest,getSession};
}
const service=createAuthService();
export const handleAuthRequest=service.handleAuthRequest;
export const getSession=service.getSession;
