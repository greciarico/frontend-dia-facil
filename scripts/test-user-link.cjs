const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}) {
 const exports={};const defaults={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},...modules};
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 (id=>{if(id.startsWith('@/assets/'))return id;assert.ok(id in defaults,'Missing adapter: '+id);return defaults[id];},exports);return exports;
}
const avatars=load('constants/carer-avatars.ts');const profiles=load('utils/profiles.ts',{'@/constants/carer-avatars':avatars});
const utils=load('utils/user-link.ts',{'./profiles':profiles});
const {DeviceAccessManager,DeviceFailure}=load('services/device-access-manager.ts',{'@/utils/user-link':utils});
const TOKEN='du_'+'D'.repeat(43),CODE='DF-7KQ9W6H2M8V3X5RA';
const linked={estado:'VINCULADO',perfil:{idPerfilUsuario:12,nombre:'Persona real',avatar:null}};const pending={estado:'PENDIENTE',perfil:null};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(options={}) {
 let stored=options.stored||null,remote=options.remote||pending;const events=[];
 const deps={read:async()=>stored,write:async v=>{events.push('write');stored=v;},prepare:async()=>{events.push('prepare');return TOKEN;},
 current:async()=>{events.push('GET');return remote;},bind:async()=>{events.push('POST');remote=linked;return linked;},revoke:async()=>{events.push('DELETE');},...options.deps};
 return {manager:new DeviceAccessManager(deps),deps,events,stored:()=>stored,remote:v=>{remote=v;}};
}
test('syntax only: unique 16-symbol format, shared QR/manual normalization, DTO rejects malformed success',()=>{
 assert.equal(utils.normalizeLinkCode(' df-7kq9 w6h2 m8v3 x5ra '),CODE);assert.ok(utils.validLinkCode(CODE));
 for(const value of ['DF-482157','https://example.invalid/'+CODE,'12',CODE+'A',CODE.replace('7','!')])assert.equal(utils.validLinkCode(value),false);
 for(const character of ['0','1','I','O'])assert.ok(utils.validLinkCode('DF-'+character.repeat(16)));
 assert.deepEqual(utils.parseUserLink(linked),linked);assert.deepEqual(utils.parseUserLink(pending),pending);
 for(const value of [{},null,{estado:'VINCULADO',perfil:{idPerfilUsuario:999}},{estado:'PENDIENTE',perfil:linked.perfil}])assert.throws(()=>utils.parseUserLink(value));
});

test('manual normalization is capped at 19 without truncating QR payloads',()=>{
 assert.equal(utils.linkCodeLength,19);assert.equal(utils.normalizeManualLinkCode(' df-7kq9 w6h2 m8v3 x5ra '),CODE);
 assert.equal(utils.normalizeManualLinkCode(CODE+'X'),CODE);assert.equal(utils.normalizeManualLinkCode(CODE.slice(0,-1)).length,18);
 assert.equal(utils.normalizeLinkCode(CODE+'X'),CODE+'X');assert.equal(utils.validLinkCode(utils.normalizeLinkCode(CODE+'X')),false);
});

test('all-alphanumeric code reaches bind and backend rejection retains the pending credential',async()=>{
 const code='DF-0000000000000000';let received;
 const f=fixture({deps:{bind:async(token,value)=>{received=value;assert.equal(token,TOKEN);throw new DeviceFailure('invalid-code');}}});
 await assert.rejects(f.manager.connect(code),e=>e.kind==='invalid-code');assert.equal(received,code);
 assert.equal(JSON.parse(f.stored()).active,TOKEN);assert.equal(f.events.filter(x=>x==='prepare').length,1);
});
test('persists pending secret before binding, uses real profile and confirms only immediate success',async()=>{
 const f=fixture();await f.manager.restore();await f.manager.connect(CODE);
 assert.deepEqual(f.events,['prepare','write','GET','POST']);assert.equal(JSON.parse(f.stored()).active,TOKEN);
 assert.equal(f.manager.getSnapshot().profile.nombre,'Persona real');assert.equal(f.manager.getSnapshot().stage,'confirmation');
 f.manager.finish();assert.equal(f.manager.getSnapshot().stage,'ready');
 const fresh=fixture({stored:f.stored(),remote:linked});await fresh.manager.restore();assert.equal(fresh.manager.getSnapshot().status,'linked');assert.equal(fresh.manager.getSnapshot().stage,'ready');assert.deepEqual(fresh.events,['GET']);
});
test('malformed code never prepares or checks existence',async()=>{
 const f=fixture();await assert.rejects(f.manager.connect('DF-482157'),e=>e.kind==='invalid-code');assert.deepEqual(f.events,[]);
});
test('unknown POST outcome recovers via GET without replay or duplicate device',async()=>{
 let calls=0;const f=fixture({deps:{bind:async()=>{calls++;f.remote(linked);throw new DeviceFailure('network');}}});
 await f.manager.connect(CODE);assert.equal(calls,1);assert.equal(f.manager.getSnapshot().status,'linked');assert.deepEqual(f.events,['prepare','write','GET','GET']);
});
test('duplicate taps coalesce and canceled provisioning is not silently resubmitted',async()=>{
 let resolve;const f=fixture({deps:{bind:()=>new Promise(r=>{resolve=r;})}});
 const first=f.manager.connect(CODE);const second=f.manager.connect(CODE);await tick();assert.ok(resolve);resolve(linked);await Promise.all([first,second]);
 assert.equal(f.events.filter(x=>x==='prepare').length,1);
});
test('invalid code and technical failure remain different; pending credential is reused',async()=>{
 let attempts=0;const f=fixture({deps:{bind:async()=>{if(attempts++===0)throw new DeviceFailure('invalid-code');return linked;}}});
 await assert.rejects(f.manager.connect(CODE),e=>e.kind==='invalid-code');assert.equal(JSON.parse(f.stored()).active,TOKEN);
 await f.manager.connect(CODE);assert.equal(attempts,2);assert.equal(f.events.filter(x=>x==='prepare').length,1);
});
test('failed secure storage prevents POST and retry preserves the same pending grant',async()=>{
 const f=fixture({deps:{write:async()=>{throw new Error('unavailable');}}});
 await assert.rejects(f.manager.connect(CODE),e=>e.kind==='storage');assert.equal(f.events.includes('POST'),false);
 f.deps.write=async()=>{};await f.manager.connect(CODE);assert.equal(f.events.filter(x=>x==='prepare').length,1);
});
test('restoration outage preserves token and does not imply invalid code or anonymous access',async()=>{
 const raw=JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]});
 const f=fixture({stored:raw,deps:{current:async()=>{throw new DeviceFailure('network');}}});await f.manager.restore();
 assert.equal(f.manager.getSnapshot().status,'error');assert.equal(f.stored(),raw);
 f.deps.current=async()=>linked;await f.manager.restore();assert.equal(f.manager.getSnapshot().status,'linked');
});
test('authoritative invalidation clears active secret, unlike network failures',async()=>{
 const f=fixture({stored:JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]}),deps:{current:async()=>{throw new DeviceFailure('invalid-access');}}});
 await f.manager.restore();assert.equal(f.manager.getSnapshot().status,'unlinked');assert.equal(f.stored(),null);
});
test('local pause retains encrypted proofs without revoking; reopening does not restore a paused profile',async()=>{
 const f=fixture({stored:JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]}),remote:linked,deps:{revoke:async()=>{throw new DeviceFailure('network');}}});
 await f.manager.restore();await f.manager.logout(true);await tick();assert.equal(f.manager.getSnapshot().status,'unlinked');
 assert.deepEqual(JSON.parse(f.stored()),{version:2,active:null,proofs:[TOKEN],paused:true});
 assert.ok(!f.events.includes('DELETE'));await assert.rejects(f.manager.token());
 const reopened=fixture({stored:f.stored(),remote:linked});await reopened.manager.restore();assert.equal(reopened.manager.getSnapshot().paused,true);assert.deepEqual(reopened.events,[]);
});
test('logout during a pending POST cannot publish success afterwards',async()=>{
 let resolve;const f=fixture({deps:{bind:()=>new Promise(r=>{resolve=r;})}});const task=f.manager.connect(CODE);await tick();
 await f.manager.logout();resolve(linked);await assert.rejects(task,e=>e.kind==='canceled');assert.equal(f.manager.getSnapshot().status,'unlinked');
});
test('durable cross-domain writes serialize and reject two active experiences',async()=>{
 const store=new Map();const writes=load('services/access-storage.ts',{'expo-secure-store':{getItemAsync:async k=>store.get(k)||null,
 setItemAsync:async(k,v)=>{store.set(k,v);},deleteItemAsync:async k=>{store.delete(k);},AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:1}});
 const raw=JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]});
 const results=await Promise.allSettled([writes.writeAccess(writes.deviceStorageKey,raw),writes.writeAccess(writes.caregiverStorageKey,raw)]);
 assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected']);assert.equal(store.size,1);
 await writes.writeAccess(writes.deviceStorageKey,null);await writes.writeAccess(writes.caregiverStorageKey,raw);assert.equal(store.size,1);
});

test('an invalid code leaves a cancelable pending grant; cancel returns to role selection',async()=>{
 const f=fixture({deps:{bind:async()=>{throw new DeviceFailure('invalid-code');}}});
 await assert.rejects(f.manager.connect(CODE),e=>e.kind==='invalid-code');
 assert.equal(f.manager.getSnapshot().status,'pending');await f.manager.logout();await tick();
 assert.equal(f.manager.getSnapshot().status,'unlinked');assert.equal(JSON.parse(f.stored()).active,null);assert.ok(!f.events.includes('DELETE'));
 assert.equal(f.manager.getSnapshot().paused,false);
});

test('entry routes use device restoration and confirmation memory before caregiver fallback',()=>{
 const tokens=load('theme/tokens.ts');let device={status:'linked',stage:'ready'};
 const home=load('app/index.tsx',{
  'react':{},'react-native':{StyleSheet:{create:v=>v}},'expo-image':{},'react-native-svg':{},
  'expo-router':{Redirect:'Redirect'},'react-native-safe-area-context':{},
  '@/components/welcome/role-card':{},'@/context/device-access':{useDeviceAccess:()=>device},
  '@/components/user/device-access-boundary':{DeviceAccessBoundary:'DeviceBoundary'},
  '@/components/session-boundary':{SessionBoundary:'SessionBoundary'},
  '@/context/session':{useSession:()=>({status:'authenticated',stage:'ready'})},
  '@/theme/tokens':tokens,'@/theme/use-theme':{},
 }).default;
 assert.equal(home().props.href,'/mi-agenda');device={status:'linked',stage:'confirmation'};assert.equal(home().props.href,'/usuario');
 device={status:'pending',stage:'ready'};assert.equal(home().props.href,'/usuario');
 device={status:'unlinked',stage:'ready',paused:true};assert.equal(home().props.href,'/usuario');
 device={status:'error',stage:'ready'};assert.equal(home().type,'DeviceBoundary');
 device={status:'booting',stage:'ready'};assert.equal(home().type,'DeviceBoundary');
 device={status:'unlinked',stage:'ready'};assert.equal(home().props.href,'/perfiles');
});

test('a late private 401 cannot erase a newer device connection',async()=>{
 const interceptors={};let revision=1,invalidated=0;
 const access=load('services/device-access.ts',{
  axios:{isAxiosError:e=>e?.isAxiosError,create:()=>({interceptors:{request:{use:fn=>{interceptors.request=fn;}},response:{use:(ok,fail)=>{interceptors.fail=fail;}}}})},
  'expo-device':{},'./http':{},'@/config/env':{getApiUrl:()=> 'https://example.invalid'},'./access-storage':{},
  './device-access-manager':{DeviceFailure,DeviceAccessManager:class {revision=()=>revision;token=async()=>TOKEN;invalidate=async()=>{invalidated++;}}},
  '@/utils/user-link':utils,
 });
 access.createUserHttpClient();const request={url:'/api/usuario/agenda',headers:{set:()=>{}}};
 await interceptors.request(request);revision++;
 await assert.rejects(interceptors.fail({isAxiosError:true,response:{status:401},config:request}));assert.equal(invalidated,0);
 const current={url:'/api/usuario/agenda',headers:{set:()=>{}}};await interceptors.request(current);
 await assert.rejects(interceptors.fail({isAxiosError:true,response:{status:401},config:current}));assert.equal(invalidated,1);
 await assert.rejects(interceptors.fail({isAxiosError:true,response:{status:404,data:{codigo:'ACTIVIDAD_NO_ENCONTRADA'}},config:current}),e=>e.kind==='not-found');
 assert.equal(invalidated,1);
 await assert.rejects(interceptors.fail({isAxiosError:true,response:{status:404,data:{}},config:current}),e=>e.kind==='network');
 await assert.rejects(interceptors.request({url:'https://elsewhere.invalid/api/usuario/agenda'}));
});

test('explicit reconnect never restores the wrong old profile and safely reuses the proof for the resolved profile',async()=>{
 const old=TOKEN,fresh='du_'+'F'.repeat(43),other='du_'+'G'.repeat(43);let calls=0;
 const raw=JSON.stringify({version:2,active:null,proofs:[old,other],paused:true});
 const f=fixture({stored:raw,deps:{prepare:async()=>fresh,current:async token=>{assert.equal(token,fresh);return pending;},
  bind:async(token,code,proofs)=>{calls++;assert.equal(token,fresh);assert.equal(code,CODE);assert.deepEqual(proofs,[old,other]);return {...linked,credencialDispositivo:old};}}});
 await f.manager.restore();assert.equal(f.manager.getSnapshot().paused,true);await f.manager.connect(CODE);
 assert.equal(await f.manager.token(),old);assert.equal(JSON.parse(f.stored()).active,old);assert.equal(calls,1);
 assert.equal(f.manager.getSnapshot().stage,'confirmation');
 await f.manager.logout(true);assert.ok(JSON.parse(f.stored()).proofs.includes(old));
});

test('switching profile validates the newly supplied code instead of accepting GET of the previous profile',async()=>{
 const fresh='du_'+'F'.repeat(43);let posts=0;
 const f=fixture({stored:JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]}),remote:linked,
  deps:{prepare:async()=>fresh,current:async token=>token===TOKEN?linked:pending,
  bind:async(token,code,proofs)=>{posts++;assert.equal(token,fresh);assert.equal(code,CODE);assert.deepEqual(proofs,[TOKEN]);return {...linked,perfil:{...linked.perfil,idPerfilUsuario:13,nombre:'Otro perfil'}};}}});
 await f.manager.restore();await f.manager.connect(CODE);assert.equal(posts,1);assert.equal(f.manager.getSnapshot().profile.idPerfilUsuario,13);
 assert.equal(await f.manager.token(),fresh);
});

test('lost reuse response remains recoverable by an explicit retry, never automatic POST replay',async()=>{
 const fresh='du_'+'F'.repeat(43);let posts=0;
 const f=fixture({stored:JSON.stringify({version:2,active:null,proofs:[TOKEN],paused:true}),deps:{prepare:async()=>fresh,current:async()=>pending,
  bind:async()=>{if(++posts===1)throw new DeviceFailure('network');return {...linked,credencialDispositivo:TOKEN};}}});
 await assert.rejects(f.manager.connect(CODE),e=>e.kind==='network');assert.equal(posts,1);assert.equal(JSON.parse(f.stored()).active,fresh);
 assert.ok(JSON.parse(f.stored()).proofs.includes(TOKEN));await f.manager.connect(CODE);assert.equal(posts,2);assert.equal(await f.manager.token(),TOKEN);
});

test('v1 queued credentials migrate to retained proofs without automatically unlinking active devices',async()=>{
 const f=fixture({stored:JSON.stringify({version:1,active:null,pendingRevocations:[TOKEN]})});
 await f.manager.restore();await f.manager.logout(true);assert.equal(JSON.parse(f.stored()).version,2);assert.deepEqual(JSON.parse(f.stored()).proofs,[TOKEN]);
 assert.ok(!f.events.includes('DELETE'));
});

test('a bind completed between preflight checks cannot confirm a profile for a different newly entered code',async()=>{
 let gets=0,posts=0;const f=fixture({stored:JSON.stringify({version:1,active:TOKEN,pendingRevocations:[]}),deps:{
 current:async()=>++gets===1?pending:linked,bind:async()=>{posts++;return linked;}}});
 await assert.rejects(f.manager.connect(CODE),e=>e.kind==='network');assert.equal(posts,0);assert.notEqual(f.manager.getSnapshot().status,'linked');
 assert.equal(JSON.parse(f.stored()).active,null);assert.deepEqual(JSON.parse(f.stored()).proofs,[TOKEN]);
});
