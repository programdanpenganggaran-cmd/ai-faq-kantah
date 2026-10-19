/** Private admin-only index synchronizer. Never expose RAG_ADMIN_KEY in GitHub. */
import { timingSafeEqual,createHash } from 'node:crypto';
import { privateStore } from '../knowledge/private-search.mjs';
const reply=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
function authorized(value,secret){
 if(!secret||!value)return false;
 const a=createHash('sha256').update(value).digest(),b=createHash('sha256').update(secret).digest();
 return timingSafeEqual(a,b);
}
const runPattern=/^v\d{8}t\d{6}$/;
export default async(request,context)=>{
 if(request.method!=='POST')return reply({error:'Not found'},404);
 const secret=process.env.RAG_ADMIN_KEY||'';
 if(!authorized(request.headers.get('x-rag-admin-key')||'',secret))return reply({error:'Unauthorized'},401);
 // Fail closed. Site-wide store is shared across deploy contexts.
 if(context?.deploy?.context!=='production')return reply({error:'Only production ingestion allowed'},403);
 if(Number(request.headers.get('content-length')||0)>1900000)return reply({error:'Payload >1.9MB'},413);
 let data;try{const body=await request.text();if(body.length>1900000)return reply({error:'Payload terlalu besar'},413);data=JSON.parse(body);}catch{return reply({error:'Invalid JSON'},400)}
 const run=String(data.run||'');if(!runPattern.test(run))return reply({error:'Invalid run identifier'},400);
 try{
  const store=privateStore();
  if(data.action==='put'){
    const key=String(data.key||'');
    if(!/^(?:idx\/[0-9a-f]{2}|chunks\/[0-9]{1,6}|meta)$/.test(key))return reply({error:'Invalid key'},400);
    if(typeof data.payload!=='object'||data.payload===null)return reply({error:'Invalid payload'},400);
    await store.setJSON(`${run}/${key}`,data.payload);
    return reply({status:'stored',run,key});
  }
  if(data.action==='activate'){
    const meta=await store.get(`${run}/meta`,{type:'json'});
    if(!meta||meta.run!==run||!Number.isInteger(meta.chunks)||meta.chunks<1||!Number.isInteger(meta.docs)||meta.docs<1)return reply({error:'Metadata missing/invalid'},409);
    if(meta.docs!==34||meta.chunks!==9140||meta.shards!==64||meta.blocks!==Math.ceil(meta.chunks/50))
      return reply({error:'Unexpected metadata: expected 34 documents and 9140 chunks'},409);
    const expected=[...Array(meta.blocks)].map((_,i)=>`${run}/chunks/${i}`);
    for(let i=0;i<64;i++)expected.push(`${run}/idx/${i.toString(16).padStart(2,'0')}`);
    const missing=[];
    for(let i=0;i<expected.length;i+=20){
      const keys=expected.slice(i,i+20),found=await Promise.all(keys.map(k=>store.getMetadata(k)));
      for(let j=0;j<keys.length;j++)if(!found[j])missing.push(keys[j]);
      if(missing.length>8)break;
    }
    if(missing.length)return reply({error:'Index incomplete; activation refused',missing:missing.slice(0,9)},409);
    const active={run,docs:meta.docs,chunks:meta.chunks,created_at:meta.created_at||'',mode:'lexical-private',legal_status_review_required:true};
    await store.setJSON('active',active);
    return reply({status:'activated',active});
  }
  if(data.action==='status'){
    const active=await store.get('active',{type:'json'});return reply({status:'ok',active:active||null});
  }
  return reply({error:'Unknown action'},400);
 }catch(e){console.error('RAG Admin operation failed',String(e?.message||e));return reply({error:'RAG storage failure'},503)}
};
