import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';const id=crypto.randomUUID();const user={'oai-authenticated-user-id':'printing-'+id,'oai-authenticated-user-email':'printing@example.test'};
async function call(path,method='GET',body){return fetch(base+path,{method,headers:{...user,...(method!=='GET'?{Origin:base,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
async function ok(response,status=200){assert.equal(response.status,status,await response.clone().text());return response;}
const address={recipient:'Print Tester',phone:'9876543210',line1:'12 Test Building',line2:'Test Road',landmark:'Test park',city:'Lucknow',district:'Lucknow',state:'Uttar Pradesh',pincode:'226001',country:'India'};
await ok(await call('/api/profile','POST',{name:'Print Tester',phone:'9876543210',business:'Test Studio',address}));
const form=new FormData();form.set('kind','reverse');form.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'reverse.png');
const uploaded=await (await ok(await fetch(base+'/api/artwork',{method:'POST',headers:{...user,Origin:base},body:form}))).json();
const details={businessName:'Test Studio',color:'#ffffff',destination:'https://example.com',quantity:1,address,termsAccepted:true,designTemplate:'white-classic',designMode:'template'};
for(const [product,format,spec] of [['reviews','countertop-display','single-sided'],['menu','countertop-display','double-sided-identical'],['business','pvc-card','double-sided-business'],['event','pvc-card','single-sided']]){
 const response=await ok(await call('/api/requests','POST',{kind:'order',business:'Test Studio',phone:'9876543210',details:{...details,product,format,printSpecification:'tampered',...(product==='business'?{reverseDesignId:uploaded.id}:{})}}));const created=await response.json();const mine=await (await call('/api/requests')).json();const row=mine.rows.find(r=>r.id===created.id);const saved=JSON.parse(row.details);assert.equal(saved.printSpecification,spec);if(product==='business')assert.equal(saved.reverseDesignId,uploaded.id);
}
for(const product of ['reviews','menu','event'])await ok(await call('/api/requests','POST',{kind:'order',business:'Test Studio',phone:'9876543210',details:{...details,product,format:product==='event'?'pvc-card':'countertop-display',reverseDesignId:uploaded.id}}),400);
console.log('PASS: server-fixed print policy, business-only reverse artwork, identical menu printing, single-sided review/event cards and saved admin print specifications.');
