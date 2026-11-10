import {renderPage} from '../components/nirmaan/render-page';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const query=await searchParams;const allowed=['home','account','admin','renewals','solutions','reviews'];return renderPage(allowed.includes(query.page||'')?query.page!:'home');}
