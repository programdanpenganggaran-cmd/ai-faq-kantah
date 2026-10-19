/** FAQ PP private lexical RAG retrieval via Netlify Blobs. */
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
const STOP=new Set(('apa apakah bagaimana bisa boleh yang untuk dengan dalam pada dari dan atau ke di itu ini adalah harus agar jika maka oleh sebagai tentang serta kapan saja kami kita saya kamu mereka tahun nomor peraturan menurut terkait tidak ada yang masih kepada antara setelah sebagai dalam sedang apa boleh akun belanja anggaran negara pemerintah kementerian pelaksanaan').split(' '));
export const queryTerms=(value)=>[...new Set(String(value||'').toLowerCase().normalize('NFKC').match(/[a-z0-9]+/g)||[])].filter(t=>t.length>=2&&!STOP.has(t)).slice(0,20);
export const shard=(token)=>(parseInt(createHash('sha1').update(token).digest('hex').slice(0,2),16)%64).toString(16).padStart(2,'0');
export const privateStore=()=>getStore({name:'faq-pp-rag-private',consistency:'strong'});
export async function getActiveRag(store=privateStore()){
 const active=await store.get('active',{type:'json'});
 if(!active||!/^v\d{8}t\d{6}$/.test(active.run)||!Number.isInteger(active.chunks))return null;
 return active;
}
export async function findRegulations(question,{store=privateStore(),limit=5}={}){
 const active=await getActiveRag(store);
 if(!active)return {active:null,results:[]};
 const words=queryTerms(question);
 if(!words.length)return {active,results:[]};
 const requested=new Map();for(const t of words){const key=shard(t);if(!requested.has(key))requested.set(key,[]);requested.get(key).push(t)}
 const entries=await Promise.all([...requested.entries()].map(async ([key,terms])=>({terms,bucket:await store.get(`${active.run}/idx/${key}`,{type:'json'})||{}})));
 const scores=new Map(),hits=new Map(),numerics=words.filter(w=>/^\d{2,6}$/.test(w));
 for(const {terms,bucket} of entries)for(const t of terms){
   const postings=bucket[t];if(!Array.isArray(postings))continue;
   const idf=Math.log(1+(Math.max(1,active.chunks)-postings.length+.5)/(postings.length+.5));
   for(const post of postings){if(!Array.isArray(post)||post.length<2)continue;
     const id=post[0],tf=post[1];if(!Number.isInteger(id)||id<0||id>=active.chunks)continue;
     scores.set(id,(scores.get(id)||0)+Math.max(.05,idf)*(1+Math.log1p(Math.min(8,tf)))*(/^\d{2,6}$/.test(t)?1.7:1));
     if(!hits.has(id))hits.set(id,new Set());hits.get(id).add(t);
   }
 }
 const ranked=[...scores].filter(([id])=>{
   const got=hits.get(id)||new Set();
   return (words.length<=2||numerics.length>0||got.size>=2)&&numerics.every(n=>got.has(n));
 }).map(([id,score])=>({id,score,hits:hits.get(id).size})).sort((a,b)=>(b.score+(b.hits*.9))-(a.score+(a.hits*.9))).slice(0,Math.min(45,Math.max(16,limit*7)));
 if(!ranked.length)return {active,results:[]};
 const groups=new Map();for(const r of ranked){const grp=Math.floor(r.id/50);if(!groups.has(grp))groups.set(grp,[]);groups.get(grp).push(r)}
 const loaded=await Promise.all([...groups.keys()].map(async grp=>({grp,items:await store.get(`${active.run}/chunks/${grp}`,{type:'json'})||[]})));
 const found=new Map();for(const {grp,items} of loaded){for(const r of (groups.get(grp)||[])){const c=items[r.id%50];if(c&&c.id===r.id)found.set(r.id,{...c,score:r.score,hits:r.hits});}}
 // Fail closed: indexing a document is not approval to send its text to Gemini.
 const best=[...found.values()].filter(x=>
   String(x.approved_for_ai||'').toUpperCase()==='YA' &&
   String(x.indexing_status||'').toUpperCase()==='READY' &&
   typeof x.text==='string'&&x.text.length>45
 ).sort((a,b)=>b.score-a.score);
 const selected=[],perPage=new Set(),perDoc=new Map();for(const item of best){
    const pageKey=`${item.document_id}|${item.page}`;
    if(perPage.has(pageKey)||(perDoc.get(item.document_id)||0)>=2)continue;
    selected.push({id:String(item.id),title:item.title,document_id:item.document_id,url:item.url,page:item.page,section:item.section||'',status_regulasi:item.status_regulasi||'PERLU_VERIFIKASI',excerpt:item.text.slice(0,1850),score:item.score});
    perPage.add(pageKey);perDoc.set(item.document_id,(perDoc.get(item.document_id)||0)+1);
    if(selected.length>=limit)break;
 }
 return {active,results:selected};
}
