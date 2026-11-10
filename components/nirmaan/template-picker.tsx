'use client';
import {Check} from 'lucide-react';
import {DESIGNS} from '../../lib/designs';
export default function TemplatePicker({value,onChange}:{value?:string;onChange:(id:string)=>void}){return <div className="template-picker" aria-label="Choose from ten card designs">{DESIGNS.map(d=><button type="button" key={d.id} className={value===d.id?'selected':''} aria-pressed={value===d.id} onClick={()=>onChange(d.id)}><span style={{background:d.color,color:d.ink,borderColor:d.theme==='White'?'#c7d0bc':d.color}}><span className={'template-lines '+d.layout}/>{value===d.id&&<Check size={14}/>}</span><b>{d.name}</b></button>)}</div>}
