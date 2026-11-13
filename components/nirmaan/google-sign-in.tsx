'use client';
import {useEffect,useRef,useState} from 'react';
import {jsonRequest} from '../../lib/client-request';
import {safeReturnPath} from '../../lib/auth-path';

type GoogleIdentity = {initialize:(options:{client_id:string;nonce:string;auto_select:boolean;ux_mode:'popup';callback:(response:{credential:string})=>void})=>void;renderButton:(parent:HTMLElement,options:{type:'standard';theme:'outline';size:'large';text:'continue_with';shape:'pill';width:number})=>void;disableAutoSelect:()=>void};
declare global {interface Window {google?:{accounts:{id:GoogleIdentity}}}}
let sdk:Promise<void>|undefined;
function loadGoogle():Promise<void>{
  if(window.google?.accounts.id)return Promise.resolve();
  if(!sdk)sdk=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
    const timeout=setTimeout(()=>{script.remove();sdk=undefined;reject(new Error('Google sign-in could not load. Check your connection and try again.'))},15000);
    script.onload=()=>{clearTimeout(timeout);if(window.google?.accounts.id)resolve();else{sdk=undefined;reject(new Error('Google sign-in is unavailable. Please try again.'))}};
    script.onerror=()=>{clearTimeout(timeout);script.remove();sdk=undefined;reject(new Error('Google sign-in could not load. Check your connection and try again.'))};
    document.head.appendChild(script);
  });
  return sdk;
}

/** The button itself is rendered by Google's official Identity Services SDK. */
export default function GoogleSignIn({returnTo='/account'}:{returnTo?:string}){
  const host=useRef<HTMLDivElement>(null);const[error,setError]=useState('');const[status,setStatus]=useState('Loading Google sign-in…');const[attempt,setAttempt]=useState(0);const[busy,setBusy]=useState(false);const inFlight=useRef(false);
  useEffect(()=>{
    let active=true;const controller=new AbortController();let refresh:ReturnType<typeof setTimeout>|undefined;
    setError('');setStatus('Loading Google sign-in…');
    async function start(){
      try{
        const challenge=await jsonRequest('/api/auth/challenge',{signal:controller.signal});
        if(!active)return;
        if(!challenge.clientId||!challenge.nonce||!challenge.csrfToken)throw new Error('Google sign-in needs to be configured by the NIRMAAN team.');
        await loadGoogle();if(!active||!host.current)return;
        const identity=window.google!.accounts.id;
        identity.initialize({client_id:challenge.clientId,nonce:challenge.nonce,auto_select:false,ux_mode:'popup',callback:response=>{
          if(!active||inFlight.current)return;
          inFlight.current=true;setBusy(true);setError('');setStatus('Verifying your Google account…');
          void jsonRequest('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential,csrfToken:challenge.csrfToken})}).then(()=>{
            if(active)window.location.assign(safeReturnPath(returnTo));
          }).catch(reason=>{if(active){setError(reason instanceof Error?reason.message:'Unable to sign in. Please try again.');setStatus('');setBusy(false);inFlight.current=false;host.current?.replaceChildren()}});
        }});
        host.current.replaceChildren();
        identity.renderButton(host.current,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',width:Math.max(200,Math.min(400,Math.floor(host.current.clientWidth)))});
        setStatus('');refresh=setTimeout(()=>{if(active&&!inFlight.current)setAttempt(value=>value+1)},240000);
      }catch(reason){if(active){setError(reason instanceof Error?reason.message:'Google sign-in is unavailable.');setStatus('')}}
    }
    void start();return()=>{active=false;controller.abort();if(refresh)clearTimeout(refresh);host.current?.replaceChildren()};
  },[attempt,returnTo]);
  return <div className="google-sign-in" aria-busy={busy}><div ref={host} className="google-button-host" style={busy?{pointerEvents:'none',opacity:.6}:undefined}/>{status&&<p className="muted" role="status">{status}</p>}{error&&<div className="google-auth-error" role="alert"><p>{error}</p><button type="button" className="text-link" onClick={()=>{inFlight.current=false;setBusy(false);setAttempt(value=>value+1)}}>Try Google sign-in again</button><a className="text-link" href="https://wa.me/918052967633" target="_blank" rel="noreferrer">Contact NIRMAAN</a></div>}</div>;
}
