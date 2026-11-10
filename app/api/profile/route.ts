import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sameOrigin, validAddress, validPhone } from '../../../lib/commerce';
import { error, isAdmin } from '../../../lib/commerce-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({signedIn:false,profile:null},{headers:{'Cache-Control':'private, no-store'}});
  const profile = (await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)))[0];
  return Response.json({signedIn:true,email:user.email,admin:isAdmin(user.email),profile:profile ? {...profile,address:JSON.parse(profile.address)} : null},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user = await getChatGPTUser(); if (!user) return error('Sign in to create your account.',401);
  let body; try { body = await request.json() as Record<string,unknown>; } catch { return error('Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid request.');
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 100 || !validPhone(body.phone)
    || typeof body.business !== 'string' || body.business.trim().length < 2 || body.business.length > 150 || !validAddress(body.address)) return error('Complete your name, business, Indian mobile number and full delivery address, including a valid 6-digit PIN code.');
  const now = new Date().toISOString();
  const values = {email:user.email,name:body.name.trim(),phone:body.phone,business:body.business.trim(),address:JSON.stringify(body.address),updatedAt:now};
  await getDb().insert(profiles).values({userId:user.userId,...values,createdAt:now}).onConflictDoUpdate({target:profiles.userId,set:values});
  return Response.json({ok:true});
}
