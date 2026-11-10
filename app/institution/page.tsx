import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import Institution from '../../components/nirmaan/institution';
export const dynamic='force-dynamic';
export const metadata={title:'Institution ID Desk | NIRMAAN'};
export default async function Page(){const user=await getChatGPTUser();return user?<Institution/>:<main className="section"><h1>Sign in to your institution.</h1><p>Student record management is available to institutions with an active ID-card order.</p><a className="btn orange" href={chatGPTSignInPath('/institution')} target="_top">Sign in to continue</a></main>}
