/**
 * JDIH public metadata monitor. No Google Drive access, Gemini calls, or Netlify usage.
 * It detects changed official regulation pages; it MUST NOT silently change legal status
 * or publish new PDF text to the AI knowledge base.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const watchPath=new URL('../data/official-jdih-watchlist.json',import.meta.url);
const statePath=new URL('../data/official-jdih-observations.json',import.meta.url);
const permitted=new Set(['jdih.kemenkeu.go.id','www.jdih.kemenkeu.go.id']);
const whitespace=v=>String(v||'').replace(/\s+/g,' ').trim();
const htmlToText=html=>whitespace(String(html||'')
 .replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi,' ')
 .replace(/<[^>]+>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'"));
const codePattern=/\bPMK\s+(\d{1,3})\s+TAHUN\s+(20\d{2})\b/gi;
function normalizedCode(m){return 'PMK-'+String(Number(m[1]))+'-'+m[2]}
export function parseJdihPage(html,entry){
 const u=new URL(entry.url);
 if(u.protocol!=='https:'||!permitted.has(u.hostname)||u.username||u.password)throw Error('Disallowed official source URL');
 if(!/^PMK-\d{1,3}-20\d{2}$/.test(entry.id))throw Error('Invalid regulation ID');
 const text=htmlToText(html);
 if(text.length<250)throw Error('Official page unexpectedly short');
 const expected=entry.id.match(/^PMK-(\d+)-(\d{4})$/);
 const own=new RegExp('\\bPMK\\s+'+Number(expected[1])+'\\s+TAHUN\\s+'+expected[2]+'\\b','i');
 if(!own.test(text))throw Error('Regulation identity not found in official page');
 const title=whitespace((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)||[])[1]).replace(/&amp;/gi,'&').slice(0,300);
 const effective=(/Tanggal Berlaku\s+(.{0,90}?)(?:Tempat Terbit|Sumber|Bahasa|Lokasi)/i.exec(text)||[])[1]||'';
 const history=(/Riwayat Dokumen\s*\((\d{1,3})\)\s*(.{0,12000}?)(?:Kutip Dokumen Ini|Produk Hukum Terkait|Daftar Files|$)/i.exec(text)||[]);
 const historyCount=history.length?Number(history[1]):null;
 const historyText=history[2]||'';
 const relations=[...new Set([...historyText.matchAll(codePattern)].map(normalizedCode))].filter(x=>x!==entry.id).sort();
 const digest=createHash('sha256').update(JSON.stringify({id:entry.id,effective:whitespace(effective),historyCount,relations})).digest('hex').slice(0,24);
 return {id:entry.id,title:title||entry.id,url:entry.url,topic:entry.topic||'',
   effective_text:whitespace(effective).slice(0,100),
   history_count:historyCount,history_related_ids:relations,metadata_signature:digest,
   legal_status:'NOT_AUTOMATICALLY_VERIFIED'};
}
export function buildObservations(previous,latest,watch,now=new Date().toISOString()){
 const existing=Object.fromEntries((previous?.observations||[]).map(x=>[x.id,x]));
 const ids=new Set(watch.map(x=>x.id));
 const changes=[],candidates=new Set(),out=[];
 for(const item of latest){
   const old=existing[item.id];
   const same=old?.metadata_signature===item.metadata_signature;
   if(!same)changes.push({id:item.id,old_signature:old?.metadata_signature||null,new_signature:item.metadata_signature});
   for(const relation of item.history_related_ids||[])if(!ids.has(relation))candidates.add(relation);
   out.push({...item,first_observed:old?.first_observed||now,changed_at:same?(old?.changed_at||now):now});
 }
 const next={schema:1,source:'JDIH Kemenkeu (public metadata; not a legal-status determination)',
   observations:out.sort((a,b)=>a.id.localeCompare(b.id)),related_untracked:[...candidates].sort()};
 const differs=JSON.stringify(previous?.observations||[])!==JSON.stringify(next.observations)||
   JSON.stringify(previous?.related_untracked||[])!==JSON.stringify(next.related_untracked);
 return {next,changes,candidates:next.related_untracked,updated:differs};
}
async function safeFetch(url,fetchFn=fetch){
 let current=new URL(url);
 for(let redirect=0;redirect<=2;redirect++){
   if(current.protocol!=='https:'||!permitted.has(current.hostname)||current.username||current.password)throw Error('Disallowed redirect target');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
   let response;
   try{response=await fetchFn(current.toString(),{redirect:'manual',headers:{'user-agent':'FAQPP-OfficialMetadataMonitor/1.0','accept':'text/html'},signal:controller.signal});}
   finally{clearTimeout(timer)}
   if([301,302,303,307,308].includes(response.status)){
     const location=response.headers.get('location');if(!location)throw Error('Redirect without location');
     current=new URL(location,current);continue;
   }
   if(!response.ok)throw Error('Official page HTTP '+response.status);
   const mime=response.headers.get('content-type')||'';
   if(!mime.toLowerCase().includes('text/html'))throw Error('Unexpected non-HTML response');
   const size=Number(response.headers.get('content-length')||0);
   if(size>1750000)throw Error('HTML response too large');
   const html=await response.text();if(html.length>1750000)throw Error('HTML exceeds size cap');
   return html;
 }
 throw Error('Too many redirects');
}
export async function runMonitor({fetchFn=fetch,read=readFile,write=writeFile,date=new Date()}={}){
 const watchData=JSON.parse(await read(watchPath,'utf8'));
 const watch=watchData.watch||[];if(watch.length<1||watch.length>30)throw Error('Invalid watchlist');
 let previous={};try{previous=JSON.parse(await read(statePath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const latest=[];
 for(const item of watch){
   const html=await safeFetch(item.url,fetchFn);
   latest.push(parseJdihPage(html,item));
 }
 const built=buildObservations(previous,latest,watch,date.toISOString());
 if(built.updated){await mkdir(dirname(fileURLToPath(statePath)),{recursive:true});await write(statePath,JSON.stringify(built.next,null,2)+'\n','utf8')}
 return {checked:latest.length,changed:built.changes,related_untracked:built.candidates,updated:built.updated};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 runMonitor().then(r=>{console.log(JSON.stringify(r,null,2))}).catch(e=>{console.error('JDIH monitor failed safely:',e.message);process.exitCode=1});
}
