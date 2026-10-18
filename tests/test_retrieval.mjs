import assert from 'node:assert/strict';
import {terms,retrieveApprovedSources} from '../netlify/knowledge/retrieval.mjs';
const src={id:'TEST',title:'Peraturan Revisi Belanja 51 dan 52',url:'https://jdih.kemenkeu.go.id/',legal_status:'BERLAKU',approved_for_publication:true,section:'Pasal Uji',page:1,keywords:'revisi anggaran',excerpt:'Kutipan simulasi yang cukup panjang untuk pengujian validasi penelusuran dokumen sumber resmi pemerintah.'};
assert.ok(terms('Apakah belanja 51 boleh?').includes('51'));
assert.equal(retrieveApprovedSources('Revisi belanja 51 ke 52',[src]).length,1);
assert.equal(retrieveApprovedSources('Revisi belanja 51 ke 52',[{...src,approved_for_publication:false}]).length,0);
assert.equal(retrieveApprovedSources('Revisi belanja 51 ke 52',[{...src,url:'https://drive.google.com/sensitive',legal_status:'PERLU_VERIFIKASI'}]).length,0);
assert.equal(retrieveApprovedSources('Pertanyaan tanpa kata yang relevan',[src]).length,0);
console.log('Retrieval safety tests OK');
