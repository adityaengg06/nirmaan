import {AuthError} from './types';
import type {AuthConfig,AuthEnvironment} from './types';
export const PRIVATE_HEADERS={'Cache-Control':'private, no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export const SESSION_MS=7*24*60*60*1000;
export const CHALLENGE_MS=5*60*1000;
/** Only this explicitly public value may be returned to the browser. */
function googleClientId(env:AuthEnvironment):string|null {
  if(env.GOOGLE_CLIENT_ID===undefined||env.GOOGLE_CLIENT_ID==='')return null;
  if(typeof env.GOOGLE_CLIENT_ID!=='string')throw new AuthError(503,'auth_not_configured','The Google sign-in client ID is invalid.','GOOGLE_CLIENT_ID');
  const clientId=env.GOOGLE_CLIENT_ID.trim();
  if(!clientId)return null;
  if(clientId.length>500||!/^[-_A-Za-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId))throw new AuthError(503,'auth_not_configured','The Google sign-in client ID is invalid.','GOOGLE_CLIENT_ID');
  return clientId;
}
export function publicGoogleConfiguration(env:AuthEnvironment):{clientId:string} {
  const clientId=googleClientId(env);
  if(!clientId)throw new AuthError(503,'auth_not_configured','Configure the Google web client ID before signing in.','GOOGLE_CLIENT_ID');
  return {clientId};
}
export function configuration(env:AuthEnvironment):AuthConfig {
  if(!env.DB)throw new AuthError(503,'auth_not_configured','The sign-in account database is not connected.','DB');
  if(typeof env.APP_ORIGIN!=='string'||!env.APP_ORIGIN.trim())throw new AuthError(503,'auth_not_configured','The application sign-in URL is not configured.','APP_ORIGIN');
  let url:URL;try{url=new URL(env.APP_ORIGIN.trim())}catch{throw new AuthError(503,'auth_not_configured','The application sign-in URL is invalid.','APP_ORIGIN')}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const development=env.AUTH_ENV==='development'&&url.protocol==='http:'&&loopback;
  if((url.protocol!=='https:'&&!development)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new AuthError(503,'auth_not_configured','Use an HTTPS application origin. HTTP is allowed only for explicit loopback development.','APP_ORIGIN');
  return {db:env.DB,origin:url.origin,development,clientId:googleClientId(env)};
}
export function cookieName(config:AuthConfig,kind:'session'|'challenge') {return config.development?'nirmaan_dev_'+kind:'__Host-nirmaan_'+kind}
export function cookie(config:AuthConfig,kind:'session'|'challenge',token:string,maxAge:number) {return cookieName(config,kind)+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+maxAge+(config.development?'':'; Secure')}
export function readCookie(headers:Headers,name:string):string|null {
  const values=(headers.get('cookie')||'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(name+'='));
  if(values.length!==1)return null;const value=values[0].slice(name.length+1);return /^[-_A-Za-z0-9]{43}$/.test(value)?value:null;
}
export function randomToken() {const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
export async function hashToken(value:string) {const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}
export async function equalTokens(a:unknown,b:unknown) {
  if(typeof a!=='string'||typeof b!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(a)||!/^[-_A-Za-z0-9]{43}$/.test(b))return false;
  const [left,right]=await Promise.all([hashToken(a),hashToken(b)]);let difference=0;for(let i=0;i<left.length;i++)difference|=left.charCodeAt(i)^right.charCodeAt(i);return difference===0;
}
export function requireRequestOrigin(request:Request,config:AuthConfig,write:boolean) {
  if(new URL(request.url).origin!==config.origin)throw new AuthError(403,'forbidden_origin','The request origin is not allowed.');
  const origin=request.headers.get('origin');
  if((write&&origin!==config.origin)||(!write&&origin!==null&&origin!==config.origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new AuthError(403,'forbidden_origin','The request origin is not allowed.');
}
export async function jsonBody(request:Request):Promise<Record<string,unknown>> {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new AuthError(415,'json_required','Send a JSON request.');
  if(Number(request.headers.get('content-length')||0)>32768)throw new AuthError(413,'request_too_large','The sign-in request is too large.');
  const reader=request.body?.getReader();if(!reader)throw new AuthError(400,'invalid_request','The request body is required.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new AuthError(413,'request_too_large','The sign-in request is too large.')}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  try{const value:unknown=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>}catch{throw new AuthError(400,'invalid_request','The JSON request is invalid.')}
}
export function json(value:unknown,status=200,cookies:string[]=[]) {const headers=new Headers(PRIVATE_HEADERS);for(const value of cookies)headers.append('Set-Cookie',value);return Response.json(value,{status,headers})}
export function failure(error:unknown,cookies:string[]=[]) {return error instanceof AuthError?json({error:error.code,message:error.message,...(error.configuration?{configuration:error.configuration}:{})},error.status,cookies):json({error:'auth_unavailable',message:'Secure sign-in is temporarily unavailable. Please try again.'},503,cookies)}
