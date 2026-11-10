export type Design = {id:string;name:string;color:string;ink:string;accent:string;layout:string;theme:'White'|'Black'|'Colour';description:string};
// Ten distinct print layouts per product; monochrome designs lead every gallery.
export const DESIGNS: Design[] = [
 {id:'white-classic',name:'White Classic',color:'#ffffff',ink:'#202420',accent:'#202420',layout:'classic',theme:'White',description:'A clean white face, bold business name and a generous central QR.'},
 {id:'black-signature',name:'Black Signature',color:'#161918',ink:'#ffffff',accent:'#e6d3ac',layout:'signature',theme:'Black',description:'A deep black face, fine signature rule and a warm metallic-look accent.'},
 {id:'white-frame',name:'White Frame',color:'#fafaf7',ink:'#252a26',accent:'#252a26',layout:'frame',theme:'White',description:'A fine double border frames your logo, details and QR.'},
 {id:'black-editorial',name:'Black Editorial',color:'#232524',ink:'#ffffff',accent:'#ffffff',layout:'editorial',theme:'Black',description:'Left-aligned typography and a large editorial headline.'},
 {id:'white-grid',name:'White Grid',color:'#ffffff',ink:'#2c3830',accent:'#7e9787',layout:'grid',theme:'White',description:'A precise grid, compact header and structured information blocks.'},
 {id:'blue-arch',name:'Ocean Arch',color:'#31596d',ink:'#ffffff',accent:'#c3e0e7',layout:'arch',theme:'Colour',description:'An ocean-blue face, arched QR window and softly framed brand mark.'},
 {id:'sage-band',name:'Sage Band',color:'#dbe4d1',ink:'#263b2b',accent:'#3c5b43',layout:'band',theme:'Colour',description:'A soft sage base with a full-width brand band.'},
 {id:'terracotta-split',name:'Terracotta Split',color:'#d88a6c',ink:'#2f231c',accent:'#f9e9dc',layout:'split',theme:'Colour',description:'A terracotta face with a contrasting split-panel composition.'},
 {id:'navy-minimal',name:'Midnight Minimal',color:'#172a40',ink:'#f8f9fa',accent:'#b7cbd5',layout:'minimal',theme:'Colour',description:'Deep navy, quiet typography and extra breathing room.'},
 {id:'sand-studio',name:'Sand Studio',color:'#eee2cc',ink:'#403525',accent:'#8f7450',layout:'studio',theme:'Colour',description:'Warm sand, offset lines and a studio-inspired identity panel.'},
];
export const FEATURED_DESIGNS = [DESIGNS[0],DESIGNS[1],DESIGNS[5],DESIGNS[2],DESIGNS[6],DESIGNS[7]];
export function getDesign(id?:string) { return DESIGNS.find(d=>d.id===(id==='black-arch'?'blue-arch':id))||DESIGNS[0]; }
export function galleryPath(product:string){return '/designs/'+product;}
export function checkoutPath(product:string,design?:string,upload=false){return '/checkout?product='+encodeURIComponent(product)+(design?'&design='+encodeURIComponent(design):'')+(upload?'&upload=1':'');}

export type PrintSpecification = 'single-sided'|'double-sided-identical'|'double-sided-business';
export function printSpecification(product:string):PrintSpecification{return product==='menu'?'double-sided-identical':product==='business'?'double-sided-business':'single-sided';}
export function printLabel(product:string){return product==='menu'?'Both sides printed · identical design':product==='business'?'Both sides printed · front and reverse':'Single-sided printing';}

export function featuredDesignsFor(product:string):Design[]{
 const pairs:Record<string,[string,string]>={reviews:['white-classic','blue-arch'],menu:['black-signature','sage-band'],business:['white-frame','terracotta-split'],'id-card':['black-editorial','navy-minimal'],social:['white-grid','sand-studio'],event:['black-signature','blue-arch'],custom:['white-classic','sage-band']};
 return (pairs[product]||pairs.custom).map(getDesign);
}
