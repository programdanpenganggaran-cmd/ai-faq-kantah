import { registerHooks } from 'node:module';
const db = new Map();
const store = {
 map: db,
 async get(key, opts) { const val=db.has(key)?db.get(key):null; return opts?.type==='json'?val:val; },
 async getMetadata(key) { return db.has(key)?{etag:'local-'+key,metadata:{}}:null; },
 async setJSON(key, value){ db.set(key,value); return { modified:true,etag:'mock' }; }
};
globalThis.__mockBlobs = {store};
const moduleCode = 'export const getStore = () => globalThis.__mockBlobs.store;';
registerHooks({
 resolve(specifier, context, nextResolve){
  if(specifier==='@netlify/blobs')return {url:'data:text/javascript,'+encodeURIComponent(moduleCode),shortCircuit:true};
  return nextResolve(specifier, context);
 }
});
