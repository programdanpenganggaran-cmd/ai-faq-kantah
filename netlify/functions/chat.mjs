/** Rujukan V2 · Netlify Functions · Gemini API Free
 * Akses percakapan demo; BUKAN endpoint RAG peraturan. Tidak menyimpan pertanyaan.
 * Secrets: GEMINI_API_KEY, DEMO_ACCESS_CODE (disarankan), ALLOWED_ORIGINS.
 */
const MODEL_DEFAULT = 'gemini-2.5-flash-lite';
const json = (value,status=200,origin='') => new Response(JSON.stringify(value), {
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});
function allowed(req){const origin=req.headers.get('origin')||'';const env=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);if(process.env.URL){try{env.push(new URL(process.env.URL).origin);}catch{}}if(!origin)return {ok:true,origin:''};return {ok:env.includes(origin),origin:env.includes(origin)?origin:''};}
export default async (request) => {
  const a=allowed(request);if(!a.ok)return json({error:'Origin tidak diizinkan. Tambahkan origin GitHub Pages di ALLOWED_ORIGINS Netlify.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':a.origin||'', 'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type, x-demo-access-code','access-control-max-age':'3600','vary':'Origin'}});
  const key=process.env.GEMINI_API_KEY;const requiredCode=process.env.DEMO_ACCESS_CODE||'';const givenCode=request.headers.get('x-demo-access-code')||'';
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'Metode tidak didukung.'},405,a.origin);
  if(requiredCode && givenCode!==requiredCode)return json({error:'Kode akses uji coba salah atau belum diisi.'},401,a.origin);
  if(!key)return json({error:'GEMINI_API_KEY belum disetel di Netlify Environment variables.'},503,a.origin);
  const model=(process.env.GEMINI_MODEL||MODEL_DEFAULT).trim();
  if(!/^gemini-[a-z0-9.-]+$/.test(model))return json({error:'GEMINI_MODEL tidak valid.'},500,a.origin);
  if(request.method==='GET')return json({status:'ready',service:'Rujukan AI FAQ Kantah',model,rag:false},200,a.origin);
  const length=Number(request.headers.get('content-length')||0);if(length>12000)return json({error:'Permintaan terlalu besar.'},413,a.origin);
  let input;try{const raw=await request.text();if(raw.length>12000)return json({error:'Permintaan terlalu besar.'},413,a.origin);input=JSON.parse(raw);}catch{return json({error:'Body harus JSON yang valid.'},400,a.origin);}
  const question=typeof input.question==='string'?input.question.trim():'';
  if(!question||question.length>1500)return json({error:'Pertanyaan wajib diisi (maksimal 1.500 karakter).'},400,a.origin);
  if(/\b\d{16}\b/.test(question))return json({error:'Pertanyaan tampak memuat nomor identitas 16 digit. Hapus data pribadi terlebih dahulu.'},400,a.origin);
  const history=Array.isArray(input.history)?input.history.slice(-10):[];
  const contents=[];
  for(const item of history){if(!item || !['user','model'].includes(item.role) || typeof item.text!=='string')continue;const t=item.text.slice(0,1800).trim();if(t)contents.push({role:item.role,parts:[{text:t}]});}
  contents.push({role:'user',parts:[{text:question}]});
  const prompt=`Anda adalah Rujukan, asisten percakapan uji coba seputar perencanaan, penganggaran, dan administrasi publik Indonesia untuk Kantor Pertanahan. Jawab dalam bahasa Indonesia profesional, jelas, ringkas, namun hangat. Situs ini adalah PURWARUPA MANDIRI dan belum menghubungkan indeks peraturan yang ditinjau. Anda boleh menjelaskan konsep umum, membahas analisis bersyarat, dan membantu memahami pertanyaan. JANGAN mengaku sudah membaca dokumen Google Drive, mengecek peraturan terbaru, memverifikasi status berlakunya aturan, atau mengutip nomor pasal/PMK/SE tertentu tanpa sumber yang benar-benar diberikan. JANGAN menciptakan kutipan regulasi atau sumber. Jika pertanyaan memerlukan penetapan MAK, revisi DIPA, ketentuan SBM atau keputusan resmi, jelaskan bahwa rujukan dan ketentuan terkini perlu diverifikasi oleh petugas. Hindari detail rahasia atau data pribadi. Jangan berikan kesan chatbot ini mewakili pernyataan resmi instansi.`;
  let upstream;try{
    upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(23000),body:JSON.stringify({systemInstruction:{parts:[{text:prompt}]},contents,generationConfig:{temperature:.35,maxOutputTokens:720}})
    });
  }catch(e){return json({error:e?.name==='TimeoutError'?'Gemini belum merespons tepat waktu. Coba lagi.':'Tidak bisa menghubungi Gemini. Periksa koneksi fungsi Netlify.'},502,a.origin);}
  let d={};try{d=await upstream.json();}catch{}
  if(!upstream.ok){const message=upstream.status===429?'Kuota/rate limit Gemini Free sedang habis. Coba lagi nanti.':upstream.status===404?'Model Gemini tidak tersedia. Periksa GEMINI_MODEL pada Netlify.':`Permintaan Gemini gagal (HTTP ${upstream.status}).`;return json({error:message},upstream.status===429?429:502,a.origin);}
  const reply=(d.candidates||[]).flatMap(c=>(c.content?.parts||[]).filter(x=>typeof x.text==='string').map(x=>x.text)).join('\n').trim();
  if(!reply)return json({error:'Gemini tidak menghasilkan respons teks yang dapat ditampilkan.'},502,a.origin);
  return json({status:'ok',reply:reply.slice(0,4800),grounded:false,sources:[],model,warning:'Jawaban belum berdasarkan indeks peraturan ATR/BPN yang diverifikasi.'},200,a.origin);
};
export const config = {path:'/.netlify/functions/chat'};
