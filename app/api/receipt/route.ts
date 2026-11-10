import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { requests } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { error, isAdmin } from '../../../lib/commerce-server';
import { sameOrigin } from '../../../lib/commerce';
export async function POST(request:Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user=await getChatGPTUser(); if(!user) return error('Sign in required.',401);
  if(Number(request.headers.get('content-length')||0)>6_000_000) return error('Use an image under 5 MB.',413);
  const data=await request.formData();const id=String(data.get('id')||'');const file=data.get('file');
  const row=(await getDb().select().from(requests).where(eq(requests.id,id)))[0];
  if(!row||row.userId!==user.userId)return error('Forbidden',403);
  if(!['order','renewal'].includes(row.kind)||!['awaiting_payment','payment_review'].includes(row.status)||!row.quoteAcceptedAt)return error('Accept the confirmed quote before uploading payment proof.');
  if(!(file instanceof File)||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5_000_000||file.size<1)return error('Use a JPG, PNG or WebP image under 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const valid=file.type==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!valid)return error('The upload is not a valid image format.');
  await env.BUCKET!.put('receipts/'+id,bytes,{httpMetadata:{contentType:file.type}});
  await getDb().update(requests).set({status:'payment_review'}).where(and(eq(requests.id,id),eq(requests.status,row.status)));
  return Response.json({ok:true});
}
export async function GET(request:Request) {
  const user=await getChatGPTUser();if(!user)return error('Sign in required.',401);
  const id=new URL(request.url).searchParams.get('id')||'';const row=(await getDb().select().from(requests).where(eq(requests.id,id)))[0];
  if(!row||(row.userId!==user.userId&&!isAdmin(user.email)))return error('Forbidden',403);
  const file=await env.BUCKET!.get('receipts/'+id);if(!file)return error('No payment proof uploaded.',404);
  return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
