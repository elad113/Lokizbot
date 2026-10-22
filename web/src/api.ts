const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://lokibot-api.onrender.com';
async function request(path: string, body: unknown) {
 if (!API_BASE) throw new Error('The independent AI server is not configured yet. The local interface is ready, but a secure backend URL is required.');
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
