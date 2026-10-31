const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}){const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{if(id.startsWith('@/assets/'))return id;assert.ok(id in modules,'Missing adapter '+id);return modules[id];},out);return out;}
const tokens=load('theme/tokens.ts'), avatars=load('constants/carer-avatars.ts'),profiles=load('utils/profiles.ts',{'@/constants/carer-avatars':avatars});
const activities=load('utils/activities.ts');const utils=load('utils/user-agenda.ts',{'./activities':activities,'./profiles':profiles});
const detailUtils=load('utils/user-activity.ts',{'./activities':activities,'./user-agenda':utils});
const profile={idPerfilUsuario:12,nombre:'Persona real',avatar:null};
const response=()=>({fecha:'2026-10-24',zonaHoraria:'America/Lima',actualizarEnSegundos:60,perfil:profile,actividades:[{idActividad:7,nombre:'Desayunar',hora:'07:00',codigoIcono:'bread',estado:'PENDIENTE'}]});
const tick=()=>new Promise(r=>setImmediate(r));
const styling={'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{StyleSheet:{create:v=>v},View:'View',Text:'Text',Pressable:'Pressable',useWindowDimensions:()=>({fontScale:1})},'@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes.light}};
function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);return n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];}

test('agenda contract preserves all real states, validates dates/time/zone and rejects unknown states or duplicate definitions',()=>{
 const raw=response();raw.actividades.push({...raw.actividades[0],idActividad:8,estado:'EN_PROGRESO'},{...raw.actividades[0],idActividad:9,estado:'COMPLETADA'});
 assert.deepEqual(utils.parseUserAgenda(raw),raw);assert.equal(utils.formatAgendaDate(raw.fecha),'Sábado, 24 de octubre');
 assert.deepEqual(raw.actividades.map(a=>utils.agendaStatusLabel(a.estado)),['pendiente','en progreso','completada']);
 for(const bad of [{...response(),fecha:'2026-02-30'},{...response(),zonaHoraria:'invalid/zone'},{...response(),actualizarEnSegundos:0},
  {...response(),actividades:[{...response().actividades[0],estado:'HECHA'}]}, {...response(),actividades:[response().actividades[0],response().actividades[0]]}])assert.throws(()=>utils.parseUserAgenda(bad));
 assert.deepEqual(utils.parseUserAgenda({...response(),actividades:[]}).actividades,[]);
 assert.equal(utils.parseUserAgenda({...response(),actividades:[{...response().actividades[0],codigoIcono:'unknown-icon'}]}).actividades[0].codigoIcono,'unknown-icon');
});

test('agenda transport only calls the Usuario private endpoint, passes cancellation and never substitutes errors with an empty agenda',async()=>{
 const calls=[];let fail=false;
 const api=load('services/user-agenda.ts',{'./device-access':{createUserHttpClient:()=>({get:async(...args)=>{calls.push(args);if(fail)throw new Error('network');return {data:response()};}})},'@/utils/user-agenda':utils,'@/utils/user-activity':detailUtils});
 const controller=new AbortController();assert.equal((await api.getUserAgenda(controller.signal)).perfil.idPerfilUsuario,12);
 assert.deepEqual(calls,[['/api/usuario/agenda',{signal:controller.signal}]]);fail=true;await assert.rejects(api.getUserAgenda(controller.signal));
});

test('user navigation contains only Agenda and disabled Apoyo and shares caregiver visual primitives',()=>{
 const bottom=load('components/bottom-navigation.tsx',styling).BottomNavigation;let destination;
 const bar=load('components/user/area-navigation.tsx',{...styling,'expo-router':{router:{dismissTo:v=>{destination=v;}}},'@/components/bottom-navigation':{BottomNavigation:bottom},'@/components/carer/area-icon':{AreaIcon:'Icon'}}).UserAreaNavigation;
 const tree=bar();const tabs=nodes(tree.type(tree.props)).filter(n=>n.props?.accessibilityRole==='tab');
 assert.deepEqual(tabs.map(n=>n.props.accessibilityLabel),['Agenda','Apoyo']);assert.equal(tabs[0].props.accessibilityState.selected,true);
 assert.equal(tabs[1].props.disabled,true);assert.equal(tabs[1].props.onPress,undefined);tabs[0].props.onPress();assert.equal(destination,'/mi-agenda');
});

test('agenda card status is informative, with safe missing-icon fallback and no completion callback or checkbox',()=>{
 const card=load('components/carer/activity-summary-card.tsx',{...styling,'react':{useState:v=>[v,()=>{}]},'expo-image':{Image:'Image'},
  '@/constants/activity-icons':{resolveActivityIcon:()=>null},'@/utils/activity-draft':{formatActivityTime:()=> '7:00 a.m.'},
  '@/utils/activity-icon-surface':{getActivityIconSurface:()=> 'surface'},'./account-layout':{accountStyles:{}},'./area-icon':{AreaIcon:'Icon'}}).ActivitySummaryCard;
 for(const status of ['pendiente','en progreso','completada']){
  const tree=card({activity:response().actividades[0],index:0,status});assert.equal(tree.props.accessibilityLabel,'Desayunar, 7:00 a.m., '+status);
  assert.ok(!nodes(tree).some(n=>n.props?.onPress||n.props?.accessibilityRole==='checkbox'));
  assert.ok(nodes(tree).some(n=>n.type==='Icon'&&n.props.name==='steps'));
 }
});

test('agenda reloads on focus, midnight and foreground, ignores old responses and cleans timers/requests on blur',async()=>{
 let focus,app,removed=false,cleaned,state;const requests=[],timers=new Map();let timerId=0;
 const oldSet=global.setTimeout,oldClear=global.clearTimeout;
 global.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};global.clearTimeout=id=>timers.delete(id);
 try{
  const hook=load('hooks/use-user-agenda.ts',{'react':{useCallback:f=>f,useRef:v=>({current:v}),useState:v=>{state=v;return[v,s=>{state=s;}];}},
   'expo-router':{useFocusEffect:fn=>{focus=fn;}},'react-native':{AppState:{addEventListener:(_,fn)=>{app=fn;return{remove:()=>{removed=true;}};}}},
   '@/services/user-agenda':{getUserAgenda:signal=>new Promise((resolve,reject)=>requests.push({signal,resolve,reject}))}}).useUserAgenda;
  const form=hook();cleaned=focus();assert.equal(state.status,'loading');assert.equal(requests.length,1);
  requests[0].resolve(response());await tick();assert.equal(state.status,'ready');assert.ok([...timers.values()].some(t=>t.ms<=60_000&&t.ms>0));
  [...timers.values()][0].fn();assert.equal(state.status,'loading');assert.equal(requests.length,2);
  form.reload();assert.ok(requests[1].signal.aborted);requests[1].resolve(response());await tick();assert.equal(state.status,'loading');
  requests[2].reject(new Error('network'));await tick();assert.equal(state.status,'error');
  app('background');app('active');assert.equal(requests.length,4);
  cleaned();assert.ok(removed);assert.ok(requests[3].signal.aborted);assert.equal(timers.size,0);
  requests[3].resolve(response());await tick();assert.equal(state.status,'loading');
 }finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}
});

test('agenda screen renders loading/empty/error truthfully and local exit requires confirmation',async()=>{
 let access={status:'linked',stage:'ready',profile},agendaState={status:'loading'},slot=0;const slots=[],refs=[],routes=[],pauses=[],details=[];let reloads=0;
 const React={useState:initial=>{const key=slot++;if(!(key in slots))slots[key]=initial;return[slots[key],v=>{slots[key]=v;}];},useRef:value=>{const key=slot++;refs[key]??={current:value};return refs[key];}};
 const screen=load('app/(usuario-autenticado)/mi-agenda.tsx',{...styling,'react':React,'expo-router':{Redirect:'Redirect',router:{replace:v=>routes.push(v),push:v=>details.push(v)}},
  'react-native':{...styling['react-native'],ActivityIndicator:'Spinner',FlatList:'List'},'@/context/device-access':{useDeviceAccess:()=>access},
  '@/services/device-access':{deviceAccess:{logout:async value=>{pauses.push(value);}}},'@/hooks/use-user-agenda':{useUserAgenda:()=>({state:agendaState,reload:()=>reloads++})},
  '@/components/carer/activity-summary-card':{ActivitySummaryCard:'ActivityCard'},'@/components/carer/continue-button':{ContinueButton:'Button'},
  '@/components/carer/activity-dialog':{ActivityDialog:'Dialog'},'@/components/carer/step-dialog-actions':{StepDialogActions:'Actions'},
  '@/components/carer/profile-avatar':{ProfileAvatar:'Avatar'},'@/components/carer/area-icon':{AreaIcon:'Icon'},
  '@/components/user/connection-progress':{ConnectionCalendar:'Calendar'},'@/utils/user-agenda':utils,'@/utils/user-activity':detailUtils}).default;
 const render=()=>{slot=0;const outer=screen();return typeof outer.type==='function'?outer.type(outer.props):outer;};
 let tree=render(),list=nodes(tree).find(n=>n.type==='List');assert.deepEqual(list.props.data,[]);assert.ok(nodes(list.props.ListEmptyComponent).some(n=>n.type==='Spinner'));
 agendaState={status:'error'};tree=render();list=nodes(tree).find(n=>n.type==='List');assert.ok(!nodes(list.props.ListEmptyComponent).some(n=>n.type==='Calendar'));
 nodes(list.props.ListEmptyComponent).find(n=>n.type==='Button').props.onPress();assert.equal(reloads,1);
 agendaState={status:'ready',agenda:{...response(),actividades:[]}};tree=render();list=nodes(tree).find(n=>n.type==='List');assert.ok(nodes(list.props.ListEmptyComponent).some(n=>n.type==='Calendar'));
 agendaState={status:'ready',agenda:response()};tree=render();list=nodes(tree).find(n=>n.type==='List');assert.equal(list.props.data.length,1);assert.equal(list.props.renderItem({item:list.props.data[0],index:0}).props.status,'pendiente');
 list.props.renderItem({item:list.props.data[0],index:0}).props.onPress();assert.deepEqual(details,[detailUtils.userActivityHref(7)]);
 nodes(tree).find(n=>n.props?.accessibilityLabel==='Opciones de Mi agenda').props.onPress();tree=render();
 nodes(tree).find(n=>n.type==='Button'&&n.props.label==='Salir del perfil').props.onPress();tree=render();
 let actions=nodes(tree).find(n=>n.type==='Actions');assert.equal(pauses.length,0);actions.props.onCancel();tree=render();assert.ok(!nodes(tree).some(n=>n.type==='Actions'));
 nodes(tree).find(n=>n.props?.accessibilityLabel==='Opciones de Mi agenda').props.onPress();tree=render();nodes(tree).find(n=>n.type==='Button').props.onPress();tree=render();
 actions=nodes(tree).find(n=>n.type==='Actions');actions.props.onConfirm();actions.props.onConfirm();await tick();assert.deepEqual(pauses,[true]);assert.deepEqual(routes,['/usuario']);
 access={status:'unlinked'};assert.equal(render().props.href,'/');
});

const flatten=style=>Object.assign({},...(Array.isArray(style)?style.flat(Infinity):[style]).filter(Boolean));
test('agenda palette cycles by position; integrated cards use family tokens and informative white checks in both themes',()=>{
 const surfaces=load('utils/activity-icon-surface.ts',{'@/theme/tokens':tokens});
 const families=[tokens.colors.yellow,tokens.colors.green,tokens.colors.orange,tokens.colors.blue,tokens.colors.purple];
 let theme=tokens.themes.light;
 const card=load('components/carer/activity-summary-card.tsx',{...styling,'@/theme/use-theme':{useAppTheme:()=>theme},
  react:{useState:v=>[v,()=>{}]},'expo-image':{Image:'Image'},'@/constants/activity-icons':{resolveActivityIcon:()=> 'local-3d'},
  '@/utils/activity-draft':{formatActivityTime:()=> '7:00 a.m.'},'@/utils/activity-icon-surface':surfaces,
  './account-layout':{accountStyles:{}},'./area-icon':{AreaIcon:'Icon'}}).ActivitySummaryCard;
 for(let index=0;index<10;index++){
  const family=families[index%5];
  const tree=card({activity:response().actividades[0],index,status:'completada',appearance:'agenda'});
  assert.equal(flatten(tree.props.style).backgroundColor,family.light);assert.equal(flatten(tree.props.style).borderColor,family.stroke);
  const hidden=nodes(tree).filter(n=>n.props?.importantForAccessibility==='no-hide-descendants');
  const icon=flatten(hidden[0].props.style),state=flatten(hidden[1].props.style);
  assert.equal(icon.backgroundColor,family.hover||family.hoverLight);assert.equal(icon.borderColor,family.stroke);assert.equal(icon.borderRadius,0);
  assert.equal(icon.height,'auto');assert.equal(icon.alignSelf,'stretch');assert.equal(state.backgroundColor,family.default);
  assert.equal(nodes(tree).find(n=>n.type==='Icon'&&n.props.name==='check').props.color,tokens.colors.background.primary);
  assert.equal(nodes(tree).find(n=>n.type==='Image').props.contentFit,'contain');assert.ok(!nodes(tree).some(n=>n.props?.onPress));
 }
 for(const status of ['pendiente','en progreso']){
  const tree=card({activity:response().actividades[0],index:0,status,appearance:'agenda'});
  const state=flatten(nodes(tree).filter(n=>n.props?.importantForAccessibility==='no-hide-descendants')[1].props.style);
  assert.equal(state.borderColor,tokens.colors.text.disabled);assert.equal(state.backgroundColor,'transparent');
  assert.equal(nodes(tree).filter(n=>n.type==='Icon'&&n.props.name==='check').length,0);
 }
 theme=tokens.themes.dark;
 const dark=card({activity:response().actividades[0],index:2,status:'completada',appearance:'agenda'});
 assert.equal(flatten(dark.props.style).backgroundColor,theme.colors.surface.default);assert.equal(flatten(dark.props.style).borderColor,theme.colors.border.decorative);
 const darkIcon=nodes(dark).find(n=>n.props?.importantForAccessibility==='no-hide-descendants');assert.equal(flatten(darkIcon.props.style).backgroundColor,theme.colors.surface.elevated);
 const original=card({activity:response().actividades[0],index:0});
 assert.equal(flatten(original.props.style).padding,tokens.spacing.lg);assert.equal(flatten(original.props.style).elevation,tokens.shadows.card.elevation);
});

test('compact user navigation expands for large text, preserves disabled Apoyo and leaves caregiver width unchanged',()=>{
 let scale=1;
 const bottom=load('components/bottom-navigation.tsx',{...styling,'react-native':{...styling['react-native'],useWindowDimensions:()=>({fontScale:scale})}}).BottomNavigation;
 const items=[{id:'agenda',label:'Agenda',selected:true,onPress:()=>{},icon:()=>null},{id:'support',label:'Apoyo',selected:false,icon:()=>null}];
 let tree=bottom({items,appearance:'user'});assert.equal(flatten(tree.props.style).maxWidth,tokens.layout.userAgenda.navigationMaxWidth);
 let support=nodes(tree).find(n=>n.props?.accessibilityLabel==='Apoyo');assert.equal(support.props.disabled,true);
 assert.equal(flatten(nodes(support).find(n=>n.type==='Text').props.style).color,tokens.themes.light.colors.text.secondary);
 scale=2;tree=bottom({items,appearance:'user'});assert.equal(flatten(tree.props.style).maxWidth,tokens.layout.contentMaxWidth);
 scale=1;tree=bottom({items});assert.equal(flatten(tree.props.style).maxWidth,tokens.layout.contentMaxWidth);
 support=nodes(tree).find(n=>n.props?.accessibilityLabel==='Apoyo');assert.equal(flatten(nodes(support).find(n=>n.type==='Text').props.style).color,tokens.themes.light.colors.text.disabled);
});
