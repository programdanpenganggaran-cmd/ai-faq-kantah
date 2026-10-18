(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const els = { question: $('question'), send: $('sendButton'), welcome: $('welcome'), messages: $('messages'),
    form: $('chatForm'), modeExplanation: $('modeExplanation'), modeBanner: $('modeBanner'), status: $('connectionText'),
    dot: $('connectionDot'), modal: $('settingsModal'), url: $('workerUrl'), code: $('accessCode'), feedback: $('settingsFeedback') };
  const configuredUrl = (window.RUJUKAN_CONFIG && window.RUJUKAN_CONFIG.WORKER_URL) || '';
  let workerUrl = urlOk(configuredUrl) ? configuredUrl.replace(/\/+$/, '') : '';
  let accessCode = ''; // Tidak disimpan ke disk, URL, ataupun GitHub.
  let busy = false;
  let history = [];
  function urlOk(raw) {
    try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password; }
    catch { return false; }
  }
  function setMode() {
    const isOnline = Boolean(workerUrl);
    els.status.textContent = isOnline ? 'AI online dikonfigurasi' : 'Mode demo offline';
    els.dot.classList.toggle('live', isOnline);
    els.modeExplanation.innerHTML = '';
    const badge = document.createElement('span'); badge.className = 'status-mini'; badge.textContent = 'i';
    els.modeExplanation.appendChild(badge);
    els.modeExplanation.append(document.createTextNode(isOnline
      ? 'Mode AI online terhubung secara konfigurasi. Jawaban hukum hanya diberikan bila ada sumber yang telah diterbitkan untuk demo.'
      : 'Mode offline: percakapan contoh berbasis template, BUKAN AI generatif. Hubungkan Cloudflare Worker untuk mengaktifkan AI sungguhan.'));
    els.modeBanner.textContent = isOnline
      ? '● AI online · Dasar hukum hanya dari materi yang disetujui untuk publikasi'
      : '◌ Demo offline · respons contoh, bukan jawaban AI';
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function scrollDown() { const c = $('conversation'); c.scrollTop = c.scrollHeight; }
  function renderUser(text) {
    els.welcome.classList.add('hidden');
    const outer = el('div', 'message user');
    const inner = el('div', 'message-content'); inner.appendChild(el('div', 'message-text', text)); outer.appendChild(inner);
    els.messages.appendChild(outer); scrollDown();
  }
  function renderAssistant(text, sources=[], demo=true) {
    const outer = el('div', 'message');
    const icon = el('div', 'message-icon', 'R.');
    const inner = el('div', 'message-content');
    inner.appendChild(el('div', 'message-label', 'RUJUKAN'));
    const card = el('div', 'answer-box');
    card.appendChild(el('div', 'answer-mode'+(demo ? ' offline' : ''), demo ? 'RESPONS TEMPLATE · OFFLINE' : 'AI GENERATIF · PERIKSA SUMBER'));
    card.appendChild(el('div', 'message-text', text));
    if (Array.isArray(sources) && sources.length) {
      const box = el('div', 'sources');box.appendChild(el('div', 'sources-title', 'SUMBER YANG DITEMUKAN'));
      for (const source of sources.slice(0,4)) {
        if (!urlOk(source.url || '')) continue;
        const a = el('a', 'source-link', `${source.title || 'Dokumen'}${source.page ? ' · Hal. '+source.page : ''} ↗`);
        a.href=source.url; a.rel='noopener noreferrer';a.target='_blank';box.appendChild(a);
      }
      card.appendChild(box);
    }
    inner.appendChild(card); outer.append(icon,inner);els.messages.appendChild(outer);scrollDown();
    return card;
  }
  function demoReply(question) {
    const q=question.toLowerCase();
    if (/^(halo|hai|hi|selamat|pagi|siang|sore|malam|terima kasih)/.test(q.trim())) return 'Halo! Selamat datang di Rujukan, purwarupa AI FAQ Kantah. Saat ini kamu sedang mencoba respons template offline. Kamu bisa bertanya seputar perencanaan dan anggaran untuk melihat alur percakapannya. Untuk jawaban yang dihasilkan AI, aktifkan Cloudflare Worker melalui Pengaturan.';
    if (/dokumen|koleksi|peraturan yang tersedia|apa saja referensi|sumber/.test(q)) return 'Dalam proyek utama, MASTER_DOCUMENT sudah berisi regulasi yang dikumpulkan dari berbagai sumber pemerintah. Namun, website publik ini BELUM memuat naskah-naskah tersebut karena publikasinya memerlukan persetujuan terpisah. Saat AI online aktif dan pustaka publik sudah diisi, sumber akan ditampilkan di bawah jawaban.';
    if (/akun|belanja|renovasi|kapitalisasi|52|53/.test(q)) return 'Untuk menentukan akun belanja, perlu diperiksa klasifikasi BAS, substansi pekerjaan, dan ketentuan kapitalisasi yang relevan. Demo offline tidak dapat menetapkan apakah akun 52 atau 53 tepat. Aktifkan AI online dan indeks sumber yang sudah ditinjau untuk memperoleh jawaban dengan rujukan.';
    if (/sbm|sbk|rka|rab|standar biaya/.test(q)) return 'Pertanyaan mengenai SBM, SBK, atau RKA-K/L harus merujuk regulasi tahun anggaran yang sesuai. Ini respons template demonstrasi; belum ada pemeriksaan pasal atau lampiran. Setelah sumber publik dimasukkan, AI akan mengambil bagian relevan dan menyertakan tautannya.';
    if (/revisi|pagu|dipa|pok/.test(q)) return 'Prosedur revisi anggaran bergantung pada jenis kewenangan, objek revisi, dan tahun anggaran. Mode demo offline belum menganalisis dokumen. Untuk menguji RAG, sambungkan AI online dan tambahkan potongan peraturan yang telah disetujui untuk dipublikasikan.';
    return 'Pertanyaan diterima dalam demo: “'+question.slice(0,150)+'”. Ini masih mode offline, jadi jawaban ini merupakan contoh alur percakapan, bukan hasil penalaran AI. Klik Pengaturan untuk menghubungkan Cloudflare Workers AI gratis.';
  }
  async function askOnline(question) {
    const headers={'Content-Type':'application/json'};
    if (accessCode) headers['X-Demo-Token']=accessCode;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);
    try {
      const resp=await fetch(workerUrl+'/chat',{method:'POST',mode:'cors',headers,body:JSON.stringify({question, history:history.slice(-6)}),signal:controller.signal});
      let data={}; try{data=await resp.json();}catch{}
      if(!resp.ok) throw new Error(data.error || `HTTP ${resp.status} — periksa Worker`);
      if(typeof data.answer!=='string') throw new Error('Format respons backend tidak sesuai');
      return data;
    } finally {clearTimeout(timeout);}
  }
  async function submit(question) {
    if(busy || !question.trim())return;
    question=question.trim().slice(0,1200);els.question.value='';els.question.style.height='auto';busy=true;els.send.disabled=true;
    renderUser(question);
    const wait = renderAssistant(workerUrl ? 'Sedang mencari referensi dan menyusun jawaban...' : 'Menyiapkan respons demo...',[],!workerUrl);
    const answerEl=wait.querySelector('.message-text');answerEl.classList.add('loading-text');
    try {
      const result=workerUrl ? await askOnline(question) : {answer:demoReply(question),sources:[],demo:true};
      answerEl.textContent=result.answer;answerEl.classList.remove('loading-text');
      if (Array.isArray(result.sources)&&result.sources.length) {
        const s=el('div','sources');s.appendChild(el('div','sources-title','SUMBER YANG DITEMUKAN'));
        for(const src of result.sources.slice(0,4)){
          if(!urlOk(src.url||''))continue;
          const link=el('a','source-link',`${src.title||'Dokumen'}${src.page?' · Hal. '+src.page:''} ↗`);
          link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';s.appendChild(link);
        }
        wait.appendChild(s);
      }
      const label=wait.querySelector('.answer-mode');label.textContent=result.demo?'RESPONS TEMPLATE · OFFLINE':result.grounded?'AI RAG · BERDASARKAN SUMBER':'AI · TANPA RUJUKAN REGULASI';
      label.classList.toggle('offline',Boolean(result.demo));
      history.push({role:'user',content:question},{role:'assistant',content:result.answer});
      history=history.slice(-8);
    } catch (err) {
      answerEl.classList.remove('loading-text');
      answerEl.textContent = (err.name==='AbortError')?'Waktu tunggu habis. Coba lagi beberapa saat.':'Belum bisa terhubung ke AI online: '+String(err.message||err).slice(0,180)+'.\n\nPeriksa pengaturan Worker dan kode akses. Percakapan offline masih tersedia dengan mengosongkan URL Worker.';
    } finally { busy=false;els.send.disabled=false;els.question.focus();scrollDown(); }
  }
  function openModal() {els.url.value=workerUrl;els.code.value=accessCode;els.feedback.textContent='';els.modal.classList.remove('hidden');els.url.focus();}
  function closeModal() {els.modal.classList.add('hidden');}
  $('openSettings').addEventListener('click',openModal);
  $('closeSettings').addEventListener('click',closeModal);
  els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  $('saveSettings').addEventListener('click',()=>{
    const url=els.url.value.trim();if(url && !urlOk(url)){els.feedback.textContent='URL Worker harus HTTPS yang valid.';return;}
    workerUrl=url.replace(/\/+$/,'');accessCode=els.code.value;setMode();closeModal();
  });
  $('testConnection').addEventListener('click',async()=>{
    const url=els.url.value.trim().replace(/\/+$/,'');if(!urlOk(url)){els.feedback.textContent='Masukkan URL HTTPS yang valid.';return;}
    els.feedback.textContent='Menguji...';const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),10000);
    try{const r=await fetch(url+'/health',{signal:ctl.signal,mode:'cors'});const d=await r.json();els.feedback.textContent=r.ok&&d.ok ? 'Worker aktif. Simpan koneksi untuk mencoba chat.' : 'Backend belum siap: '+(d.error||r.status);}
    catch(e){els.feedback.textContent='Koneksi gagal. Periksa URL, CORS, atau jaringan.';}finally{clearTimeout(timer);}
  });
  $('newChat').addEventListener('click',()=>{els.messages.replaceChildren();history=[];els.welcome.classList.remove('hidden');els.question.value='';$('sidebar').classList.remove('open');els.question.focus();});
  $('toggleSidebar').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.suggest').forEach(btn=>btn.addEventListener('click',()=>submit(btn.dataset.question)));
  els.form.addEventListener('submit',e=>{e.preventDefault();submit(els.question.value);});
  els.question.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit(els.question.value);}});
  els.question.addEventListener('input',()=>{els.question.style.height='auto';els.question.style.height=Math.min(145,els.question.scrollHeight)+'px';});
  setMode();
})();
