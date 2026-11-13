import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {JWTVerifyGetKey} from 'jose';
import {AuthError} from './types';
import type {GoogleIdentity} from './types';
const GOOGLE_JWKS=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000,cooldownDuration:30000});
export async function verifyGoogleCredential(credential:unknown,clientId:string,nonce:string,createdAt:number,now:number,keySet:JWTVerifyGetKey=GOOGLE_JWKS):Promise<GoogleIdentity> {
  if(typeof credential!=='string'||credential.length<1||credential.length>16000)throw new AuthError(400,'invalid_google_token','Choose a Google account to sign in.');
  try {
    const {payload}=await jwtVerify(credential,keySet,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,requiredClaims:['sub','email','email_verified','iat','exp','nonce'],clockTolerance:5,maxTokenAge:'10m',currentDate:new Date(now)});
    if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||typeof payload.email!=='string'||payload.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)||payload.email_verified!==true||payload.nonce!==nonce||(payload.azp!==undefined&&payload.azp!==clientId)||(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==clientId)||typeof payload.iat!=='number'||payload.iat*1000<createdAt-30000||typeof payload.exp!=='number'||payload.exp*1000<=now)throw new Error('Invalid Google identity claims.');
    return {sub:payload.sub,email:payload.email.trim().toLowerCase(),fullName:typeof payload.name==='string'&&payload.name.trim()&&payload.name.length<=500?payload.name.trim():null};
  } catch(error) {
    if(error instanceof AuthError)throw error;
    throw new AuthError(401,'invalid_google_token','Google sign-in could not be verified. Start sign-in again.');
  }
}
