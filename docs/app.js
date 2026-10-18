(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.RUJUKAN_CONFIG || {};
  const localStore = (() => { try { return window.localStorage; } catch { return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; } })();
  const sessionStore = (() => { try { return window.sessionStorage; } catch { return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; } })();
  const KEYS = { chats: 'rujukan-v2-chats', id: 'rujukan-v2-current', endpoint:'rujukan-v2-api-url', code:'rujukan-v2-code' };
  const $chat = $('chatScroll');
  const categories = {
    planning:['Bagaimana proses penyusunan RKA-K/L?', 'Apa perbedaan pagu indikatif, pagu anggaran, dan alokasi anggaran?'],
    cost:['Apa perbedaan akun belanja 52 dan 53?', 'Bagaimana memahami ketentuan SBM dan SBK?'],
    revision:['Apa yang perlu diperiksa dalam revisi anggaran?', 'Apa perbedaan revisi DIPA dan revisi POK?'],
    execution:['Apa indikator monitoring pelaksanaan anggaran?', 'Bagaimana menyusun laporan realisasi anggaran satker?']
  };
  const QA_TESTS = [
    "Apakah sisa anggaran belanja 51 dapat digeser ke belanja 52?",
    "Apakah revisi antar-PN diperbolehkan?",
    "Apakah revisi anggaran 51 cukup menjadi kewenangan KPA?",
    "Bolehkah menggeser anggaran operasional ke nonoperasional atau sebaliknya?",
    "Bagaimana mekanisme pengurangan target PN?",
    "Apakah dana PHLN dapat digunakan untuk belanja modal?",
    "Apa saja persyaratan pengusulan belanja modal?",
    "Setelah revisi naik unit, kapan SPRA bisa diterbitkan?",
    "Bagaimana jika batas waktu revisi RPD tiba ketika revisi DJA belum selesai?",
    "Bagaimana penyesuaian volume non-PN jika komponen awalnya kurang?",
    "Bagaimana penyelesaian pagu minus pada satker?",
    "Bagaimana jika sisa anggaran PNBP tidak memiliki kegiatan penampung?",
    "Bagaimana mengoptimalkan pagu layanan yang bersumber dari PNBP?",
    "Apakah blokir direktif Presiden dapat ditarik ke Bagian Anggaran Bendahara Umum Negara?",
    "Bagaimana penanganan sisa belanja 51 yang tidak dapat dialihkan?",
    "Apakah blokir pada anggaran direktif dapat digeser?",
    "Belanja operasional mencakup komponen apa saja?",
    "Apakah akun 52811 tepat untuk persediaan tinta pada belanja operasional?"
  ];
  const now = () => new Date().toISOString();
  const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
  const safeParse = (raw, fallback) => { try { return JSON.parse(raw) ?? fallback; } catch { return fallback; } };
  const state = {
    chats: safeParse(localStore.getItem(KEYS.chats), []).filter(c => c && Array.isArray(c.messages)).slice(0,25),
    currentId: localStore.getItem(KEYS.id) || '',
    api: sessionStore.getItem(KEYS.endpoint) || config.API_URL || '',
    code: sessionStore.getItem(KEYS.code) || '',
    connected: false,
    pending: false
  };
  const safeHttpUrl = raw => { try { const u = new URL(raw); return (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname))) && !!u.hostname && !u.username && !u.password && u.pathname.endsWith('/.netlify/functions/chat'); } catch { return false; } };
  const current = () => state.chats.find(c => c.id === state.currentId);
  function persist() {
    state.chats = state.chats.slice(0,25);
    try { localStore.setItem(KEYS.chats, JSON.stringify(state.chats)); localStore.setItem(KEYS.id, state.currentId); }
    catch { $('historyList').title = 'Penyimpanan browser penuh / tidak diizinkan'; }
  }
  function newChat(initial=false){ const c={id:uid(),title:'Percakapan baru',created:now(),updated:now(),messages:[]};state.chats.unshift(c);state.currentId=c.id;persist();render(); if(!initial) $('questionInput').focus(); }
  function closeMenu(){ $('sidebar').classList.remove('open');$('scrim').hidden=true;$('menuButton').setAttribute('aria-expanded','false'); }
  function renderHistory(){const root=$('historyList');root.replaceChildren();const visible=state.chats.filter(c=>c.messages.length).slice(0,16); if(!visible.length){const p=document.createElement('div');p.className='history-empty';p.textContent='Belum ada percakapan tersimpan.';root.append(p);return;}
    visible.forEach(c => {let b=document.createElement('button');b.type='button';b.className='history-item'+(c.id===state.currentId?' active':'');b.textContent='◷  '+c.title;b.title=c.title;b.addEventListener('click',()=>{state.currentId=c.id;persist();render();closeMenu();});root.append(b);});}
  function renderRichText(node, content){
    node.replaceChildren();
    const raw=String(content||'').slice(0,8000), lines=raw.split(/\r?\n/);
    lines.forEach((original,i)=>{
      if(i>0)node.append(document.createElement('br'));
      let line=original.replace(/^\s*#{1,4}\s+/,'').replace(/^\s*(?:[-*]|\d+[.)])\s+/,'• ');
      const regex=/(\*\*[^*]{1,320}\*\*|`[^`]{1,180}`|\[[^\]]{1,180}\]\(https:\/\/[^\s)]+\))/g;
      let last=0,match;
      while((match=regex.exec(line))!==null){
        if(match.index>last)node.append(document.createTextNode(line.slice(last,match.index)));
        const token=match[0];
        if(token.startsWith('**')){
          const strong=document.createElement('strong');strong.textContent=token.slice(2,-2);node.append(strong);
        }else if(token.startsWith('`')){
          const code=document.createElement('code');code.textContent=token.slice(1,-1);node.append(code);
        }else{
          const m=/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(token);
          if(m){const link=document.createElement('a');link.textContent=m[1];link.href=m[2];link.target='_blank';link.rel='noopener noreferrer';node.append(link);}
          else node.append(document.createTextNode(token));
        }
        last=regex.lastIndex;
      }
      if(last<line.length)node.append(document.createTextNode(line.slice(last)));
    });
  }
  function addMessage(role,content,kind='',sources=[]){const wrap=document.createElement('div');wrap.className=`message ${role}`;
    if(role==='assistant'){const avatar=document.createElement('div');avatar.className='bot-avatar';avatar.innerHTML='R<span>.</span>';wrap.append(avatar);}
    const bubble=document.createElement('div');bubble.className='bubble';
    if(role==='assistant'){const label=document.createElement('div');label.className='bubble-label';label.textContent='RUJUKAN  /  '+(kind==='demo'?'MODE DEMO':kind==='error'?'PEMBERITAHUAN':'AI GEMINI');bubble.append(label);}
    const p=document.createElement('p');renderRichText(p,content);bubble.append(p);
    if(role==='assistant' && kind!=='error'){
      const foot=document.createElement('div');foot.className='message-info'+(Array.isArray(sources)&&sources.length?' good':'');foot.textContent=kind==='demo'?'◌ Respons simulasi offline, bukan jawaban AI.':(Array.isArray(sources)&&sources.length?'✓ Materi rujukan tersedia.':'⚠ Belum berdasarkan indeks peraturan yang diverifikasi.');bubble.append(foot);
    }
    if(role==='assistant' && Array.isArray(sources) && sources.length){
      const refs=document.createElement('div');refs.className='source-panel';
      const heading=document.createElement('div');heading.className='source-heading';heading.textContent='RUJUKAN DOKUMEN · PERIKSA NASKAH ASLI';refs.append(heading);
      for(const src of sources.slice(0,4)){
        if(!src||typeof src.url!=='string'||!src.url.startsWith('https://'))continue;
        const link=document.createElement('a');link.className='source-link';link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';
        link.textContent='↗  '+String(src.title||'Dokumen sumber').slice(0,160)+(src.page?' · hlm. '+src.page:'')+(src.section?' · '+src.section:'');
        refs.append(link);
      }
      bubble.append(refs);
    }
    wrap.append(bubble);$('messages').append(wrap);return wrap;}
  function render(){renderHistory();$('messages').replaceChildren();const c=current();const has=c?.messages.length;$('welcomeArea').classList.toggle('hidden',!!has);if(has) c.messages.forEach(m=>addMessage(m.role,m.text,m.kind,m.sources));requestAnimationFrame(()=>{ $chat.scrollTop=has?$chat.scrollHeight:0; });}
  function status(mode){$('connectionText').textContent=mode==='online'?'AI Gemini terhubung':mode==='pending'?'Menghubungkan...':'Mode demo offline';$('statusPulse').classList.toggle('online',mode==='online');$('composerMode').textContent=mode==='online'?'AI Gemini · percakapan langsung':'Mode demo lokal';$('welcomeStatus').textContent=mode==='online'?'✦  AI online siap digunakan. Rujukan hukum belum diaktifkan.':'◌  Mode demo offline aktif. Hubungkan Netlify pada Pengaturan untuk chat AI.';}
  function demoAnswer(q){const t=q.toLowerCase();if(/52|53|belanja|akun/.test(t))return 'Untuk membedakan kelompok belanja 52 dan 53, periksa sifat kegiatan, klasifikasi BAS, serta apakah hasil pekerjaan memenuhi kriteria belanja modal. Ini hanya contoh respons offline. Koneksi Gemini dan indeks peraturan diperlukan sebelum aplikasi dapat memberikan analisis yang berdasar sumber.';
    if(/revisi|pok|dipa/.test(t))return 'Proses revisi anggaran biasanya memerlukan pemeriksaan kewenangan, pagu dan volume keluaran, dokumen pendukung, serta mekanisme pengajuan yang berlaku. Respons ini masih simulasi; belum memeriksa naskah peraturan atau kewenangan revisi yang tepat.';
    if(/sbm|sbk|biaya/.test(t))return 'Dalam penyusunan anggaran, SBM dan SBK berperan sebagai acuan biaya sesuai regulasi dan tahun anggaran terkait. Ini respons contoh. Aktifkan AI online dan basis pengetahuan yang disetujui untuk jawaban bersumber.';
    if(/peraturan|sumber|koleksi/.test(t))return 'Knowledge base masih dipersiapkan. Dokumen yang telah di-ingest belum otomatis dipublikasikan ke situs. Saat ini mode offline tidak bisa menelusuri PDF, pasal, maupun halaman sumber.';
    return 'Pertanyaanmu sudah diterima oleh tampilan Rujukan. Saat ini aplikasi berada di mode demo offline, sehingga jawaban ini hanya simulasi. Buka Pengaturan dan hubungkan Netlify Functions + Gemini untuk mulai mencoba percakapan AI sungguhan.';}
  function setPending(on){state.pending=on;$('sendButton').disabled=on;$('questionInput').disabled=on;}
  async function requestAI(text, history){const response=await fetch(state.api,{method:'POST',headers:{'content-type':'application/json',...(state.code?{'x-demo-access-code':state.code}:{})},body:JSON.stringify({question:text,history}),signal:AbortSignal.timeout(28000)});
    let data;try{data=await response.json();}catch{throw new Error('Server tidak mengembalikan JSON yang valid. Periksa URL fungsi Netlify.');}
    if(!response.ok)throw new Error(data.error||`Permintaan ditolak (HTTP ${response.status})`);if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('AI tidak memberikan jawaban teks.');return data;}
  async function send(text){const q=text.trim();if(!q||state.pending)return;let c=current();if(!c){newChat(true);c=current();}const previous=c.messages.slice(-10).map(m=>({role:m.role==='assistant'?'model':'user',text:m.text}));if(!c.messages.length)c.title=q.slice(0,66);c.messages.push({role:'user',text:q});c.updated=now();persist();$('questionInput').value='';resizeTextarea();render();setPending(true);
    const holder=addMessage('assistant','',state.connected?'online':'demo');const p=holder.querySelector('p');p.innerHTML='<span class="loading-dots" aria-label="Menyiapkan jawaban"><span></span><span></span><span></span></span>';
    $chat.scrollTop=$chat.scrollHeight;
    try { const output=state.connected?await requestAI(q,previous):{reply:demoAnswer(q),sources:[],grounded:false};
      c.messages.push({role:'assistant',text:output.reply,kind:state.connected?'online':'demo',sources:Array.isArray(output.sources)?output.sources:[]}); }
    catch(e){c.messages.push({role:'assistant',text:e?.name==='TimeoutError'?'Waktu permintaan habis. Coba lagi.':(e.message||'Terjadi kesalahan koneksi.'),kind:'error',sources:[]});}
    finally{c.updated=now();persist();setPending(false);render();$('questionInput').focus();}
  }
  function resizeTextarea(){$('questionInput').style.height='auto';$('questionInput').style.height=Math.min($('questionInput').scrollHeight,125)+'px';$('charCounter').textContent=$('questionInput').value.length+'/1500';}
  async function checkConnection(api,code){if(!safeHttpUrl(api))throw new Error('URL harus HTTPS dan berakhir dengan /.netlify/functions/chat');const r=await fetch(api,{method:'GET',headers:code?{'x-demo-access-code':code}:{},signal:AbortSignal.timeout(10000)});let d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Koneksi gagal (HTTP ${r.status})`);if(d.status!=='ready')throw new Error('Endpoint tidak merespons sebagai backend Rujukan.');return d;}
  async function connect(silent=false){if(!state.api){state.connected=false;status('offline');return;}status('pending');try{await checkConnection(state.api,state.code);state.connected=true;status('online');if(!silent)feedback('Koneksi berhasil! Gemini siap digunakan.','success');}catch(e){state.connected=false;status('offline');if(!silent)feedback(e.message,'error');}}
  function feedback(text,type=''){const f=$('settingsFeedback');f.className='feedback '+type;f.textContent=text;}
  function openSettings(){$('apiUrl').value=state.api;$('accessCode').value=state.code;feedback('');$('settingsModal').classList.remove('hidden');$('apiUrl').focus();}
  function closeSettings(){$('settingsModal').classList.add('hidden');}
  function setCategory(topic){document.querySelectorAll('.category').forEach(x=>x.classList.toggle('active',x.dataset.topic===topic));document.querySelectorAll('.suggestion-card').forEach(x=>{x.hidden=topic!=='all'&&x.dataset.topic!==topic;});if(current()?.messages.length)newChat();closeMenu();}
  const atr=$('atrLogo');atr.src=config.LOGO_URL||'';atr.onerror=()=>{atr.style.display='none'; const fallback=document.createElement('strong');fallback.textContent='ATR';fallback.style.cssText='font:800 15px var(--display);color:#0a5271';atr.parentElement.append(fallback);};
  $('newChat').addEventListener('click',()=>{newChat();closeMenu();});
  $('menuButton').addEventListener('click',()=>{const show=!$('sidebar').classList.contains('open');$('sidebar').classList.toggle('open',show);$('scrim').hidden=!show;$('menuButton').setAttribute('aria-expanded',String(show));});
  $('scrim').addEventListener('click',closeMenu);
  $('clearHistory').addEventListener('click',()=>{if(confirm('Hapus semua percakapan yang tersimpan di browser ini?')){state.chats=[];newChat();closeMenu();}});
  const questionBank=$('questionBank');
  if(questionBank){QA_TESTS.forEach((q,i)=>{
    const b=document.createElement('button');b.type='button';b.className='quick-question';
    b.textContent=String(i+1).padStart(2,'0')+'  '+q;
    b.addEventListener('click',()=>send(q));questionBank.append(b);
  });}
  document.querySelectorAll('.category').forEach(x=>x.addEventListener('click',()=>setCategory(x.dataset.topic)));
  document.querySelectorAll('.suggestion-card').forEach(x=>x.addEventListener('click',()=>send(x.dataset.question)));
  $('openSettings').addEventListener('click',openSettings);$('closeSettings').addEventListener('click',closeSettings);$('settingsModal').addEventListener('click',e=>{if(e.target===$('settingsModal'))closeSettings();});
  $('testConnection').addEventListener('click',async()=>{feedback('Memeriksa server Netlify...');try{const result=await checkConnection($('apiUrl').value.trim(), $('accessCode').value.trim());feedback('Terhubung ke '+(result.model||'Gemini')+'.','success');}catch(e){feedback(e.message,'error');}});
  $('saveSettings').addEventListener('click',async()=>{const url=$('apiUrl').value.trim(),code=$('accessCode').value.trim();if(url&&!safeHttpUrl(url)){feedback('Format URL Netlify tidak valid.','error');return;}state.api=url;state.code=code;if(url)sessionStore.setItem(KEYS.endpoint,url);else sessionStore.removeItem(KEYS.endpoint);if(code)sessionStore.setItem(KEYS.code,code);else sessionStore.removeItem(KEYS.code);await connect();if(state.connected||!url){closeSettings();}});
  $('chatForm').addEventListener('submit',e=>{e.preventDefault();send($('questionInput').value);});$('questionInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit();}});$('questionInput').addEventListener('input',resizeTextarea);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSettings();closeMenu();}if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();newChat();}});
  if(!current())newChat(true);else render();resizeTextarea();connect(true);
})();
