import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return renderPage('upload-design',{product:q.product||'custom',upload:true,design:q.design});}
