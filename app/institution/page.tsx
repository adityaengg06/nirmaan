import {getCurrentUser,signInPath} from '../auth';
import Institution from '../../components/nirmaan/institution';
export const dynamic='force-dynamic';
export const metadata={title:'Institution ID Desk | NIRMAAN'};
export default async function Page(){const user=await getCurrentUser();return user?<Institution/>:<main className="section"><h1>Sign in to your institution.</h1><p>Student record management is available to institutions with an active ID-card order.</p><a className="btn orange" href={signInPath('/institution')} target="_top">Sign in to continue</a></main>}
