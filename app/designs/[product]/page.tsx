import {renderPage} from '../../../components/nirmaan/render-page';
import {PRODUCT_IDS} from '../../../lib/commerce';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{product:string}>}){const {product}=await params;if(!PRODUCT_IDS.includes(product))notFound();return renderPage('designs',{product});}
