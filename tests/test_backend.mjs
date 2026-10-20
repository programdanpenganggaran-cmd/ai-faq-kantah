import assert from 'node:assert/strict';
import backend from '../netlify/functions/chat.mjs';
import { shard } from '../netlify/knowledge/private-search.mjs';
process.env.GEMINI_API_KEY='TEST_KEY_NOT_REAL';
process.env.DEMO_ACCESS_CODE='ONLY-FOR-TEST-12345';
process.env.ALLOWED_ORIGINS='https://programdanpenganggaran-cmd.github.io';
process.env.GEMINI_MODEL='gemini-2.5-flash-lite';
const url='https://rujukan.example.netlify.app/.netlify/functions/chat';
const base={'origin':'https://programdanpenganggaran-cmd.github.io','x-demo-access-code':process.env.DEMO_ACCESS_CODE};
const get = async(method='GET',data={},h=base,context)=>await backend(new Request(url,{method,headers:{...h,...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(data)}:{})}),context);
let x=await get();assert.equal(x.status,200);assert.equal((await x.json()).status,'ready');
x=await get('GET',{}, {'origin':'https://evil.example','x-demo-access-code':process.env.DEMO_ACCESS_CODE});assert.equal(x.status,403);
const previewHost='https://deploy-preview-2--ai-faq-kantah-api.netlify.app';
x=await backend(new Request(previewHost+'/.netlify/functions/chat',{method:'GET',headers:{origin:previewHost,'x-demo-access-code':process.env.DEMO_ACCESS_CODE}}));assert.equal(x.status,200,'Same-origin preview requests should work with preview key');
x=await backend(new Request(previewHost+'/.netlify/functions/chat',{method:'GET',headers:{origin:previewHost}}),{deploy:{context:'deploy-preview'}});
assert.equal(x.status,200,'Netlify SSO-protected Deploy Preview should not need a second conversation code');
x=await backend(new Request(previewHost+'/.netlify/functions/chat',{method:'GET'}),{deploy:{context:'deploy-preview'}});
assert.equal(x.status,200,'The initial same-site preview GET should work without Origin header');
x=await backend(new Request(previewHost+'/.netlify/functions/chat',{method:'GET'}),{deploy:{context:'production'}});
assert.equal(x.status,401,'Production never bypasses conversation code, even if URL resembles preview');
x=await backend(new Request(previewHost+'/.netlify/functions/chat',{method:'GET',headers:{origin:'https://evil.example'}}),{deploy:{context:'deploy-preview'}});
assert.equal(x.status,403,'Untrusted website still denied even when Deploy Preview uses SSO');
x=await get('GET',{}, {'origin':previewHost,'x-demo-access-code':process.env.DEMO_ACCESS_CODE});assert.equal(x.status,403,'Cross-origin preview -> production must remain blocked');
x=await get('GET',{}, {'origin':base.origin});assert.equal(x.status,401);
x=await get('POST',{question:'a'.repeat(1600)});assert.equal(x.status,400);
x=await get('POST',{question:'NIK 1234567890123456'});assert.equal(x.status,400);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{assert.equal(opts.headers['x-goog-api-key'],process.env.GEMINI_API_KEY);const b=JSON.parse(opts.body);assert.equal(b.contents.at(-1).parts[0].text,'Apa itu RKA?');return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'RKA adalah dokumen rencana kerja dan anggaran. Periksa regulasi terkini.'}]}}]}),{status:200,headers:{'content-type':'application/json'}})};
x=await get('POST',{question:'Apa itu RKA?',history:[{role:'user',text:'Halo'}]});assert.equal(x.status,200);const j=await x.json();assert.equal(j.grounded,false);assert.deepEqual(j.sources,[]);assert.ok(j.reply.includes('RKA'));
globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'quota'}}),{status:429,headers:{'content-type':'application/json'}});
x=await get('POST',{question:'Halo'});assert.equal(x.status,429);
// If Gemini times out but an approved RAG source exists, show a clearly labelled citation-only response.
const mockStore=globalThis.__mockBlobs.store;
const run='v20261020t054107';
mockStore.map.set('active',{run,docs:34,chunks:9140});
const source={
  id:0,document_id:'DOC-000001',title:'Peraturan uji revisi anggaran',url:'https://jdih.kemenkeu.go.id/',
  page:12,status_regulasi:'PERLU_VERIFIKASI',approved_for_ai:'YA',indexing_status:'READY',
  text:'Ketentuan ini membahas mekanisme revisi anggaran dan perpindahan 51 ke 52 dalam perencanaan satker. Periksa status resmi regulasi.'
};
mockStore.map.set(run+'/chunks/0',[source]);
for(const term of ['revisi','51','52']){
  const key=run+'/idx/'+shard(term);
  mockStore.map.set(key,{...(mockStore.map.get(key)||{}),[term]:[[0,2]]});
}
globalThis.fetch=async()=>{const e=new Error('simulated timeout');e.name='TimeoutError';throw e;};
x=await get('POST',{question:'Apakah revisi belanja 51 ke 52 diperbolehkan?'});
assert.equal(x.status,200);
const partial=await x.json();
assert.equal(partial.status,'partial');
assert.equal(partial.mode,'sources-only');
assert.ok(partial.reply.includes('bukan kesimpulan hukum'));
assert.equal(partial.sources.length,1);
assert.equal(partial.sources[0].page,12);
mockStore.map.clear();
globalThis.fetch=originalFetch;
console.log('PASS: GET, origin, kode, validasi panjang/NIK, Gemini mock, status tanpa RAG, kuota.');
