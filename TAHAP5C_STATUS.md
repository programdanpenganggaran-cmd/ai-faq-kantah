# FAQ PP — Tahap 5C (staging saja)

Branch: `develop/faq-pp-rag-5c`.

## Keadaan saat ini

- Google Colab Preflight: 34 PDF dan 9.140 chunk; estimasi 249 request sinkronisasi.
- Netlify `Stopped builds` sudah disimpan oleh pemilik proyek.
- Backend produksi FAQ PP **belum memakai indeks privat ini**.
- Kode backend siap audit secara offline; jangan mengunggah JSONL atau kredensial ke GitHub.
- Paket pengembangan disediakan di ChatGPT sebagai `FAQ_PP_TAHAP5C_READY_REVIEW_NO_DEPLOY.zip`.

## Sebelum merger/produksi

1. Review kode dan jalankan tes pencarian RAG privat dengan mock penyimpanan.
2. Pastikan tidak ada perubahan pada kunci Gemini dan tidak ada PDF/JSONL di repository publik.
3. Pasang kode sebagai satu commit pada branch pengembangan, bukan langsung ke `main`.
4. Sediakan `RAG_ADMIN_KEY` khusus fungsi Netlify (secret, production only).
5. Periksa kredit dan kuota Netlify sebelum mengaktifkan builds untuk satu deployment.
6. Gunakan sinkronisasi mode PREVIEW terlebih dahulu. Upload hanya setelah admin menyetujui penggunaan layanan eksternal.
7. Verifikasi seluruh 183 blok chunk dan 64 shard sebelum menandai indeks aktif.

Catatan: penelusuran tahap ini leksikal; belum embeddings semantik, dan status hukum tiap peraturan tetap harus diverifikasi.
