import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return renderPage('custom',{product:q.product||'custom',upload:false,design:q.design});}
