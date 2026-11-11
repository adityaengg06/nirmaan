// Regression cases for completed Indian account/address forms. No database writes.
import assert from 'node:assert/strict';
import {PHONE_INPUT_PATTERN,normalizePhone,validPhone,validAddress,validateAddressInput,validateProfileInput} from '../lib/commerce.ts';
const address={recipient:'  Test Customer  ',phone:'91 80529 67633',line1:'5',city:' Lucknow ',district:' Lucknow ',state:' uttar   pradesh ',pincode:'226 001',country:' india '};
const completed={name:' Test Customer ',phone:'+91\u00a080529\u00a067633',business:' Test Business ',address};
// Use actual non-breaking spaces, as inserted by mobile contacts/autofill.
completed.phone=completed.phone.replaceAll('\\u00a0','\u00a0');
const saved=validateProfileInput(completed);assert(saved.ok,saved.ok?'':saved.message);
assert.equal(saved.value.name,'Test Customer');assert.equal(saved.value.business,'Test Business');assert.equal(saved.value.phone,'8052967633');
assert.deepEqual(saved.value.address,{recipient:'Test Customer',phone:'8052967633',line1:'5',line2:'',landmark:'',city:'Lucknow',district:'Lucknow',state:'Uttar Pradesh',pincode:'226001',country:'India'});
assert(validAddress(address),'Checkout and profile agree on a completed formatted address.');
assert(validateAddressInput({...address,line1:'A',line2:null,landmark:null}).ok,'Short house identifiers and unused optional fields are valid.');
for(const phone of ['8052967633','+91 80529 67633','91-80529-67633','0091 80529 67633','(80529) 67633','+91 (80529) 67633',' 80529\u00a067633 ','08052967633']){
 const value=phone.replaceAll('\\u00a0','\u00a0');assert(validPhone(value),value);assert.equal(normalizePhone(value),'8052967633');
 for(const flags of ['u','v'])assert(new RegExp('^(?:'+PHONE_INPUT_PATTERN+')$',flags).test(value),'Browser pattern allows '+value+' before normalization.');
}
for(const phone of ['abc8052967633','+1 8052967633','12345','5052967633','18052967633','999999999999999',8052967633,null,{}])assert(!validPhone(phone),'Reject malformed/non-Indian mobile '+String(phone));
const failures=[
 [{...completed,name:'  '},'name',/name/i],
 [{...completed,business:'  '},'business',/business|organization/i],
 [{...completed,phone:'123'},'phone',/WhatsApp/i],
 [{...completed,address:{...address,recipient:''}},'address.recipient',/recipient/i],
 [{...completed,address:{...address,phone:'123'}},'address.phone',/delivery mobile/i],
 [{...completed,address:{...address,line1:' '}},'address.line1',/house|flat|shop/i],
 [{...completed,address:{...address,city:''}},'address.city',/city|town/i],
 [{...completed,address:{...address,district:''}},'address.district',/district/i],
 [{...completed,address:{...address,state:'Unknown State'}},'address.state',/state|territory/i],
 [{...completed,address:{...address,pincode:'000000'}},'address.pincode',/PIN/i],
 [{...completed,address:{...address,pincode:'22600'}},'address.pincode',/PIN/i],
 [{...completed,address:{...address,pincode:'2260017'}},'address.pincode',/PIN/i],
 [{...completed,address:{...address,pincode:226001}},'address.pincode',/PIN/i],
 [{...completed,address:{...address,country:'USA'}},'address.country',/India/i],
 [{...completed,address:{...address,line2:{invalid:true}}},'address.line2',/street|area/i],
 [{...completed,address:[]},'address',/address/i],
];
for(const [input,field,message] of failures){const result=validateProfileInput(input);assert(!result.ok,field+' must remain mandatory/valid');assert.equal(result.field,field);assert.match(result.message,message);}
console.log('PASS: completed formatted accounts, short house identifiers, optional address fields, country/state/PIN normalization, mobile formats/browser patterns and actionable field-specific errors; invalid/malformed fields remain rejected.');
