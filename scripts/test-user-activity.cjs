const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}){const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{if(id==='./content-speech-control')return {ContentSpeechControl:'SpeechControl'};if(id==='@/hooks/use-content-speech')return {useContentSpeech:()=>({enabled:true,speaking:false,error:false,repeat(){}})};if(id==='@/services/step-speech')return load('services/step-speech.ts');if(id==='react'&&!modules[id])return {};if(id==='@/context/device-access')return {};if(id==='@/services/device-access')return {};if(id==='@/context/user-accessibility')return {};if(id==='@/components/app-text')return {AppText:'Text'};if(id==='@/theme/profile-appearance')return modules[id]||{useProfileAppearance:()=>null,useEffectiveFontScale:()=>modules['react-native']?.useWindowDimensions?.().fontScale??1};assert.ok(id in modules,'Missing adapter '+id);return modules[id];},out);return out;}
const tokens=load('theme/tokens.ts'),activities=load('utils/activities.ts');
const agenda=load('utils/user-agenda.ts',{'./activities':activities,'./profiles':{parseProfile:v=>v}});
const utils=load('utils/user-activity.ts',{'./activities':activities,'./user-agenda':agenda});
const {DeviceFailure}=load('services/device-access-manager.ts',{'@/utils/user-link':{}});
const response=()=>({fecha:'2026-10-24',zonaHoraria:'America/Lima',actualizarEnSegundos:60,actividad:{idActividad:7,nombre:'Actividad real',hora:'07:00',codigoIcono:'bread',estado:'PENDIENTE',guiaInicialCompletada:false}});
const tick=()=>new Promise(r=>setImmediate(r));
const styling={'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'Scroll',ActivityIndicator:'Spinner',StyleSheet:{create:v=>v},useWindowDimensions:()=>({width:390,fontScale:1})},'@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes.light}};
function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);return n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];}
function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);}

test('detail validates the real minimal contract and eligibility never depends on another activity or current progress alone',()=>{
 for(const estado of ['PENDIENTE','EN_PROGRESO','COMPLETADA'])for(const guiaInicialCompletada of [false,true]){
  const raw=response();Object.assign(raw.actividad,{estado,guiaInicialCompletada});
  assert.deepEqual(utils.parseUserActivityDetail(raw),raw);
  assert.equal(utils.eligibleForDirectCompletion(raw.actividad),guiaInicialCompletada&&estado!=='COMPLETADA');
 }
 for(const mutate of [v=>delete v.actividad.guiaInicialCompletada,v=>v.actividad.guiaInicialCompletada='true',v=>v.actividad.estado='PENDING',v=>v.actividad.hora='25:00',v=>v.actividad.idActividad=0,v=>v.fecha='2026-02-30',v=>v.actualizarEnSegundos=0]){
  const raw=response();mutate(raw);assert.throws(()=>utils.parseUserActivityDetail(raw));
 }
 assert.equal(utils.validActivityId('7'),7);for(const id of [undefined,['7'],'0','-1','2147483648','7/other'])assert.equal(utils.validActivityId(id),undefined);
 assert.deepEqual(utils.userActivityHref(7),{pathname:'/actividades/[idActividad]',params:{idActividad:'7'}});
});

test('detail uses the existing private client with only the activity ID and cancellation; mismatched responses are never displayed',async()=>{
 const calls=[];let raw=response();
 const api=load('services/user-agenda.ts',{'./device-access':{createUserHttpClient:()=>({get:async(...args)=>{calls.push(args);return{data:raw};}})},'@/utils/user-agenda':agenda,'@/utils/user-activity':utils});
 const signal=new AbortController().signal;assert.deepEqual(await api.getUserActivityDetail(7,signal),raw);
 assert.deepEqual(calls,[['/api/usuario/actividades/7',{signal}]]);
 raw={...response(),actividad:{...response().actividad,idActividad:8}};await assert.rejects(api.getUserActivityDetail(7,signal));
});

test('only the agenda card becomes one accessible button; its state circle has no independent action',()=>{
 const surfaces=load('utils/activity-icon-surface.ts',{'@/theme/tokens':tokens});let opens=0;
 const card=load('components/carer/activity-summary-card.tsx',{...styling,react:{useState:v=>[v,()=>{}]},'expo-image':{Image:'Image'},'@/constants/activity-icons':{resolveActivityIcon:()=>null},
 '@/utils/activity-draft':{formatActivityTime:()=> '7:00 a.m.'},'@/utils/activity-icon-surface':surfaces,'./account-layout':{accountStyles:{}},'./area-icon':{AreaIcon:'Icon'}}).ActivitySummaryCard;
 const tree=card({activity:response().actividad,index:0,status:'pendiente',appearance:'agenda',onPress:()=>opens++});
 assert.equal(tree.type,'Pressable');assert.equal(tree.props.accessibilityRole,'button');assert.equal(tree.props.accessibilityLabel,'Actividad real, 7:00 a.m., pendiente');
 assert.equal(nodes(tree).filter(n=>n.props?.onPress).length,1);tree.props.onPress();assert.equal(opens,1);
 assert.equal(card({activity:response().actividad,index:0}).type,'View');
});

test('detail hides direct completion until the first guide and stays disabled without action callbacks',()=>{
 for(const theme of [tokens.themes.light,tokens.themes.dark]){
 const content=load('components/user/activity-detail.tsx',{...styling,react:{useState:v=>[v,()=>{}],useRef:v=>({current:v}),useLayoutEffect:fn=>fn()},'expo-image':{Image:'Image'},'@/theme/use-theme':{useAppTheme:()=>theme},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},'@/constants/activity-icons':{resolveActivityIcon:()=>null},
  '@/utils/activity-draft':{formatActivityTime:()=> '7:00 a.m.'},'@/utils/user-agenda':agenda,'@/utils/user-activity':utils}).UserActivityDetailContent;
 for(const estado of ['PENDIENTE','EN_PROGRESO','COMPLETADA'])for(const guiaInicialCompletada of [false,true]){
  const raw=response();Object.assign(raw.actividad,{estado,guiaInicialCompletada});const tree=content({detail:raw});
  const buttons=nodes(tree).filter(n=>n.type==='Button');assert.deepEqual(buttons.map(n=>n.props.label),guiaInicialCompletada&&estado!=='COMPLETADA'?['Ver paso a paso','Ya lo hice']:['Ver paso a paso']);
  assert.ok(buttons.every(n=>n.props.disabled===true&&n.props.onPress===undefined));assert.ok(!nodes(tree).some(n=>n.props?.onPress));
  assert.ok(text(tree).includes('Es hora de Actividad real'));assert.ok(text(tree).includes('Sábado, 24 de octubre'));
  assert.equal(text(tree).includes('Recorre los pasos para completar esta actividad.'),!guiaInicialCompletada&&estado!=='COMPLETADA');
  assert.equal(text(tree).split('Recorre los pasos para completar esta actividad.').length-1,!guiaInicialCompletada&&estado!=='COMPLETADA'?1:0);
  assert.equal(text(tree).includes('Puedes seguir los pasos de esta actividad o marcarla como completa.'),guiaInicialCompletada&&estado!=='COMPLETADA');
  const active=content({detail:raw,onStart:()=>{},onDirect:()=>{},busy:true});
  const primary=nodes(active).find(n=>n.type==='Button');assert.equal(primary.props.disabled,false);assert.equal(primary.props.busy,true);assert.equal(primary.props.appearance,'solid-purple');
  assert.equal(primary.props.leadingIcon.props.color,tokens.colors.background.primary);
  if(estado==='COMPLETADA'){assert.ok(text(tree).includes('¿Quieres recordar los pasos?'));assert.equal(text(tree).split('Actividad completada').length-1,1);}
  if(estado==='EN_PROGRESO')assert.ok(text(tree).includes('En progreso'));if(estado==='COMPLETADA')assert.ok(text(tree).includes('Actividad completada'));
 }
 }
});

test('detail route handles loading, unavailable and recoverable errors, and Back consistently returns to Mi agenda',()=>{
 let state={status:'loading'},param='7',seen=[],routes=[],retries=0;
 const screen=load('app/(usuario-autenticado)/actividades/[idActividad].tsx',{...styling,react:{useState:v=>[v,()=>{}]},'@/components/user/execution-success':{ExecutionSuccess:'Success'},'@/hooks/use-execution-action':{useExecutionAction:()=>({busy:false,blocked:false,run:()=>{}})},'@/services/user-execution':{},'@/utils/user-execution':{},'expo-router':{router:{dismissTo:v=>routes.push(v)},useLocalSearchParams:()=>({idActividad:param})},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},'@/components/user/activity-detail':{UserActivityDetailContent:'Detail'},
  '@/hooks/use-user-activity':{useUserActivity:id=>{seen.push(id);return{state,reload:()=>retries++};}},'@/utils/user-activity':utils}).default;
 let tree=screen();assert.ok(nodes(tree).some(n=>n.type==='Spinner'));assert.ok(!nodes(tree).some(n=>n.type==='Detail'));
 state={status:'not-found'};tree=screen();nodes(tree).find(n=>n.type==='Button').props.onPress();assert.deepEqual(routes,['/mi-agenda']);
 state={status:'error'};tree=screen();nodes(tree).find(n=>n.type==='Button').props.onPress();assert.equal(retries,1);
 state={status:'ready',detail:response()};tree=screen();assert.deepEqual(nodes(tree).find(n=>n.type==='Detail').props.detail,response());
 nodes(tree).find(n=>n.props?.accessibilityLabel==='Volver a Mi agenda').props.onPress();assert.deepEqual(routes,['/mi-agenda','/mi-agenda']);
 param='bad';screen();assert.equal(seen.at(-1),undefined);
});

test('detail query differentiates not-found, rechecks on day change/foreground and ignores canceled responses across IDs',async()=>{
 let focus,app,state;const requests=[],timers=new Map();let timerId=0;
 const oldSet=global.setTimeout,oldClear=global.clearTimeout;
 global.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};global.clearTimeout=id=>timers.delete(id);
 try{
  const hook=load('hooks/use-user-activity.ts',{'react':{useCallback:f=>f,useRef:v=>({current:v}),useState:v=>{state=v;return[v,s=>{state=s;}];}},'expo-router':{useFocusEffect:fn=>{focus=fn;}},
   'react-native':{AppState:{addEventListener:(_,fn)=>{app=fn;return{remove:()=>{}};}}},'@/services/device-access-manager':{DeviceFailure},
   '@/services/user-agenda':{getUserActivityDetail:(id,signal)=>new Promise((resolve,reject)=>requests.push({id,signal,resolve,reject}))}}).useUserActivity;
  hook(undefined);focus();assert.equal(state.status,'not-found');assert.equal(requests.length,0);
  const form=hook(7),blur=focus();assert.equal(state.status,'loading');requests[0].reject(new DeviceFailure('not-found'));await tick();assert.equal(state.status,'not-found');
  form.reload();requests[1].reject(new DeviceFailure('network'));await tick();assert.equal(state.status,'error');
  form.reload();requests[2].resolve(response());await tick();assert.equal(state.status,'ready');assert.equal(timers.size,1);
  [...timers.values()][0].fn();assert.equal(state.status,'loading');assert.equal(requests.length,4);
  app('background');assert.ok(requests[3].signal.aborted);app('active');assert.equal(requests.length,5);
  blur();assert.ok(requests[4].signal.aborted);assert.equal(timers.size,0);
  hook(8);const blur8=focus();assert.equal(requests.at(-1).id,8);requests[4].resolve(response());await tick();assert.equal(state.status,'loading');
  blur8();
 }finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}
});

test('Usuario stack anchors deep links at Mi agenda and Android back pops the detail to that anchor',()=>{
 const layout=load('app/(usuario-autenticado)/_layout.tsx',{...styling,'expo-status-bar':{StatusBar:'StatusBar'},'expo-router':{Stack:'Stack'},'react-native-safe-area-context':{SafeAreaView:'SafeArea'},'@/components/user/area-navigation':{UserAreaNavigation:'Navigation'}});
 assert.equal(layout.unstable_settings.anchor,'mi-agenda');
 const expoRoot=path.dirname(require.resolve('expo-router/package.json'));
 const context=()=>({default:()=>null,unstable_settings:layout.unstable_settings});
 context.keys=()=>['./_layout.tsx','./mi-agenda.tsx','./actividades/[idActividad].tsx'];
 const manifest=require(path.join(expoRoot,'build/getRoutesCore.js')).getRoutes(context,{platform:'android',importMode:'sync'});
 assert.equal(manifest.initialRouteName,'mi-agenda');
 const {StackRouter}=require(path.join(expoRoot,'build/react-navigation/routers/StackRouter.js'));
 const stack=StackRouter({initialRouteName:manifest.initialRouteName}),options={routeNames:['mi-agenda','actividades/[idActividad]'],routeParamList:{},routeGetIdList:{}};
 let state=stack.getInitialState(options);state=stack.getStateForAction(state,{type:'PUSH',payload:{name:'actividades/[idActividad]',params:{idActividad:'7'}}},options);
 assert.equal(state.routes[state.index].name,'actividades/[idActividad]');state=stack.getStateForAction(state,{type:'GO_BACK'},options);assert.equal(state.routes[state.index].name,'mi-agenda');
});

test('metadata adapts to native text measurements, stays stable after stacking and rechecks width, text scale and values',()=>{
 let cursor=0,fontScale=1,windowWidth=390,raw=response(),effects=[];const slots=[];
 const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
  useRef:initial=>{const i=cursor++;slots[i]??={current:initial};return slots[i];},useLayoutEffect:fn=>effects.push(fn)};
 const component=load('components/user/activity-detail.tsx',{...styling,react,'expo-image':{Image:'Image'},
  'react-native':{...styling['react-native'],useWindowDimensions:()=>({width:windowWidth,fontScale})},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},'@/constants/activity-icons':{resolveActivityIcon:()=>null},
  '@/utils/activity-draft':{formatActivityTime:minutes=>`${Math.floor(minutes/60)}:00 a. m.`},'@/utils/user-agenda':agenda,'@/utils/user-activity':utils}).UserActivityDetailContent;
 const flatten=styles=>Object.assign({},...styles.flat(Infinity).filter(Boolean));
 const render=()=>{cursor=0;effects=[];const tree=component({detail:raw});effects.forEach(fn=>fn());return tree;};
 const metadata=tree=>nodes(tree).find(n=>n.type==='View'&&n.props.onLayout);
 const values=tree=>nodes(tree).filter(n=>n.type==='Text'&&n.props.onTextLayout);
 const lines=(node,count)=>node.props.onTextLayout({nativeEvent:{lines:Array.from({length:count},()=>({}))}});
 const width=(tree,value)=>metadata(tree).props.onLayout({nativeEvent:{layout:{width:value,height:80}}});
 const direction=tree=>flatten(metadata(tree).props.style).flexDirection;
 let tree=render();width(tree,350);tree=render();assert.equal(direction(tree),'row');
 const oldTime=values(tree)[0];lines(values(tree)[0],1);lines(values(tree)[1],2);tree=render();assert.equal(direction(tree),'row');
 lines(values(tree)[1],3);tree=render();assert.equal(direction(tree),'column');
 lines(values(tree)[1],1);width(tree,350);tree=render();assert.equal(direction(tree),'column'); // No oscillation when text fits vertically.
 const separators=nodes(tree).filter(n=>n.props?.importantForAccessibility==='no-hide-descendants');
 const separator=separators.find(n=>flatten(n.props.style).height===tokens.borders.default);assert.ok(separator);
 width(tree,470);tree=render();assert.equal(direction(tree),'row');
 lines(oldTime,2);tree=render();assert.equal(direction(tree),'row'); // Ignore an event from the old width.
 fontScale=2;tree=render();assert.equal(direction(tree),'row');lines(values(tree)[0],2);tree=render();assert.equal(direction(tree),'column');
 fontScale=1;tree=render();assert.equal(direction(tree),'row');
 windowWidth=280;tree=render();assert.equal(direction(tree),'row'); // Available card space, not handset category, determines layout.
 lines(values(tree)[1],3);tree=render();assert.equal(direction(tree),'column');
 raw={...raw,fecha:'2026-10-25'};tree=render();assert.equal(direction(tree),'row');
 lines(values(tree)[1],3);tree=render();assert.equal(direction(tree),'column');
 raw={...raw,actividad:{...raw.actividad,hora:'08:00'}};tree=render();assert.equal(direction(tree),'row');
 const dateBlock=nodes(tree).find(n=>n.type==='View'&&n.props.onLayout&&n!==metadata(tree));
 dateBlock.props.onLayout({nativeEvent:{layout:{width:0}}});tree=render();assert.equal(direction(tree),'column');
 for(const value of values(tree)){
  const style=flatten(value.props.style);assert.equal(style.fontFamily,tokens.typography.family.semibold);assert.equal(style.fontSize,tokens.typography.size.md);
  assert.equal(value.props.numberOfLines,undefined);assert.equal(value.props.ellipsizeMode,undefined);assert.equal(value.props.adjustsFontSizeToFit,undefined);assert.equal(value.props.allowFontScaling,undefined);
 }
 assert.ok(text(tree).includes('Recorre los pasos para completar esta actividad.'));
 const reading=nodes(tree).find(n=>n.type==='Text'&&text(n).startsWith('Es hora de'));
 assert.equal(flatten(reading.props.style).fontFamily,tokens.typography.family.semibold);
});
