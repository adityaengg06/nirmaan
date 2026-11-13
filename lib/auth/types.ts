import type {JWTVerifyGetKey} from 'jose';
export type AuthUser = {userId:string;email:string;fullName:string|null;displayName:string};
export type AuthEnvironment = {DB?:D1Database;APP_ORIGIN?:string;GOOGLE_CLIENT_ID?:string;AUTH_ENV?:string};
export type AuthOptions = {googleKeySet?:JWTVerifyGetKey;now?:()=>number};
export type AuthConfig = {db:D1Database;origin:string;development:boolean;clientId:string|null};
export type GoogleIdentity = {sub:string;email:string;fullName:string|null};
export class AuthError extends Error {
  constructor(readonly status:number,readonly code:string,message:string,readonly configuration?:'DB'|'APP_ORIGIN'|'GOOGLE_CLIENT_ID'){super(message);this.name='AuthError'}
}
