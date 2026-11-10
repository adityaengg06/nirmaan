import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { artwork, profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { error, isAdmin } from '../../../lib/commerce-server';
import { sameOrigin } from '../../../lib/commerce';
const TYPES = ['image/png','image/jpeg','image/webp','application/pdf'];
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user = await getChatGPTUser(); if (!user) return error('Create an account first.',401);
  if (!(await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)))[0]) return error('Complete your NIRMAAN account first.',403);
  if (Number(request.headers.get('content-length') || 0) > 11_000_000) return error('Use a file under 10 MB.',413);
  const data = await request.formData(); const file = data.get('file'); const kind = data.get('kind');
  if (!(file instanceof File) || !['design','logo','photo'].includes(String(kind)) || !TYPES.includes(file.type) || (kind !== 'design' && file.type === 'application/pdf') || file.size < 1 || file.size > 10_000_000) return error('Upload JPG, PNG or WebP images, or a PDF design, up to 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) : file.type === 'image/jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : file.type === 'application/pdf' ? new TextDecoder().decode(bytes.slice(0,5))==='%PDF-' : new TextDecoder().decode(bytes.slice(0,4))==='RIFF' && new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if (!valid) return error('The file content does not match its image or PDF format.');
  const id = crypto.randomUUID(); const filename = file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,100) || 'artwork';
  await env.BUCKET!.put('artwork/'+id, bytes, {httpMetadata:{contentType:file.type}});
  try { await getDb().insert(artwork).values({id,userId:user.userId,kind:String(kind),filename,contentType:file.type,size:file.size,createdAt:new Date().toISOString()}); }
  catch { await env.BUCKET!.delete('artwork/'+id); return error('Could not save the upload. Try again.',500); }
  return Response.json({id,filename,kind});
}
export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return error('Sign in required.',401);
  const id = new URL(request.url).searchParams.get('id') || '';
  const row = (await getDb().select().from(artwork).where(eq(artwork.id,id)))[0];
  if (!row || (row.userId !== user.userId && !isAdmin(user.email))) return error('Not found.',404);
  const file = await env.BUCKET!.get('artwork/'+id); if (!file) return error('File not found.',404);
  return new Response(file.body,{headers:{'Content-Type':row.contentType,'Content-Disposition':'attachment; filename="'+row.filename+'"','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
}
