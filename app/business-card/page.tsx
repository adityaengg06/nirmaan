import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export const metadata={title:'Digital Business Cards | NIRMAAN'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const query=await searchParams;return renderPage('business',{product:query.product,editing:query.edit==='1'});}
