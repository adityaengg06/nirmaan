'use client';
import {useEffect,useState} from 'react';
import {jsonRequest} from './shared';
import {StudentPreview} from './experience-preview';
export default function StudentPortal({id}:{id:string}){const[record,setRecord]=useState<any>(null);const[error,setError]=useState('');useEffect(()=>{jsonRequest('/api/student-records?id='+encodeURIComponent(id)).then(d=>setRecord(d.record)).catch(e=>setError(e.message))},[id]);return <section className="section secure-student-page"><div className="eyebrow">NIRMAAN · SECURE STUDENT CONNECTION</div>{error?<div className="notice" role="alert">{error}</div>:record?<><StudentPreview demo={false} record={record}/><p className="muted">Last updated: {new Date(record.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Contact your institution if a record needs correction.</p></>:<p className="loading-message">Checking your access and loading your record…</p>}<a className="text-link" href="/">NIRMAAN home</a></section>}
