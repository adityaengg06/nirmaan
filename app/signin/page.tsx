import {redirect} from 'next/navigation';
import {getCurrentUser} from '../auth';
import {safeReturnPath} from '../../lib/auth-path';
import GoogleSignIn from '../../components/nirmaan/google-sign-in';
export const dynamic='force-dynamic';
export const metadata={title:'Sign in with Google | NIRMAAN'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams;const returnTo=safeReturnPath(query.return_to);if(await getCurrentUser())redirect(returnTo);
 return <main className="section signin-page"><a href="/" className="brand">NIRMAAN</a><div className="signup-card"><div className="eyebrow">YOUR NIRMAAN ACCOUNT</div><h1>Continue with Google.</h1><p>Access your saved designs, business profile and orders. New here? Complete your business and delivery details after signing in.</p><GoogleSignIn returnTo={returnTo}/><p className="muted">Use the Google account connected to your NIRMAAN profile.</p><a className="text-link" href="/create-account">Create your business profile</a></div></main>;
}
