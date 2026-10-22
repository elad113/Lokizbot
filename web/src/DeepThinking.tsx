import { useEffect, useState } from 'react';
import { Brain, Check, Globe, X } from 'lucide-react';
type Source = { title: string; url: string; snippet?: string };
type Result = { summary: string; sources: Source[] };
export default function DeepThinking() {
 const [open,setOpen]=useState(false);
 const [topic,setTopic]=useState('');
 const [busy,setBusy]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{if(!busy)return;const started=Date.now();const timer=window.setInterval(()=>setElapsed(Math.min(120,Math.floor((Date.now()-started)/1000))),500);return()=>window.clearInterval(timer)},[busy]);
 async function research(){
  if(!topic.trim()||busy)return;
  setBusy(true);setElapsed(0);setResult(null);
  try{
   const base=(import.meta as any).env?.VITE_API_BASE_URL||'https://lokizbot.onrender.com';
   const response=await fetch(base.replace(/\/$/,'')+'/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:topic.trim(),maxSeconds:120}),signal:AbortSignal.timeout(125000)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data?.error||'Research failed (HTTP '+response.status+')');
   setResult({summary:String(data.summary||'No summary returned.'),sources:Array.isArray(data.sources)?data.sources:[]});
  }catch(e){setResult({summary:'Research failed: '+(e instanceof Error?e.message:'Connection error'),sources:[]})}
  finally{setBusy(false)}
 }
 return <>
 <button onClick={()=>setOpen(true)}><Brain size={16}/> Deep thinking <span className="deep-thinking-tag">120s</span></button>
 {open&&<div className="research-scrim" onClick={()=>{if(!busy)setOpen(false)}}><section className="research-modal" onClick={e=>e.stopPropagation()}>
 <div className="research-head"><div className="research-icon"><Brain size={22}/></div><div><h2>Deep thinking</h2><p>Search the web, compare sources and build a cited answer.</p></div><button className="icon-btn" disabled={busy} onClick={()=>setOpen(false)}><X size={19}/></button></div>
 { !result&&<><label className="research-label" htmlFor="deep-topic">What should I investigate?</label><textarea id="deep-topic" className="research-topic" rows={3} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Ask a question or enter a topic…" disabled={busy}/>
 {busy?<div className="research-progress"><div className="research-orbit"><Globe size={28}/></div><b>Researching across the web…</b><div className="research-progress-track"><span style={{width:Math.min(100,elapsed/120*100)+'%'}}/></div><small>{elapsed}s elapsed · up to {Math.max(0,120-elapsed)}s remaining</small><p>Collecting sources, comparing evidence and preparing a summary.</p></div>:<button className="research-start" disabled={!topic.trim()} onClick={()=>void research()}><Brain size={17}/> Start deep research <span>Up to 2 minutes</span></button>}</>}
 {result&&<div className="research-results"><div className="research-result-label"><Check size={15}/> Research complete</div><div className="research-summary">{result.summary}</div><h3>Sources found ({result.sources.length})</h3>{result.sources.map((s,i)=><a className="research-source" key={s.url+i} href={s.url} target="_blank" rel="noreferrer"><span>{i+1}</span><div><b>{s.title||s.url}</b><small>{s.snippet||s.url}</small><em>{s.url}</em></div><Globe size={15}/></a>)}<button className="research-start" onClick={()=>setResult(null)}>Research another topic</button></div>}
 </section></div>}
 </>;
}
