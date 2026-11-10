import {renderPage} from '../../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export const metadata={title:'Create Your Account | NIRMAAN'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const query=await searchParams;return renderPage('signup',{product:query.product,editing:query.edit==='1',design:query.design,upload:query.upload==='1'});}
