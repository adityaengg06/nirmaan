import {getCurrentUser,signInPath} from '../../auth';
import StudentPortal from '../../../components/nirmaan/student-portal';
export const dynamic='force-dynamic';
export const metadata={title:'Secure Student Portal | NIRMAAN',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const user=await getCurrentUser();return user?<StudentPortal id={id}/>:<main className="section secure-student-page"><div className="eyebrow">NIRMAAN · PRIVATE STUDENT RECORDS</div><h1>Your ID. Your information.</h1><p>Sign in using the email assigned by your institution to view your profile, results, fee record and attendance.</p><a className="btn orange" href={signInPath('/student/'+encodeURIComponent(id))} target="_top">Sign in securely</a></main>}
