import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDesigns,getDesign} from '../lib/designs.ts';
const categories=['reviews','menu','business','id-card','social','event','custom'];
for(const category of categories){const designs=getDesigns(category);assert.equal(designs.length,25);assert.equal(new Set(designs.map(d=>d.id)).size,25);assert.equal(designs.filter(d=>d.category===category).length,15);assert(designs.some(d=>d.theme==='White'));assert(designs.some(d=>d.theme==='Black'));assert(designs.filter(d=>d.theme==='Colour').length>=10);for(const d of designs){assert.equal(getDesign(d.id).id,d.id);assert(/^#[a-fA-F0-9]{6}$/.test(d.color));}}
const fixture=JSON.parse(await readFile('outputs/catalog-qa.json','utf8'));const base='http://127.0.0.1:8787';const headers={...fixture.issuer,Origin:base,'Content-Type':'application/json'};const profile=(await (await fetch(base+'/api/profile',{headers})).json()).profile;
const details={product:'reviews',businessName:'Theme QA',color:'#315f48',destination:'https://example.com',quantity:1,address:profile.address,format:'countertop-display',termsAccepted:true,designMode:'template',designTemplate:getDesigns('reviews')[10].id};
const create=async d=>fetch(base+'/api/requests',{method:'POST',headers,body:JSON.stringify({kind:'order',business:profile.business,phone:profile.phone,details:d})});
const own=await create(details);assert.equal(own.status,200,await own.text());const foreign=await create({...details,designTemplate:getDesigns('menu')[10].id});assert.equal(foreign.status,400);
console.log('PASS: 25 unique styles in each of seven categories, 15 category-specific themes each, valid colours, theme resolution, accepted category theme and rejected foreign theme.');
