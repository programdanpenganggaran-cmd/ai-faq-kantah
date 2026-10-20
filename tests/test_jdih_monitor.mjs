import assert from 'node:assert/strict';
import {parseJdihPage,buildObservations} from '../scripts/monitor-jdih.mjs';
const sample=entry=>'<html><head><title>'+entry.id+' | JDIH Kemenkeu</title></head><body>'
+'<p>Tipe Dokumen Peraturan Kode PMK 62 TAHUN 2023 '
+' Judul PMK Kementerian Keuangan Jenis Peraturan Menteri '
+'Tanggal Berlaku 22 Jun 2026 - s.d. Dicabut Tempat Terbit Jakarta Sumber BNRI '
+' Riwayat Dokumen (2) 22 Jun 2026 Diubah Terbaru Dokumen ini diubah oleh '
+' PMK 41 TAHUN 2026 tentang perubahan; PMK 107 TAHUN 2024 tentang perubahan.'
+' Kutip Dokumen Ini Produk Hukum Terkait PMK 54 TAHUN 2026'
+' Evaluasi peraturan Kementerian keuangan perbendaharaan kementerian negara</p></body></html>';
const entry={id:'PMK-62-2023',url:'https://jdih.kemenkeu.go.id/dok/pmk-62-tahun-2023',topic:'Penganggaran'};
const html=sample(entry);
const extracted=parseJdihPage(html,entry);
assert.equal(extracted.id,'PMK-62-2023');
assert.equal(extracted.history_count,2);
assert.deepEqual(extracted.history_related_ids,['PMK-107-2024','PMK-41-2026']);
assert.equal(extracted.legal_status,'NOT_AUTOMATICALLY_VERIFIED');
assert.equal(extracted.effective_text,'22 Jun 2026 - s.d. Dicabut');
assert.ok(/^[0-9a-f]{24}$/.test(extracted.metadata_signature));
assert.throws(()=>parseJdihPage(html,{...entry,url:'https://jdih.kemenkeu.go.id.fake.example/doc'}));
assert.throws(()=>parseJdihPage(html,{...entry,id:'PMK-98-2024'}));
const prior={observations:[],related_untracked:[]};
const a=buildObservations(prior,[extracted],[entry],'2026-10-19T01:00:00Z');
assert.equal(a.updated,true);
assert.equal(a.changes.length,1);
assert.deepEqual(a.candidates,['PMK-107-2024','PMK-41-2026']);
const b=buildObservations(a.next,[extracted],[entry],'2026-10-26T01:00:00Z');
assert.equal(b.updated,false);
assert.deepEqual(b.changes,[]);
const amended={...extracted,metadata_signature:'abc123',history_count:3};
const c=buildObservations(a.next,[amended],[entry],'2026-11-02T01:00:00Z');
assert.equal(c.updated,true);
assert.equal(c.changes.length,1);
assert.equal(c.next.observations[0].first_observed,'2026-10-19T01:00:00Z');
assert.equal(c.next.observations[0].changed_at,'2026-11-02T01:00:00Z');
console.log('PASS: official JDIH metadata extraction, relations, trusted hosts, change-only snapshots.');
