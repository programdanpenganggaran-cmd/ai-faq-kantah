// Mesin pencarian leksikal RAG-lite untuk sumber yang DISETUJUI PUBLIKASI.
// Tidak membaca Google Drive secara langsung. Jangan masukkan dokumen internal ke repo publik.
const STOP = new Set('apa apakah bagaimana bisa boleh yang untuk dengan dalam pada dari dan atau ke di itu ini adalah harus agar jika maka oleh sebagai tentang serta kapan saja kami kita saya kamu mereka tahun nomor peraturan menurut terkait'.split(' '));
export function terms(value){
  return [...new Set(String(value||'').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(t=>t.length>1&&!STOP.has(t)))];
}
export function retrieveApprovedSources(question, records=[], limit=3){
  const q=terms(question);
  if(q.length===0||!Array.isArray(records)) return [];
  return records.filter(r=>r && r.approved_for_publication===true && typeof r.title==='string' && r.title.trim() &&
    typeof r.excerpt==='string' && r.excerpt.length>=40 &&
    typeof r.url==='string' && /^https:\/\//i.test(r.url) &&
    ['berlaku','diubah','bukan_regulasi'].includes(String(r.legal_status||'').toLowerCase()))
    .map(r=>{
      const title=new Set(terms(r.title)), body=new Set(terms(r.excerpt+' '+(r.section||'')+' '+(r.keywords||'')));
      let score=0, hit=0;
      for(const t of q){if(title.has(t)){score+=3;hit++}else if(body.has(t)){score+=1;hit++}}
      // Exact account or statute number is discriminating, require it if query contains one.
      const nums=q.filter(t=>/^\d{2,6}$/.test(t));
      const haystack=title.size?new Set([...title,...body]):body;
      if(nums.length && !nums.some(n=>haystack.has(n)))score=0;
      return {r,score,hit};
    }).filter(x=>x.score>=2 && x.hit>=2).sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,Math.min(limit,4))).map(({r,score})=>({
      id:String(r.id||'').slice(0,90),
      title:r.title.trim().slice(0,180),
      url:r.url,
      page:r.page==null?null:String(r.page).slice(0,24),
      section:String(r.section||'').slice(0,130),
      excerpt:r.excerpt.slice(0,2300),
      score
    }));
}
