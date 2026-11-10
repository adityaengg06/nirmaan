"use client";
import {useEffect,useRef} from 'react';

const FOCUSABLE='a[href],button,input,select,textarea,summary,[tabindex]';

/** Keep keyboard and assistive-technology focus inside an open modal. */
export function useDialogFocus(open:boolean,onClose:()=>void){
 const dialogRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  if(!open)return;
  let release:(()=>void)|undefined;
  let frame=0;
  const introVisible=()=>{const intro=document.querySelector('.intro-overlay');return !!intro&&getComputedStyle(intro).display!=='none'};
  function activate(){
   if(release||introVisible())return;
   const dialog=dialogRef.current;
   if(!dialog?.isConnected)return;
   const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
   const previousOverflow=document.body.style.overflow;
   const background:Array<[HTMLElement,boolean]>=[];
   // Leave every ancestor of the dialog available while disabling its siblings.
   let branch:HTMLElement=dialog;
   while(branch.parentElement){
    const parent=branch.parentElement;
    for(const sibling of Array.from(parent.children)){
     if(sibling!==branch&&sibling instanceof HTMLElement){background.push([sibling,sibling.inert]);sibling.inert=true;}
    }
    if(parent===document.body)break;
    branch=parent;
   }
   document.body.style.overflow='hidden';
   function controls(){return Array.from(dialog!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element=>element.tabIndex>=0&&!element.matches(':disabled')&&!element.closest('[inert]')&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden');}
   function focusFirst(){(controls()[0]||dialog!).focus({preventScroll:true});}
   function keydown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return;}
    if(event.key!=='Tab')return;
    const items=controls();
    if(!items.length){event.preventDefault();dialog!.focus({preventScroll:true});return;}
    const first=items[0],last=items[items.length-1],active=document.activeElement;
    if(!dialog!.contains(active)||active===dialog||event.shiftKey&&active===first){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
    else if(!event.shiftKey&&active===last){event.preventDefault();first.focus({preventScroll:true});}
   }
   function focusin(event:FocusEvent){if(event.target instanceof Node&&!dialog!.contains(event.target))focusFirst();}
   document.addEventListener('keydown',keydown);
   document.addEventListener('focusin',focusin);
   focusFirst();
   release=()=>{
    document.removeEventListener('keydown',keydown);
    document.removeEventListener('focusin',focusin);
    document.body.style.overflow=previousOverflow;
    for(const [element,inert] of background)element.inert=inert;
    if(previousFocus?.isConnected&&!previousFocus.closest('[inert]'))previousFocus.focus({preventScroll:true});
   };
  }
  // A demo opened by ?demo=1 waits for the opening intro to release the page.
  const afterIntro=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(activate);};
  window.addEventListener('nirmaan:intro-finished',afterIntro);
  activate();
  return()=>{window.removeEventListener('nirmaan:intro-finished',afterIntro);cancelAnimationFrame(frame);release?.();};
 },[open]);
 return dialogRef;
}
