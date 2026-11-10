import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8787';const run=crypto.randomUUID();
const issuer={'oai-authenticated-user-id':'school-'+run,'oai-authenticated-user-email':'school@example.test'};
const student={'oai-authenticated-user-id':'student-'+run,'oai-authenticated-user-email':'student@example.test'};
const outsider={'oai-authenticated-user-id':'outsider-'+run,'oai-authenticated-user-email':'outsider@example.test'};
const admin={'oai-authenticated-user-id':'qa-admin','oai-authenticated-user-email':'buisness.aditya2006@gmail.com'};
async function request(path,identity={},method='GET',body){const response=await fetch(base+path,{method,headers:{...identity,...(method!=='GET'?{Origin:base,'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});return response;}
async function check(response,status=200){assert.equal(response.status,status,await response.clone().text());return response;}
for(const product of ['reviews','menu','social','id-card','business','custom']){const gallery=await check(await request('/designs/'+product));const html=await gallery.text();assert.equal((html.match(/data-design-card=/g)||[]).length,10);assert(html.indexOf('White Classic')<html.indexOf('Black Signature'));assert(html.includes('background:#ffffff'));assert(html.includes('background:#161918'));}
for(const path of ['/reviews','/menu','/id-card','/social','/business-card','/custom']){const html=await (await check(await request(path))).text();assert.equal((html.match(/data-design-card=/g)||[]).length,2);assert(html.includes('Upload your own design directly'));assert(html.includes('/samples/'));}
await check(await request('/designs/unknown'),404);await check(await request('/upload-design'));
await check(await request('/api/student-records'),401);
const address={recipient:'QA Issuer',phone:'9876543210',line1:'12 Test Building',line2:'Test Road',landmark:'Test park',city:'Lucknow',district:'Lucknow',state:'Uttar Pradesh',pincode:'226001',country:'India'};
await check(await request('/api/profile',issuer,'POST',{name:'QA Issuer',phone:'9876543210',business:'QA Academy',address}));
const details={product:'id-card',businessName:'QA Academy',color:'#ffffff',destination:'',format:'pvc-card',quantity:1,address,termsAccepted:true,employeeName:'QA Student',employeeId:'QA-014',designTemplate:'white-classic',designMode:'template',idExperience:'student-portal'};
const order=await (await check(await request('/api/requests',issuer,'POST',{kind:'order',business:'QA Academy',phone:'9876543210',details}))).json();
const record={orderId:order.id,name:'QA Student',studentId:'QA-014',studentEmail:student['oai-authenticated-user-email'],className:'Class 10 A',attendance:{present:86,total:92},fees:{total:24000,paid:18000,reference:'TEST-FEE-014'},results:[{subject:'Mathematics',marks:92,maxMarks:100}]};
await check(await request('/api/student-records',issuer,'POST',record),403);
await check(await request('/api/requests',admin,'PATCH',{id:order.id,action:'quote',quoteAmount:200}));await check(await request('/api/requests',issuer,'PATCH',{id:order.id,action:'accept_quote',amount:299,termsAccepted:true}));
const fd=new FormData();fd.set('id',order.id);fd.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'receipt.png');await check(await fetch(base+'/api/receipt',{method:'POST',headers:{...issuer,Origin:base},body:fd}));await check(await request('/api/requests',admin,'PATCH',{id:order.id,action:'verify',confirmedPayment:true}));
await check(await request('/api/student-records',outsider,'POST',record),403);
await check(await request('/api/student-records',issuer,'POST',{...record,attendance:{present:100,total:92}}),400);
await check(await request('/api/student-records',issuer,'POST',{...record,fees:{total:100,paid:200,reference:''}}),400);
const saved=await (await check(await request('/api/student-records',issuer,'POST',record))).json();
await check(await request('/api/student-records',issuer,'POST',{...record,studentId:'QA-015',studentEmail:'second@example.test'}),400);
await check(await request('/api/student-records?id='+saved.id,outsider),404);
await check(await request('/api/student-records?id='+saved.id),401);
const own=await (await check(await request('/api/student-records?id='+saved.id,student))).json();assert.equal(own.record.name,'QA Student');assert.equal(own.record.fees.paid,18000);assert.equal(own.record.results[0].marks,92);
await check(await request('/api/student-records',student,'POST',{...record,id:saved.id}),403);
const outsiderList=await (await check(await request('/api/student-records',outsider))).json();assert.equal(outsiderList.records.length,0);
await check(await request('/api/student-records',issuer,'POST',{...record,id:saved.id,fees:{total:24000,paid:24000,reference:'TEST-PAID'}}));
const paid=await (await request('/api/student-records?id='+saved.id,student)).json();assert.equal(paid.record.fees.paid,24000);
const tap=await check(await request('/tap/'+order.id+'?student='+saved.id),302);assert.equal(tap.headers.get('location'),'/student/'+saved.id);
await check(await request('/tap/'+order.id+'?student=missing'),409);
const anonPage=await (await check(await request('/student/'+saved.id))).text();assert(!anonPage.includes('QA Student'));assert(anonPage.includes('Sign in securely'));
await writeFile('outputs/catalog-qa.json',JSON.stringify({issuer,student,orderId:order.id,studentRecordId:saved.id}));
console.log('PASS: 10 layouts/category, two featured designs, white/black priority, direct upload links, illustrated product flows, student portal activation, issuer authorization, student isolation, validated academic/fee/attendance records, card capacity and managed ID links. Local fixtures only.');
