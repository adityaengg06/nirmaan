import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sameOrigin, validateProfileInput } from '../../../lib/commerce';
import { error, isAdmin } from '../../../lib/commerce-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({signedIn:false,profile:null},{headers:{'Cache-Control':'private, no-store'}});
  const profile = (await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)))[0];
  return Response.json({signedIn:true,email:user.email,localPreview:(env as Cloudflare.Env).NIRMAAN_LOCAL_PREVIEW === '1',admin:isAdmin(user.email),profile:profile ? {...profile,address:JSON.parse(profile.address)} : null},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user = await getChatGPTUser(); if (!user) return error('Sign in to create your account.',401);
  let body; try { body = await request.json() as Record<string,unknown>; } catch { return error('Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid request.');
  const validated = validateProfileInput(body);
  if (!validated.ok) return Response.json({error:validated.message,field:validated.field},{status:400,headers:{'Cache-Control':'private, no-store'}});
  const profile = validated.value;
  const now = new Date().toISOString();
  const values = {email:user.email,name:profile.name,phone:profile.phone,business:profile.business,address:JSON.stringify(profile.address),updatedAt:now};
  await getDb().insert(profiles).values({userId:user.userId,...values,createdAt:now}).onConflictDoUpdate({target:profiles.userId,set:values});
  return Response.json({ok:true});
}
