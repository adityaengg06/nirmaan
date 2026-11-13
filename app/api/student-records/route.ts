import {env} from 'cloudflare:workers';
import {eq,and,desc} from 'drizzle-orm';
import {getCurrentUser} from '../../auth';
import {getDb} from '../../../db';
import {requests,studentRecords} from '../../../db/schema';
import {sameOrigin} from '../../../lib/commerce';
import {error,isAdmin} from '../../../lib/commerce-server';
export const dynamic='force-dynamic';
function active(order:typeof requests.$inferSelect|undefined){return !!order&&order.kind==='order'&&order.status==='active'&&!!order.paymentVerifiedAt&&!!order.expiresAt&&Date.parse(order.expiresAt)>Date.now()&&JSON.parse(order.details).product==='id-card'&&JSON.parse(order.details).idExperience==='student-portal';}
export async function GET(request:Request){
 const user=await getCurrentUser();if(!user)return error('Sign in to access student records.',401);
 const db=getDb();const id=new URL(request.url).searchParams.get('id');
 if(id){const row=(await db.select().from(studentRecords).where(eq(studentRecords.id,id)))[0];if(!row||(row.issuerId!==user.userId&&row.studentEmail!==user.email.toLowerCase()&&!isAdmin(user.email)))return error('This record is not available to your account.',404);const order=(await db.select().from(requests).where(eq(requests.id,row.orderId)))[0];if(!active(order))return error('The institution’s ID service needs activation or renewal.',410);return Response.json({record:{id:row.id,name:row.name,studentId:row.studentId,className:row.className,organization:order.business,studentEmail:row.studentEmail,updatedAt:row.updatedAt,...JSON.parse(row.data)}},{headers:{'Cache-Control':'private, no-store'}});}
 const orders=isAdmin(user.email)?await db.select().from(requests).where(eq(requests.kind,'order')):await db.select().from(requests).where(and(eq(requests.kind,'order'),eq(requests.userId,user.userId)));
 const eligible=orders.filter(active);
 const records=isAdmin(user.email)?await db.select().from(studentRecords).orderBy(desc(studentRecords.updatedAt)):await db.select().from(studentRecords).where(eq(studentRecords.issuerId,user.userId)).orderBy(desc(studentRecords.updatedAt));
 return Response.json({orders:eligible.map(o=>({id:o.id,business:o.business,quantity:JSON.parse(o.details).quantity||1,expiresAt:o.expiresAt})),records:records.map(r=>({...r,...JSON.parse(r.data)}))},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return error('Forbidden',403);const user=await getCurrentUser();if(!user)return error('Sign in required.',401);
 let b:any;try{b=await request.json()}catch{return error('Invalid record.');}
 if(!b||typeof b!=='object'||Array.isArray(b))return error('Invalid record.');
 const validString=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>=2&&v.length<=max;
 if(!validString(b.name,100)||!validString(b.studentId,80)||!validString(b.className,100)||typeof b.studentEmail!=='string'||b.studentEmail.length>254||!/^\S+@\S+\.\S+$/.test(b.studentEmail))return error('Complete the student name, ID, class and assigned sign-in email.');
 const a=b.attendance,f=b.fees;
 if(!a||!Number.isInteger(a.present)||!Number.isInteger(a.total)||a.present<0||a.total<0||a.total>10000||a.present>a.total)return error('Attendance must have valid present and total counts.');
 if(!f||!Number.isInteger(f.total)||!Number.isInteger(f.paid)||f.total<0||f.total>10000000||f.paid<0||f.paid>f.total||typeof f.reference!=='string'||f.reference.length>150)return error('Enter valid total and paid fees, in whole rupees.');
 if(!Array.isArray(b.results)||b.results.length>30||b.results.some((r:any)=>!r||!validString(r.subject,100)||typeof r.marks!=='number'||typeof r.maxMarks!=='number'||!Number.isFinite(r.marks)||!Number.isFinite(r.maxMarks)||r.marks<0||r.maxMarks<=0||r.maxMarks>10000||r.marks>r.maxMarks))return error('Check subject names and marks; marks cannot exceed the maximum.');
 const db=getDb();const order=(await db.select().from(requests).where(eq(requests.id,String(b.orderId))))[0];
 if(!active(order)||(order.userId!==user.userId&&!isAdmin(user.email)))return error('An active, verified ID-card order owned by your institution is required.',403);
 const current=b.id?(await db.select().from(studentRecords).where(eq(studentRecords.id,String(b.id))))[0]:null;
 if(b.id&&(!current||current.orderId!==order.id||current.issuerId!==order.userId))return error('Record not found for this order.',404);
 const existing=await db.select().from(studentRecords).where(eq(studentRecords.orderId,order.id));
 if(!current&&existing.length>=(JSON.parse(order.details).quantity||1))return error('All IDs in this order are assigned. Place an additional ID-card order to add more students.');
 if(existing.some(r=>r.studentId===b.studentId.trim()&&r.id!==current?.id))return error('This student ID is already assigned in this order.');
 const id=current?.id||crypto.randomUUID();const now=new Date().toISOString();
 const data=JSON.stringify({attendance:{present:a.present,total:a.total},fees:{total:f.total,paid:f.paid,reference:f.reference},results:b.results.map((r:any)=>({subject:r.subject.trim(),marks:r.marks,maxMarks:r.maxMarks}))});
 const values={orderId:order.id,issuerId:order.userId,studentEmail:b.studentEmail.trim().toLowerCase(),name:b.name.trim(),studentId:b.studentId.trim(),className:b.className.trim(),data,updatedAt:now};
 if(current)await db.update(studentRecords).set(values).where(eq(studentRecords.id,id));else {const inserted=await env.DB!.prepare('INSERT INTO student_records (id,order_id,issuer_id,student_email,name,student_id,class_name,data,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM student_records WHERE order_id = ?) < ? AND NOT EXISTS (SELECT 1 FROM student_records WHERE order_id = ? AND student_id = ?)').bind(id,values.orderId,values.issuerId,values.studentEmail,values.name,values.studentId,values.className,data,now,now,order.id,JSON.parse(order.details).quantity||1,order.id,values.studentId).run();if(!inserted.meta.changes)return error('This ID was just assigned or the order has reached its card limit. Refresh and try again.',409);}
 return Response.json({ok:true,id});
}
