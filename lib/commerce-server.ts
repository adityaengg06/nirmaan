import { env } from 'cloudflare:workers';
import { ADMIN_EMAIL } from './commerce';
export function isAdmin(email: string) { return email.toLowerCase() === ((env as Cloudflare.Env & {ADMIN_EMAIL?: string}).ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase(); }
export function error(message: string, status = 400) { return Response.json({error:message}, {status}); }
