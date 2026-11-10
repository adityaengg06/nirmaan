'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {SkipForward} from 'lucide-react';
import TapDemo from './tap-demo';
const STORAGE_KEY='nirmaan-intro-seen-v1';
export default function IntroAnimation(){
 const[visible,setVisible]=useState(true);const[replay,setReplay]=useState(false);const[run,setRun]=useState(0);const[reduced,setReduced]=useState(false);const skip=useRef<HTMLButtonElement>(null);
 const finish=useCallback(()=>{try{sessionStorage.setItem(STORAGE_KEY,'1')}catch{}document.documentElement.dataset.nirmaanIntro='seen';setVisible(false);window.dispatchEvent(new Event('nirmaan:intro-finished'))},[]);
 useEffect(()=>{try{if(location.pathname==='/'){document.documentElement.dataset.nirmaanIntro='play';setVisible(true)}else setVisible(false)}catch{}const restart=()=>{setReplay(true);setRun(n=>n+1);setVisible(true)};window.addEventListener('nirmaan:replay-intro',restart);return()=>window.removeEventListener('nirmaan:replay-intro',restart)},[]);
 useEffect(()=>{if(!visible)return;try{if(!replay&&location.pathname!=='/')return}catch{}
  setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);const content=document.getElementById('site-content');const oldInert=content?.inert,oldHidden=content?.getAttribute('aria-hidden'),oldOverflow=document.body.style.overflow,oldFocus=document.activeElement as HTMLElement|null;
  if(content){content.inert=true;content.setAttribute('aria-hidden','true')}document.body.style.overflow='hidden';skip.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();finish()}else if(e.key==='Tab'){e.preventDefault();skip.current?.focus()}};document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=oldOverflow;if(content){content.inert=oldInert??false;if(oldHidden==null)content.removeAttribute('aria-hidden');else content.setAttribute('aria-hidden',oldHidden)}if(oldFocus&&oldFocus!==document.body&&oldFocus.isConnected)oldFocus.focus({preventScroll:true})};
 },[visible,run,replay,finish]);
 if(!visible)return null;
 return <div className="intro-overlay intro-cinematic" data-replay={replay?'true':undefined} onClick={finish} role="dialog" aria-modal="true" aria-labelledby="intro-title" aria-describedby="intro-description"><div className="intro-topbar"><div className="brand"><span className="brand-symbol">n<span>•</span></span>NIRMAAN</div><button className="intro-skip" ref={skip} onClick={finish}>Skip intro <SkipForward size={16}/></button></div><div className="intro-cinematic-main"><div className="intro-accessible-label"><h1 id="intro-title">Tap a card. Open your Google review page.</h1><p id="intro-description">A phone taps the card, an NFC notification appears, and clicking it opens the review page. Click anywhere to skip.</p></div><TapDemo key={run} product="reviews" autoPlay duration={reduced?2000:5000} onComplete={finish} intro/><p className="intro-click-anywhere">Click anywhere to skip</p></div><div className="intro-bottom"><span>Managed by Infotech Business Solutions</span><span>A quick demo. A real possibility.</span></div></div>;
}
