import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export const metadata={title:'Design Studio | NIRMAAN'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;return renderPage('studio',{product:q.product||'reviews',design:q.design});}
