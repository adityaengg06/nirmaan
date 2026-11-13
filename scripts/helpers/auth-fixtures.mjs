// LOCAL TEST FIXTURES ONLY. Never import this module from application code.
// This deliberately seeds synthetic sessions in a local Wrangler SQLite file;
// Google credential verification remains enabled in the actual application.
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {readdir,realpath} from 'node:fs/promises';
import path from 'node:path';
const sha=value=>createHash('sha256').update(value).digest('hex');
async function candidates(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){if(entry.isDirectory())files.push(...await candidates(path.join(directory,entry.name)));else if(entry.name.endsWith('.sqlite')&&entry.name!=='metadata.sqlite')files.push(path.join(directory,entry.name));}return files;}
function hasAuthTables(filename){const db=new DatabaseSync(filename,{readOnly:true});try{return ['auth_sessions','auth_google_identities','profiles','requests'].every(table=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));}finally{db.close()}}
export async function createLocalAuthFixtures({projectRoot=process.cwd(),databasePath,cookieName='nirmaan_dev_session'}={}){
  if(!['nirmaan_dev_session','__Host-nirmaan_session'].includes(cookieName))throw new Error('Use an actual NIRMAAN session cookie name.');
  const stateRoot=await realpath(path.join(projectRoot,'.wrangler/state'));
  let file;
  if(databasePath)file=await realpath(path.resolve(projectRoot,databasePath));
  else{const matches=(await candidates(path.join(stateRoot,'v3/d1'))).filter(hasAuthTables);if(matches.length!==1)throw new Error('Expected one local D1 database with auth migration; pass databasePath explicitly when more than one matches.');file=await realpath(matches[0]);}
  if(!file.startsWith(stateRoot+path.sep)||!file.endsWith('.sqlite'))throw new Error('Fixture databases must be inside this project’s .wrangler/state directory.');
  const db=new DatabaseSync(file);db.exec('PRAGMA busy_timeout=5000');
  const cache=new Map(),tokens=[];let restore;
  function headersFor(identity){
    const h=new Headers(identity),userId=h.get('oai-authenticated-user-id'),email=h.get('oai-authenticated-user-email');
    if(!userId||!email)throw new Error('The local fixture needs an explicit synthetic user ID and email.');
    if(!/^(qa-|school-|student-|outsider-|printing-|integration-|browser-qa-|auth-qa-|google-test-)/.test(userId)||userId.length>500||email.length>254)throw new Error('Only clearly labelled local QA identities are allowed.');
    const key=userId+'\n'+email;if(cache.has(key))return {...cache.get(key)};
    const now=Date.now(),googleSub='local-qa:'+sha(userId),token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url'),hash=sha(token);
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO auth_google_identities(google_sub,user_id,email,full_name,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET user_id=excluded.user_id,email=excluded.email,updated_at=excluded.updated_at').run(googleSub,userId,email,'Local QA',now,now);
      db.prepare('INSERT INTO auth_sessions(token_hash,google_sub,user_id,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?,?)').run(hash,googleSub,userId,csrf,now+3600_000,now);db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    tokens.push(hash);const headers={Cookie:cookieName+'='+token,'X-CSRF-Token':csrf};cache.set(key,headers);return {...headers};
  }
  function installFetch(base='http://127.0.0.1:8787'){
    const origin=new URL(base);if(!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw new Error('The QA fetch adapter only permits loopback servers.');
    const original=globalThis.fetch;
    globalThis.fetch=async(input,init={})=>{
      const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,origin);
      if(url.origin!==origin.origin)return original(input,init);
      const headers=new Headers(init.headers||(!(typeof input==='string'||input instanceof URL)?input.headers:undefined));
      const identity=new Headers([...headers].filter(([name])=>name.startsWith('oai-authenticated-user-')));
      for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-user-'))headers.delete(name);
      if(identity.get('oai-authenticated-user-id'))for(const [name,value]of Object.entries(headersFor(identity)))headers.set(name,value);
      return original(input,{...init,headers});
    };
    restore=()=>{globalThis.fetch=original;restore=undefined};return{rawFetch:original,restore};
  }
  return{headersFor,installFetch,databasePath:file,close(){restore?.();for(const hash of tokens)db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash);db.close();}};
}
