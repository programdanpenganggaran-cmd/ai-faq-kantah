/**
 * FAQ PP official reference pointers.
 * These are VERIFIED PAGE LINKS, NOT live internet search or legal-status findings.
 * The legal status must be checked on the linked source when answering.
 */
export const OFFICIAL_REFERENCE_PAGES=Object.freeze([
  Object.freeze({
    id:'PMK-41-2026',title:'PMK 41 Tahun 2026 — Perubahan Kedua PMK 62 Tahun 2023',
    url:'https://jdih.kemenkeu.go.id/dok/pmk-41-tahun-2026',
    topics:['revisi','perencanaan','penganggaran','dipa','pagu','pelaksanaan','pmk 41','pmk 62'],
    verified_page_on:'2026-10-19',legal_status:'PERIKSA_DI_JDIH',
  }),
  Object.freeze({
    id:'PMK-63-2026',
    title:'PMK 63 Tahun 2026 — Perubahan tarif PNBP volatil ATR/BPN',
    url:'https://jdih.kemenkeu.go.id/dok/pmk-63-tahun-2026',
    topics:['pn bp','pnbp','tarif','volatil','atr/bpn','penerimaan negara bukan pajak','pmk 63'],
    verified_page_on:'2026-10-19',legal_status:'PERIKSA_DI_JDIH',
  }),
  Object.freeze({
    id:'PMK-98-2024',
    title:'PMK 98 Tahun 2024 — Tarif PNBP volatil ATR/BPN',
    url:'https://jdih.kemenkeu.go.id/dok/pmk-98-tahun-2024',
    topics:['pnbp volatil','pmk 98','tarif atas jenis pnbp'],
    verified_page_on:'2026-10-19',legal_status:'PERIKSA_DI_JDIH',
  }),
  Object.freeze({
    id:'PMK-54-2026',title:'PMK 54 Tahun 2026 — Standar Biaya Masukan',
    url:'https://jdih.kemenkeu.go.id/dok/pmk-54-tahun-2026',
    topics:['sbm','biaya','standar biaya','honorarium','perjalanan dinas','pemeliharaan','pmk 54'],
    verified_page_on:'2026-10-19',legal_status:'PERIKSA_DI_JDIH',
  })
]);
export function isOfficialRegulationUrl(raw){
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&!u.username&&!u.password&&
    ['jdih.kemenkeu.go.id','www.jdih.kemenkeu.go.id','peraturan.bpk.go.id'].includes(u.hostname.toLowerCase());
 }catch{return false;}
}
export function officialSourceHints(question,{limit=2}={}){
 const q=String(question||'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
 if(!q)return [];
 const scored=OFFICIAL_REFERENCE_PAGES.map(page=>{
  let score=0;for(const topic of page.topics){
   if(q.includes(topic))score+=(topic.startsWith('pmk ')?8:topic.includes(' ')?3:1);
  }
  const pmkCode=page.id.toLowerCase().replace('pmk-','').replace('-',' ');
  if(q.includes(pmkCode))score+=4;
  return {page,score};
 }).filter(r=>r.score>0&&isOfficialRegulationUrl(r.page.url)).sort((a,b)=>b.score-a.score);
 return scored.slice(0,Math.max(0,Math.min(3,limit))).map(({page})=>({
  title:page.title,url:page.url,id:page.id,
  verification:'MANUAL_REQUIRED',
  checked_page_date:page.verified_page_on,
  note:'Tautan rujukan JDIH untuk pemeriksaan manual; bukan hasil pengecekan keberlakuan langsung.'
 }));
}
