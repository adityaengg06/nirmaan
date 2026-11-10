import Store from '../../app/store';
import {getChatGPTUser} from '../../app/chatgpt-auth';
export async function renderPage(page:string, options:{product?:string;editing?:boolean}={}){const user=await getChatGPTUser();return <Store signedIn={!!user} email={user?.email} initialPage={page} initialProduct={options.product} editing={options.editing}/>;}
