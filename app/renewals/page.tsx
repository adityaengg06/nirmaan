import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export const metadata={title:'Renew My Subscription | NIRMAAN'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const query=await searchParams;return renderPage('renewals',{product:query.product,editing:query.edit==='1'});}
