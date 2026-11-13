'use client';
/** Decode API replies without exposing server error pages as JavaScript errors. */
export async function jsonRequest(path:string,init?:RequestInit):Promise<any>{
  const response=await fetch(path,init);
  const fallback=response.status===413
    ? 'This file is too large. Choose a smaller file and try again.'
    : response.status>=500
      ? 'Our service is temporarily unavailable. Please try again.'
      : 'Could not complete your request. Please try again.';
  let data:any;
  try{data=await response.json()}catch{throw new Error(fallback)}
  if(!data||typeof data!=='object')throw new Error(fallback);
  if(!response.ok)throw new Error(typeof data.message==='string'?data.message:typeof data.error==='string'?data.error:fallback);
  return data;
}
