# RUJUKAN — AI FAQ Kantah V2
**Purwarupa web Biro Perencanaan dan Kerja Sama — Kementerian ATR/BPN**

Versi uji coba mandiri dengan **frontend GitHub Pages**, **backend Netlify Functions**, dan **Gemini API Free**. Tidak memakai n8n, database berbayar, atau VPS.

> ⚠️ Purwarupa independen. Penggunaan identitas instansi pada desain tidak menyiratkan telah disahkan sebagai aplikasi resmi. Jangan masukkan dokumen rahasia, NIK, informasi pemohon, atau data internal sensitif. Gemini Free berpotensi menggunakan data untuk pengembangan layanan. Periksa kebijakan Google sebelum uji coba dengan informasi yang tidak bersifat publik.

## Struktur satu repository

```text
RUJUKAN_AI_FAQ_KANTAH_V2/
├── docs/                   # WEBSITE yang dipublikasikan GitHub Pages
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── config.js           # URL publik saja, BUKAN API key
│   └── .nojekyll
├── netlify/functions/
│   └── chat.mjs             # Backend Gemini; hanya berjalan di Netlify
├── netlify.toml            # Netlify publish docs/, functions netlify/functions
├── .gitignore
└── README.md
```

### 1. Pasang website di GitHub (repo yang sudah ada juga boleh)
1. Buka repository `https://github.com/programdanpenganggaran-cmd/ai-faq-kantah` atau repository kamu.
2. Unggah isi ZIP ini ke **root repo** sambil mempertahankan folder `docs/`, `netlify/` dan file `netlify.toml`. Jangan mengunggah ZIP tanpa ekstrak. Jangan menghapus konfigurasi website lama sebelum file baru berhasil terunggah.
3. Buka **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Pilih branch `main`, folder **`/docs`**, kemudian **Save**. Bila situs semula berada di root, perubahan ini perlu dilakukan agar menampilkan V2.
5. Tunggu deployment. Situs seharusnya tersedia di `https://programdanpenganggaran-cmd.github.io/ai-faq-kantah/` untuk nama repo tersebut. Sebelum Netlify tersambung, mode demo offline tetap bekerja.

### 2. Buat API key Gemini Free
1. Buka https://aistudio.google.com/apikey dan login.
2. Buat API key di proyek yang mendukung Gemini API free tier. Pastikan tetap **Free**, jangan mengaktifkan billing jika belum siap.
3. Pilih model free yang tersedia; konfigurasi bawaan `gemini-2.5-flash-lite`. Kuota dan ketersediaan model dapat berubah menurut akun, region, waktu, dan batas free tier. Periksa https://ai.google.dev/gemini-api/docs/pricing dan https://ai.google.dev/gemini-api/docs/rate-limits.
4. **Jangan** masukkan API key ke GitHub, `config.js`, `netlify.toml`, screenshot, atau chat.

### 3. Aktifkan Netlify Functions (tanpa terminal)
1. Buka https://app.netlify.com/ dan daftar/login menggunakan akun GitHub pada **paket Free**.
2. Pilih **Add new project → Import an existing project** (label menu mungkin berubah). Pilih GitHub dan repository `ai-faq-kantah`.
3. Netlify biasanya membaca `netlify.toml` otomatis. Periksa **Publish directory: `docs`**, **Functions directory: `netlify/functions`**. Tidak perlu perintah build.
4. Buka **Project configuration → Environment variables** dan tambah:

   | Nama | Nilai | Keterangan |
   | ---- | ----- | ---------- |
   | `GEMINI_API_KEY` | API key dari AI Studio | **Rahasia; set via Netlify UI** |
   | `GEMINI_MODEL` | `gemini-2.5-flash-lite` | Boleh diubah sesuai free-tier tersedia |
   | `DEMO_ACCESS_CODE` | kode acak panjang pilihan sendiri | Direkomendasikan untuk mengurangi akses penguji tidak diundang; **bukan autentikasi pegawai** |
   | `ALLOWED_ORIGINS` | `https://programdanpenganggaran-cmd.github.io` | **Origin tanpa path** `/ai-faq-kantah`; pisahkan koma bila ada domain lain |

5. Lakukan **Trigger deploy / Deploy site** setelah mengatur environment variables, supaya nilainya masuk ke runtime fungsi.
6. Periksa URL fungsi: `https://NAMA-SITUS.netlify.app/.netlify/functions/chat` (**ganti NAMA-SITUS dengan domain asli Netlify**).
7. Jika membuka URL fungsi langsung tanpa kode akses, respons JSON `Kode akses ...` merupakan perilaku normal; uji dari web lewat langkah selanjutnya.

### 4. Hubungkan website GitHub ke Netlify
1. Buka website GitHub Pages V2 → klik **Pengaturan** di kanan atas.
2. Masukkan URL lengkap `https://NAMA-SITUS.netlify.app/.netlify/functions/chat`.
3. Masukkan `DEMO_ACCESS_CODE` yang kamu buat di Netlify (jika diaktifkan).
4. Klik **Uji koneksi**, lalu **Simpan & gunakan AI**. Koneksi berhasil jika status berubah `AI Gemini terhubung`.
5. Ajukan pertanyaan non-rahasia. Gemini akan memberikan respons percakapan, **bukan** jawaban yang sudah diverifikasi terhadap naskah peraturan.

> **Catatan:** CORS hanya mengurangi akses dari origin browser yang tidak diizinkan. Ia bukan pengganti autentikasi dan pembatasan laju yang kuat. Kode demo adalah kontrol sementara untuk uji coba, belum memadai untuk produksi publik dengan banyak pengguna.

### 5. Ganti logo ATR/BPN jika memiliki PNG resmi
`docs/config.js` menyediakan `LOGO_URL`. Saat ini menggunakan gambar logo ATR/BPN (arsip versi 2017) yang ditautkan dari Wikimedia Commons, halaman https://commons.wikimedia.org/wiki/File:Logo_BPN-KemenATR_(2017).png . Untuk publikasi instansi gunakan **aset logo resmi yang disetujui**, simpan misalnya di `docs/assets/logo-atrbpn.png`, lalu ubah menjadi:

```js
LOGO_URL: "assets/logo-atrbpn.png",
```

Logo remote bisa tidak tampil jika akses Wikimedia dibatasi, dan aplikasi menyediakan fallback teks ATR.

## Fitur yang sudah ada / belum ada

**Sudah ada:** frontend responsif, header ATR/BPN dan nama Biro Perencanaan dan Kerja Sama, kategori topik, kartu pertanyaan cepat, histori **hanya di browser**, tombol hapus histori, mode demo offline, integrasi Gemini di Netlify, kode akses pengujian opsional, larangan menaruh API key di web, pesan kuota error, pemberitahuan sumber belum tersedia.

**Belum ada:** RAG/pgvector, sitasi pasal/halaman yang diverifikasi, sinkronisasi 34 dokumen secara langsung, histori antar-perangkat, autentikasi pegawai, belajar otomatis dari pertanyaan, rate limiting server-side yang tahan penyalahgunaan. Jangan menganggap `approved_for_ai=YA` sama dengan izin menerbitkan PDF secara publik.

## Privasi dan operasional
- Situs GitHub Pages publik, maka semua isi folder `docs/` bisa dibaca siapa pun.
- Histori dalam browser menggunakan localStorage. Bersihkan lewat tombol **Hapus** bila perangkat digunakan bergantian. Pertanyaan Gemini dikirim ke Google melalui Netlify dan mungkin diproses menurut ketentuan free tier.
- Kode akses disimpan dalam sessionStorage tab/browser, **bukan sebagai sandi pengguna**. Untuk publikasi yang lebih luas, tambahkan autentikasi, audit, penanganan penyalahgunaan, batas kuota dan kebijakan privasi.
- Jika muncul HTTP 429, kuota Gemini Free mungkin tercapai. Jangan mengaktifkan plan berbayar jika belum ada anggaran.
- Jika muncul `Origin tidak diizinkan`, perbaiki `ALLOWED_ORIGINS` tanpa path, contoh `https://programdanpenganggaran-cmd.github.io`; *redeploy*.
- Jika muncul `GEMINI_API_KEY belum disetel`, tambah environment variable di Netlify UI; *redeploy*.
- Jika muncul HTTP 404 model, cek model di AI Studio dan sesuaikan `GEMINI_MODEL`.

**Referensi:**
- https://docs.netlify.com/build/functions/overview/
- https://docs.netlify.com/build/functions/environment-variables/
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/pricing
