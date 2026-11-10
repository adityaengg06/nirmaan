import {DESIGNS} from '../../../lib/designs';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { requests, profiles, artwork } from '../../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { addMonths, POLICY_VERSION, PRODUCT_IDS, RENEWALS, sameOrigin, STARTER_AMOUNT, validAddress, validDestination, validPhone } from '../../../lib/commerce';
import { error, isAdmin } from '../../../lib/commerce-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return error('Please sign in.',401);
  const all = new URL(request.url).searchParams.get('admin') === '1';
  if (all && !isAdmin(user.email)) return error('Administrator access is restricted to the authorized business email.',403);
  const db = getDb();
  const rows = all ? await db.select().from(requests).orderBy(desc(requests.createdAt)) : await db.select().from(requests).where(eq(requests.userId,user.userId)).orderBy(desc(requests.createdAt));
  return Response.json({rows,email:user.email,admin:isAdmin(user.email),canRenew:rows.some(r=>r.kind==='order'&&r.status==='active'&&!!r.paymentVerifiedAt)});
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user = await getChatGPTUser(); if (!user) return error('Create your account before placing an order.',401);
  let body: Record<string, any>; try { body = await request.json() as Record<string,any>; } catch { return error('Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid request.');
  const {kind} = body; const details = body.details;
  if (!['order','demo','renewal'].includes(kind) || typeof body.business !== 'string' || body.business.trim().length < 2 || body.business.length > 150 || !validPhone(body.phone)) return error('Enter your business name and a valid Indian mobile number.');
  if (!details || typeof details !== 'object' || Array.isArray(details)) return error('Request details are required.');
  if (details.notes !== undefined && (typeof details.notes !== 'string' || details.notes.length > 1500)) return error('Keep your notes under 1500 characters.');
  const db = getDb(); let amount = 0; let status = 'pending';
  if (kind === 'order') {
    const profile = (await db.select().from(profiles).where(eq(profiles.userId,user.userId)))[0];
    if (!profile) return error('Complete your NIRMAAN account before placing an order.',403);
    if (!validAddress(details.address)) return error('Enter the complete delivery address with a valid PIN code.');
    if (!PRODUCT_IDS.includes(details.product) || (!(details.product==='id-card'&&details.idExperience==='student-portal')&&!validDestination(details.destination)) || typeof details.businessName !== 'string' || !details.businessName.trim() || details.businessName.length > 100 || !/^#[a-fA-F0-9]{6}$/.test(details.color)) return error('Complete your product, business name, colour and valid destination link.');
    if (details.designTemplate!==undefined&&!DESIGNS.some(d=>d.id===details.designTemplate)) return error('Select a valid design template.');
    if (details.designMode==='upload'&&!details.designId) return error('Upload your custom design before proceeding.');
    if (details.product==='id-card'&&details.idExperience!==undefined&&!['student-portal','external'].includes(details.idExperience)) return error('Select a valid ID experience.');
    if (details.format !== (['reviews','menu','social','custom'].includes(details.product) ? 'countertop-display' : 'pvc-card')) return error('Select the correct product format.');
    if (!Number.isInteger(details.quantity) || details.quantity < 1 || details.quantity > 500) return error('Choose between 1 and 500 items.');
    if (details.termsAccepted !== true) return error('Accept the non-refundable and no-cancellation terms before proceeding.');
    for (const [key,expectedKind] of [['designId','design'],['logoId','logo'],['photoId','photo']]) {
      if (details[key]) { const file = (await db.select().from(artwork).where(eq(artwork.id,String(details[key]))))[0]; if (!file || file.userId !== user.userId || file.kind !== expectedKind) return error('An uploaded file is unavailable or belongs to another account.',403); }
    }
    if (['tagline','wishes','notes','employeeName','designation','employeeId','contactDetails'].some(k=>details[k]!==undefined&&(typeof details[k]!=='string'||details[k].length>1500))) return error('Keep each customization field under 1500 characters.');
    if (details.product === 'id-card' && (!details.employeeName?.trim() || !details.employeeId?.trim())) return error('Enter the employee name and ID number.');
    details.policyVersion = POLICY_VERSION; details.termsAcceptedAt = new Date().toISOString(); amount = STARTER_AMOUNT; status = 'pending_quote';
  }
  if (kind === 'renewal') {
    if (!RENEWALS[String(body.months)] || details.termsAccepted !== true) return error('Select a renewal plan and accept the payment terms.');
    const subscription = (await db.select().from(requests).where(and(eq(requests.id,String(details.orderId)),eq(requests.userId,user.userId))))[0];
    if (!subscription || subscription.kind !== 'order' || subscription.status !== 'active' || !subscription.paymentVerifiedAt) return error('Renewals unlock after your first paid product is verified and activated.',403);
    details.months = String(body.months); details.policyVersion = POLICY_VERSION; details.termsAcceptedAt = new Date().toISOString(); amount = RENEWALS[String(body.months)]; status = 'awaiting_payment';
  }
  if (kind === 'demo') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(details.date) || !/^\d{2}:\d{2}$/.test(details.time) || !Number.isFinite(Date.parse(details.date+'T'+details.time+':00+05:30')) || Date.parse(details.date+'T'+details.time+':00+05:30') < Date.now()) return error('Choose a future demo date and time in IST.');
  }
  const allowed = kind === 'order' ? ['designTemplate','designMode','idExperience','product','businessName','color','tagline','wishes','contactDetails','notes','destination','quantity','format','address','employeeName','employeeId','designation','designId','logoId','photoId','termsAccepted','policyVersion','termsAcceptedAt'] : kind === 'renewal' ? ['orderId','months','termsAccepted','policyVersion','termsAcceptedAt'] : ['date','time','notes'];
  const serialized = JSON.stringify(Object.fromEntries(allowed.filter(key=>details[key]!==undefined).map(key=>[key,details[key]]))); if (serialized.length > 16000) return error('Your customization details are too long.');
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  await db.insert(requests).values({id,userId:user.userId,email:user.email,kind,business:body.business.trim(),phone:body.phone,details:serialized,amount,status,createdAt:now,quoteAcceptedAt:kind==='renewal'?now:null});
  return Response.json({id,message:kind==='demo'?'Demo request received. We will confirm your time on WhatsApp.':kind==='renewal'?'Renewal requested. Pay by UPI and upload your payment proof in your account.':'Requirements received. We’ll discuss your design and price, then send a quote to your account. Do not pay until you accept the final quote.'});
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return error('Forbidden',403);
  const user = await getChatGPTUser(); if (!user) return error('Sign in required.',401);
  let body: Record<string,any>; try { body = await request.json() as Record<string,any>; } catch { return error('Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid request.');
  const db = getDb(); const row = (await db.select().from(requests).where(eq(requests.id,String(body.id))))[0];
  if (!row || (row.userId !== user.userId && !isAdmin(user.email))) return error('Request not found.',404);
  const now = new Date().toISOString();
  if (body.action === 'accept_quote') {
    if (row.userId !== user.userId) return error('Only the customer can accept their quote.',403);
    if (row.kind !== 'order' || row.status !== 'awaiting_acceptance' || row.quoteAmount === null) return error('There is no quote to accept.');
    if (body.termsAccepted !== true || body.amount !== row.amount) return error('Review the current total and accept the payment terms.');
    const result = await db.update(requests).set({quoteAcceptedAt:now,status:'awaiting_payment'}).where(and(eq(requests.id,row.id),eq(requests.status,'awaiting_acceptance'),eq(requests.amount,body.amount))).returning();
    return result.length ? Response.json({ok:true}) : error('Your quote changed. Refresh and review it again.',409);
  }
  if (!isAdmin(user.email)) return error('Administrator access required.',403);
  if (body.action === 'quote') {
    if (row.kind !== 'order' || !['pending_quote','awaiting_acceptance','pending'].includes(row.status)) return error('A quote cannot change after customer acceptance.');
    if (!Number.isInteger(body.quoteAmount) || body.quoteAmount < 0 || body.quoteAmount > 1000000) return error('Enter the agreed product, printing and delivery price in whole rupees.');
    const changed = await db.update(requests).set({quoteAmount:body.quoteAmount,amount:STARTER_AMOUNT+body.quoteAmount,status:'awaiting_acceptance',quoteAcceptedAt:null}).where(and(eq(requests.id,row.id),eq(requests.status,row.status))).returning();
    return changed.length ? Response.json({ok:true}) : error('This order changed. Refresh before updating.',409);
  }
  if (body.action === 'confirm_demo' && row.kind === 'demo' && row.status === 'pending') { await db.update(requests).set({status:'confirmed'}).where(eq(requests.id,row.id)); return Response.json({ok:true}); }
  if (body.action === 'verify') {
    if (!['order','renewal'].includes(row.kind) || row.status !== 'payment_review' || !row.quoteAcceptedAt || body.confirmedPayment !== true) return error('Review the uploaded receipt and confirm payment before activation.');
    const receipt = await env.BUCKET!.head('receipts/'+row.id); if (!receipt) return error('Payment proof must be uploaded before verification.');
    if (row.kind === 'renewal') {
      const details = JSON.parse(row.details); const subscription = (await db.select().from(requests).where(eq(requests.id,String(details.orderId))))[0];
      if (!subscription || subscription.userId !== row.userId || !subscription.paymentVerifiedAt || subscription.status!=='active' || !RENEWALS[details.months]) return error('The linked subscription is unavailable.');
      const start = subscription.expiresAt && Date.parse(subscription.expiresAt)>Date.now() ? new Date(subscription.expiresAt) : new Date();
      const expiresAt = addMonths(start, Number(details.months));
      await db.batch([db.update(requests).set({status:'completed',paymentVerifiedAt:now,expiresAt}).where(and(eq(requests.id,row.id),eq(requests.status,'payment_review'))),db.update(requests).set({expiresAt}).where(eq(requests.id,subscription.id))]);
    } else { await db.update(requests).set({status:'active',paymentVerifiedAt:now,expiresAt:addMonths(new Date(),1)}).where(and(eq(requests.id,row.id),eq(requests.status,'payment_review'))); }
    return Response.json({ok:true});
  }
  return error('This action is unavailable. Confirmed orders cannot be cancelled.');
}
