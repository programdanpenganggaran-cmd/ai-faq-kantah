/** Private, opt-in FAQ question candidate queue. NOT an approved knowledge source. */
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
const MAX_QUESTION=500;
const SENSITIVE=[
 /\b\d{16,18}\b/, // NIK/NIP-like number
 /(?:\+?62|0)8[\d\s().-]{8,15}/, // Indonesian mobile
 /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
 /\b(?:password|kata sandi|otp|pin|token|api[_ -]?key|secret)\b/i,
 /https?:\/\//i
];
export function cleanFaqQuestion(raw){
 if(typeof raw!=='string')return null;
 const q=raw.normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();
 if(q.length<15||q.length>MAX_QUESTION||SENSITIVE.some(rx=>rx.test(q)))return null;
 return q;
}
export const faqQueueStore=()=>getStore({name:'faq-pp-faq-pending',consistency:'strong'});
export async function queueFaqQuestion(question,{consent=false,enabled=false,store=null}={}){
 if(!consent||!enabled)return {accepted:false,reason:'OPT_IN_OR_FEATURE_DISABLED'};
 const clean=cleanFaqQuestion(question);
 if(!clean)return {accepted:false,reason:'QUESTION_REJECTED_BY_PRIVACY_FILTER'};
 const stable=clean.toLocaleLowerCase('id-ID');
 const hash=createHash('sha256').update(stable).digest('hex');
 const record={id:hash.slice(0,24),question:clean,state:'PENDING_REVIEW',source:'VOLUNTARY_QUESTION',created_at:new Date().toISOString(),
   note:'Candidate only. Must be reviewed against official documents before publication.'};
 const res=await (store||faqQueueStore()).setJSON('pending/'+record.id,record,{onlyIfNew:true});
 return {accepted:true,created:res.modified===true,id:record.id};
}
