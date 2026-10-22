const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://lokibot-api.onrender.com';
const GROQ_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || '';
async function request(path: string, body: any) {
 // Standalone APK chat uses the GitHub Actions secret injected at build time; no AppDeploy dependency.
 // A key embedded in a client APK can be extracted. A private server proxy is the secure long-term option.
 if (path === '/api/chat' && GROQ_KEY) {
   const { messages = [], personality, mode, image, responseLength = 'short', thinkingLevel = 'medium', replyLanguage = 'auto', modelChoice = 'lokizenith-3.2' } = body || {};
   const system = [
     'You are LokiBot, a helpful, accurate, friendly AI assistant. Prefer concise, natural answers.',
     typeof personality === 'string' ? 'Personality: ' + personality.slice(0, 500) : '',
     mode === 'learn' ? 'Teach step by step and check understanding.' : '',
     'Answer length: ' + (['short','medium','long'].includes(responseLength) ? responseLength : 'short') + '.',
     'Reasoning depth preference: ' + (['low','medium','high','extra-high'].includes(thinkingLevel) ? thinkingLevel : 'medium') + '.',
     'Reply language: ' + (['Hebrew','English','French','Spanish','Arabic'].includes(replyLanguage) ? 'always answer only in ' + replyLanguage : 'match the user language') + '.',
     'If asked for quizzes or flashcards, provide clearly numbered questions/cards and answers.'
   ].filter(Boolean).join('\n');
   const contentMessages: any[] = [{role:'system',content:system}, ...messages.slice(-18).filter((m:any)=>['user','assistant'].includes(m?.role) && typeof m?.content === 'string')];
   if (image?.data && contentMessages.length) {
     const last = contentMessages[contentMessages.length-1];
     if (last.role === 'user') last.content = [{type:'text',text:last.content},{type:'image_url',image_url:{url:`data:${image.mimeType || 'image/jpeg'};base64,${image.data}`}}];
   }
   const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
     method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_KEY},
     body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:contentMessages,temperature:0.6,max_tokens:responseLength === 'long' ? 3000 : responseLength === 'medium' ? 1800 : 650}),
   });
   const data = await response.json().catch(()=>({}));
   if (!response.ok) throw new Error(data?.error?.message || 'Groq request failed ('+response.status+').');
   const text = data?.choices?.[0]?.message?.content;
   if (typeof text !== 'string' || !text.trim()) throw new Error('Groq returned an empty answer.');
   return {data:{text:text.trim(),model:data?.model || 'llama-3.3-70b-versatile'}};
 }
 const response = await fetch(API_BASE.replace(/\/$/, '') + path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data = await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data?.error || 'Request failed ('+response.status+')');
 return {data};
}
export const api={post:request};
export const image={async resizeIfNeeded(file:File):Promise<{data:string;mimeType:string}>{
 const read=(f:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Could not read image'));r.readAsDataURL(f)});
 let url=await read(file);
 if(file.size>3500000){const img=new Image();img.src=url;await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('Could not decode image'))});const scale=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');if(!ctx)throw new Error('Image processing unavailable');ctx.drawImage(img,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',.82)}
 const comma=url.indexOf(',');return {data:url.slice(comma+1),mimeType:url.slice(5,url.indexOf(';'))||'image/jpeg'};
}};