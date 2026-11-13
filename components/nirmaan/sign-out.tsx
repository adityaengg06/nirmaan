'use client';
import {useState} from 'react';
import {jsonRequest} from '../../lib/client-request';
import {safeReturnPath} from '../../lib/auth-path';
export default function SignOut({label='Sign out',returnTo='/create-account'}:{label?:string;returnTo?:string}){
 const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 async function logout(){setBusy(true);setError('');try{const session=await jsonRequest('/api/auth/session');if(session.user){if(!session.csrfToken)throw new Error('Your session could not be verified. Refresh and try again.');await jsonRequest('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':session.csrfToken}})}window.google?.accounts.id.disableAutoSelect();window.location.assign(safeReturnPath(returnTo))}catch(reason){setError(reason instanceof Error?reason.message:'Unable to sign out. Please try again.');setBusy(false)}}
 return <div className="sign-out-control"><button type="button" className="text-link" onClick={logout} disabled={busy}>{busy?'Signing out…':label}</button>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
