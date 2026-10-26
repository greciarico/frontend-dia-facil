const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}){const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{if(id.startsWith('@/assets/'))return id;assert.ok(id in modules,'Missing adapter '+id);return modules[id];},out);return out;}
const tokens=load('theme/tokens.ts'),draft=load('utils/activity-draft.ts'),activities=load('utils/activities.ts');
const agenda=load('utils/user-agenda.ts',{'./activities':activities,'./profiles':{parseProfile:v=>v}});
const activityUtils=load('utils/user-activity.ts',{'./activities':activities,'./user-agenda':agenda});
const utils=load('utils/user-execution.ts',{'./user-agenda':agenda,'./activity-draft':draft});
const {DeviceFailure}=load('services/device-access-manager.ts',{'@/utils/user-link':{}});
const tick=()=>new Promise(r=>setImmediate(r));
function guide(reached=1,total=5,initial=false){return{fecha:'2026-10-24',zonaHoraria:'America/Lima',actualizarEnSegundos:60,vigente:true,idEjecucion:3,estado:'EN_PROGRESO',modoFinalizacion:null,actividad:{idActividad:7,nombre:'Actividad real',guiaInicialCompletada:initial},pasos:Array.from({length:total},(_,i)=>({idPasoActividad:i+1,posicion:i+1,descripcion:'Paso real '+(i+1),pictograma:null,alcanzado:i<reached,completado:i<reached-1}))};}
function completed(reached=5,total=5,mode='GUIADA'){const g=guide(reached,total,true);g.estado='COMPLETADA';g.modoFinalizacion=mode;if(reached===total)g.pasos.forEach(p=>p.completado=true);return g;}
function fixture(){let remote=guide();const calls=[];const client={get:async(...args)=>{calls.push(['GET',...args]);return{data:remote};},post:async(...args)=>{calls.push(['POST',...args]);return{data:remote};},put:async(...args)=>{calls.push(['PUT',...args]);return{data:remote};}};
 const api=load('services/user-execution.ts',{'./device-access':{createUserHttpClient:()=>client},'./device-access-manager':{DeviceFailure},'@/utils/user-execution':utils});return{api,client,calls,set:v=>{remote=v;}};}
const styling={'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{StyleSheet:{create:v=>v},View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'Scroll',ActivityIndicator:'Spinner',FlatList:'List',useWindowDimensions:()=>({width:390,fontScale:1})},'@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes.light}};
function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);return n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];}
function text(n){if(Array.isArray(n))return n.map(text).join('');return n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);}

test('guide validates a reached prefix, dynamic totals, pending/direct-completed snapshots and real ARASAAC identity',()=>{
 for(const n of [1,5,12]){const g=guide(n,n);assert.deepEqual(utils.parseGuide(g),g);assert.equal(utils.reachedFrontier(g),n-1);}
 const g=guide(1);g.pasos[0].pictograma={idPictograma:2,nombre:'enjabonar las manos',fuente:'ARASAAC',idArasaac:2443,urlImagen:'https://static.arasaac.org/pictograms/2443/2443_300.png'};
 assert.equal(utils.parseGuide(g).pasos[0].pictograma.idArasaac,2443);
 const pending=guide(0);pending.estado='PENDIENTE';pending.idEjecucion=null;assert.equal(utils.parseGuide(pending).estado,'PENDIENTE');
 assert.equal(utils.reachedFrontier(utils.parseGuide(completed(0,5,'DIRECTA'))),-1);
 for(const change of [g=>g.pasos[2].alcanzado=true,g=>g.pasos[2].completado=true,g=>g.pasos[1].posicion=1,g=>g.pasos[0].descripcion='',g=>g.pasos=[],g=>g.modoFinalizacion='GUIADA',g=>g.idEjecucion=null]){const bad=guide();change(bad);assert.throws(()=>utils.parseGuide(bad));}
});

test('lost start/advance responses recover by GET exactly once without replaying a write',async()=>{
 const f=fixture();let posts=0,puts=0;
 f.client.post=async()=>{posts++;throw new DeviceFailure('network');};
 const started=await f.api.startGuideOperation(7,'2026-10-24').write();assert.equal(started.idEjecucion,3);assert.equal(posts,1);
 f.set(guide(2));f.client.put=async()=>{puts++;throw new DeviceFailure('network');};
 const advanced=await f.api.advanceOperation(7,3,1,'2026-10-24').write();assert.equal(utils.reachedFrontier(advanced),1);assert.equal(puts,1);
 assert.equal(f.calls.filter(c=>c[0]==='GET').length,2);assert.ok(f.calls.at(-1)[1].endsWith('/ejecuciones/3'));
});

test('failed recovery stays uncertain; explicit recovery only reads and an unconfirmed effect retains the real snapshot',async()=>{
 const f=fixture();let writes=0,reads=0;
 f.client.post=async()=>{writes++;throw new DeviceFailure('network');};f.client.get=async()=>{reads++;throw new DeviceFailure('network');};
 const op=f.api.finishDirectOperation(7,'2026-10-24');await assert.rejects(op.write(),e=>e instanceof f.api.UnconfirmedExecution&&!e.snapshot);assert.equal(writes,1);assert.equal(reads,1);
 f.client.get=async()=>({data:completed(0,5,'DIRECTA')});const done=await op.recover();assert.equal(done.modoFinalizacion,'DIRECTA');assert.equal(writes,1);
 f.client.get=async()=>({data:guide(1)});await assert.rejects(f.api.advanceOperation(7,3,1,'2026-10-24').recover(),e=>e.snapshot?.idEjecucion===3);
});

test('functional rejection is not retried; historical completion is recoverable while a new day cannot start implicitly',async()=>{
 const f=fixture();let reads=0;f.client.get=async()=>{reads++;return{data:guide()};};
 f.client.post=async()=>{throw new DeviceFailure('guide-conflict','GUIA_INICIAL_REQUERIDA');};
 await assert.rejects(f.api.finishDirectOperation(7,'2026-10-24').write(),e=>e.code==='GUIA_INICIAL_REQUERIDA');assert.equal(reads,0);
 const past=completed();past.vigente=false;f.client.get=async()=>({data:past});
 assert.equal((await f.api.finishGuideOperation(7,3,5,'2026-10-24').recover()).estado,'COMPLETADA');
 const tomorrow=guide(0);tomorrow.estado='PENDIENTE';tomorrow.idEjecucion=null;tomorrow.fecha='2026-10-25';f.client.get=async()=>({data:tomorrow});
 await assert.rejects(f.api.startGuideOperation(7,'2026-10-24').recover(),e=>e.code==='DIA_AGENDA_CAMBIADO');
});

test('command hook coalesces taps, blocks on unknown outcomes and ignores success after blur/unmount',async()=>{
 const f=fixture();let cleanup,blur;const states=[];
 const action=load('hooks/use-execution-action.ts',{'react':{useCallback:fn=>fn,useRef:v=>({current:v}),useState:v=>{const index=states.length;states.push(v);return[v,next=>{states[index]=next;}];},useEffect:fn=>{cleanup=fn();}},
  'expo-router':{useFocusEffect:fn=>{blur=fn();}},'@/services/device-access-manager':{DeviceFailure},'@/services/user-execution':f.api}).useExecutionAction();
 let resolve,writes=0,success=0;
 const op={write:()=>{writes++;return new Promise(r=>{resolve=r;});},recover:async()=>{throw new Error();}};
 const first=action.run(op,()=>success++);await action.run(op,()=>success++);assert.equal(writes,1);blur();resolve(guide());await first;assert.equal(success,0);cleanup();
 let focus,unmount;const values=[];
 const second=load('hooks/use-execution-action.ts',{'react':{useCallback:fn=>fn,useRef:v=>({current:v}),useState:v=>{const i=values.length;values.push(v);return[v,next=>{values[i]=next;}];},useEffect:fn=>{unmount=fn();}},
  'expo-router':{useFocusEffect:fn=>{focus=fn;}},'@/services/device-access-manager':{DeviceFailure},'@/services/user-execution':f.api}).useExecutionAction();focus();let gets=0;
 await second.run({write:async()=>{throw new f.api.UnconfirmedExecution();},recover:async()=>{gets++;return guide();}},()=>success++);
 assert.equal(values[2],true);second.retryRecovery();second.retryRecovery();await tick();assert.equal(gets,1);assert.equal(success,1);assert.equal(values[2],false);unmount();
});

test('step navigation enables only reached positions with stable IDs and a dynamic total',()=>{
 let selected;const navigation=load('components/user/guide-steps.tsx',{...styling,react:{useRef:v=>({current:v}),useEffect:()=>{}},'react-native':{...styling['react-native'],AccessibilityInfo:{announceForAccessibility:()=>{}}}}).GuideSteps;
 const g=guide(3,8),tree=navigation({steps:g.pasos,current:0,disabled:false,onSelect:id=>{selected=id;}});assert.ok(text(tree).includes('Paso 1 de 8'));
 const list=nodes(tree).find(n=>n.type==='List');const buttons=g.pasos.map((item,index)=>list.props.renderItem({item,index}));
 assert.deepEqual(buttons.map(b=>b.props.disabled),[false,false,false,true,true,true,true,true]);buttons[2].props.onPress();assert.equal(selected,3);
 assert.equal(buttons[0].props.accessibilityState.selected,true);
});

test('guide screen uses step pictograms and exposes initial-guide next/final plus confirmed early completion only afterwards',()=>{
 let cursor=0,model=guide();const slots=[],operations=[];
 const React={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=v;}];}};
 const ops={advanceOperation:(...args)=>({kind:'advance',args}),finishGuideOperation:(...args)=>({kind:'finish',args})};
 const query={get state(){return{status:'ready',guide:model};},apply:g=>{model=g;},reload:()=>{}};
 const screen=load('app/(usuario-autenticado)/actividades/guia/[idActividad].tsx',{...styling,react:React,'expo-router':{router:{dismissTo:()=>{}},useLocalSearchParams:()=>({idActividad:'7'})},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},'@/components/carer/activity-dialog':{ActivityDialog:'Dialog'},'@/components/carer/step-dialog-actions':{StepDialogActions:'Actions'},
  '@/components/carer/step-pictogram':{StepPictogramImage:'Pictogram'},'@/components/user/guide-steps':{GuideSteps:'Steps'},'@/components/user/execution-success':{ExecutionSuccess:'Success'},
  '@/hooks/use-user-guide':{useUserGuide:()=>query},'@/hooks/use-execution-action':{useExecutionAction:()=>({busy:false,blocked:false,run:(op,success)=>{operations.push({op,success});}})},
  '@/services/user-execution':ops,'@/utils/user-execution':utils,'@/utils/user-activity':activityUtils}).default;
 const render=()=>{cursor=0;return screen();};let tree=render();assert.equal(nodes(tree).filter(n=>n.type==='Pictogram').length,1);
 let buttons=nodes(tree).filter(n=>n.type==='Button');assert.deepEqual(buttons.map(b=>b.props.label),['Siguiente paso']);buttons[0].props.onPress();assert.equal(operations[0].op.kind,'advance');assert.equal(operations[0].op.args[2],1);
 operations[0].success(guide(3));tree=render();nodes(tree).find(n=>n.type==='Steps').props.onSelect(1);tree=render();assert.equal(nodes(tree).find(n=>n.type==='Steps').props.current,0);
 model=guide(5);nodes(tree).find(n=>n.type==='Steps').props.onSelect(5);tree=render();assert.deepEqual(nodes(tree).filter(n=>n.type==='Button').map(b=>b.props.label),['Finalizar actividad']);
 model=guide(2,5,true);nodes(tree).find(n=>n.type==='Steps').props.onSelect(2);tree=render();buttons=nodes(tree).filter(n=>n.type==='Button');assert.equal(buttons.length,2);buttons[1].props.onPress();tree=render();
 assert.ok(nodes(tree).some(n=>n.type==='Dialog'));assert.equal(operations.length,1);nodes(tree).find(n=>n.type==='Actions').props.onCancel();tree=render();assert.ok(!nodes(tree).some(n=>n.type==='Dialog'));
 nodes(tree).find(n=>n.type==='Button'&&n.props.label==='Finalizar actividad').props.onPress();tree=render();nodes(tree).find(n=>n.type==='Actions').props.onConfirm();
 assert.equal(operations.at(-1).op.kind,'finish');operations.at(-1).success({fecha:model.fecha,idEjecucion:3,estado:'COMPLETADA',modoFinalizacion:'GUIADA',actividad:model.actividad});assert.equal(render().type,'Success');
});

test('success uses the linked profile and both native Back and its button return to the real agenda',()=>{
 let hardware,cleanup;const destinations=[];
 const component=load('components/user/execution-success.tsx',{...styling,
  react:{useCallback:fn=>fn},'expo-image':{Image:'Image'},
  'react-native':{...styling['react-native'],BackHandler:{addEventListener:(event,fn)=>{assert.equal(event,'hardwareBackPress');hardware=fn;return{remove:()=>{cleanup=true;}};}}},
  'expo-router':{router:{dismissTo:href=>destinations.push(href)},useFocusEffect:fn=>{cleanup=fn();}},
  '@/components/carer/continue-button':{ContinueButton:'Button'},'@/context/device-access':{useDeviceAccess:()=>({profile:{nombre:'Nombre vinculado'}})},
  '@/components/user/celebration-picture':{CelebrationPicture:'Celebration'}}).ExecutionSuccess;
 const tree=component({result:{fecha:'2026-10-24',idEjecucion:3,estado:'COMPLETADA',modoFinalizacion:'GUIADA',actividad:guide().actividad}});
 assert.ok(text(tree).includes('Nombre vinculado'));assert.ok(text(tree).includes('Actividad real'));
 assert.ok(!text(tree).includes('octubre'));assert.ok(!text(tree).includes('2026-10-24'));
 const name=nodes(tree).find(n=>n.type==='Text'&&n.props.children==='Nombre vinculado');assert.equal(name.props.style.fontFamily,tokens.typography.family.semibold);assert.equal(name.props.style.color,tokens.themes.light.colors.action.primary);
 nodes(tree).find(n=>n.type==='Button').props.onPress();assert.equal(hardware(),true);assert.deepEqual(destinations,['/mi-agenda','/mi-agenda']);
 const remove=cleanup;remove();assert.equal(cleanup,true);
});

test('guide query only reads, retains exact execution across midnight and cancels late responses on blur',async()=>{
 let focus,foreground,timer,resolve;const states=[],calls=[];
 const nativeSet=global.setTimeout,nativeClear=global.clearTimeout;
 global.setTimeout=fn=>{timer=fn;return 1;};global.clearTimeout=()=>{};
 try{
  const hook=load('hooks/use-user-guide.ts',{
   react:{useCallback:fn=>fn,useRef:v=>({current:v}),useState:v=>[v,next=>states.push(next)]},
   'expo-router':{useFocusEffect:fn=>{focus=fn;}},
   'react-native':{AppState:{addEventListener:(event,fn)=>{foreground=fn;return{remove:()=>{foreground=undefined;}};}}},
   '@/services/user-execution':{getGuide:(id,signal,execution)=>{calls.push({id,signal,execution});return new Promise(r=>{resolve=r;});}},
   '@/services/device-access-manager':{DeviceFailure}
  }).useUserGuide(7);
  const blur=focus();assert.equal(calls.length,1);assert.equal(calls[0].execution,undefined);
  resolve(guide(3));await tick();assert.equal(states.at(-1).guide.pasos[2].alcanzado,true);
  timer();assert.equal(calls[1].execution,3);const historical=guide(3);historical.vigente=false;resolve(historical);await tick();
  assert.equal(states.at(-1).guide.vigente,false);
  foreground('active');assert.equal(calls[2].execution,3);const before=states.length;blur();assert.equal(calls[2].signal.aborted,true);
  resolve(guide(4));await tick();assert.equal(states.length,before);assert.equal(foreground,undefined);
  hook.reload();assert.equal(calls.length,3);
 }finally{global.setTimeout=nativeSet;global.clearTimeout=nativeClear;}
});

test('completed detail opens consultation without starting or finishing; an in-flight completion also opens consultation',()=>{
 let model=completed(0,5,'DIRECTA'),busy=false;model.actividad.estado='COMPLETADA';const routes=[],writes=[];
 const screen=load('app/(usuario-autenticado)/actividades/[idActividad].tsx',{...styling,react:{useState:v=>[v,()=>{}]},
  'expo-router':{useLocalSearchParams:()=>({idActividad:'7'}),router:{push:href=>routes.push(href),dismissTo:()=>{}}},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},
  '@/components/user/activity-detail':{UserActivityDetailContent:'Detail'},'@/components/user/execution-success':{ExecutionSuccess:'Success'},
  '@/hooks/use-execution-action':{useExecutionAction:()=>({busy,run:(op,success)=>{writes.push(op);success(completed());}})},
  '@/hooks/use-user-activity':{useUserActivity:()=>({state:{status:'ready',detail:model},reload:()=>assert.fail('Unexpected reload')})},
  '@/services/user-execution':{startGuideOperation:()=>({kind:'start'})},'@/utils/user-execution':utils,'@/utils/user-activity':activityUtils}).default;
 nodes(screen()).find(n=>n.type==='Detail').props.onStart();assert.equal(writes.length,0);assert.deepEqual(routes[0],utils.guideHref(7));
 model=guide();busy=true;const detail=nodes(screen()).find(n=>n.type==='Detail');assert.equal(detail.props.busy,true);assert.equal(detail.props.disabled,false);
 detail.props.onStart();assert.equal(writes.length,1);assert.deepEqual(routes[1],utils.guideHref(7));
});

test('completed guided, direct and early-guided executions expose every step as read-only consultation',()=>{
 for(const model of [completed(),completed(0,5,'DIRECTA'),completed(2)]){
  let cursor=0;const slots=[],destinations=[];const before=JSON.stringify(model);
  const screen=load('app/(usuario-autenticado)/actividades/guia/[idActividad].tsx',{...styling,
   react:{useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],next=>{slots[i]=next;}];}},
   'expo-router':{useLocalSearchParams:()=>({idActividad:'7'}),router:{dismissTo:href=>destinations.push(href)}},
   '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/carer/continue-button':{ContinueButton:'Button'},
   '@/components/carer/activity-dialog':{ActivityDialog:'Dialog'},'@/components/carer/step-dialog-actions':{StepDialogActions:'Actions'},
   '@/components/carer/step-pictogram':{StepPictogramImage:'Pictogram'},'@/components/user/guide-steps':{GuideSteps:'Steps'},
   '@/components/user/execution-success':{ExecutionSuccess:'Success'},'@/hooks/use-user-guide':{useUserGuide:()=>({state:{status:'ready',guide:model}})},
   '@/hooks/use-execution-action':{useExecutionAction:()=>({run:()=>assert.fail('Consultation wrote to API')})},
   '@/services/user-execution':{advanceOperation:()=>assert.fail('Unexpected advance'),finishGuideOperation:()=>assert.fail('Unexpected finish')},
   '@/utils/user-execution':utils,'@/utils/user-activity':activityUtils}).default;
  const render=()=>{cursor=0;return screen();};let tree=render();const steps=nodes(tree).find(n=>n.type==='Steps');
  assert.equal(steps.props.current,0);assert.equal(steps.props.consultation,true);
  nodes(tree).find(n=>n.type==='Button').props.onPress();tree=render();assert.equal(nodes(tree).find(n=>n.type==='Steps').props.current,1);
  nodes(tree).find(n=>n.type==='Steps').props.onSelect(5);tree=render();
  const buttons=nodes(tree).filter(n=>n.type==='Button');assert.deepEqual(buttons.map(n=>n.props.label),['Volver a la actividad']);buttons[0].props.onPress();
  assert.deepEqual(destinations,[activityUtils.userActivityHref(7)]);assert.equal(JSON.stringify(model),before);assert.ok(!nodes(tree).some(n=>['Dialog','Success'].includes(n.type)));
 }
 const navigation=load('components/user/guide-steps.tsx',{...styling,react:{useRef:v=>({current:v}),useEffect:()=>{}},'react-native':{...styling['react-native'],AccessibilityInfo:{announceForAccessibility:()=>{}}}}).GuideSteps;
 const tree=navigation({steps:completed(0,5,'DIRECTA').pasos,current:0,disabled:false,consultation:true,onSelect:()=>{}});
 const list=nodes(tree).find(n=>n.type==='List');for(const [index,item] of list.props.data.entries()){const target=list.props.renderItem({item,index});assert.equal(target.props.disabled,false);assert.equal(target.props.accessibilityHint,undefined);}
});

test('solid primary button keeps its surface and white content while busy, without changing default buttons',()=>{
 const flatten=v=>Object.assign({},...v.flat(Infinity).filter(Boolean));
 for(const theme of [tokens.themes.light,tokens.themes.dark]){
  const button=load('components/carer/continue-button.tsx',{...styling,'@/theme/use-theme':{useAppTheme:()=>theme}}).ContinueButton;
  const tree=button({label:'Ver paso a paso',appearance:'solid-purple',busy:true,leadingIcon:'icon'});
  assert.equal(tree.props.disabled,true);assert.equal(tree.props.accessibilityState.busy,true);
  for(const pressed of [true,false])assert.equal(flatten(tree.props.style({pressed})).backgroundColor,tokens.colors.purple.default);
  assert.equal(flatten(nodes(tree).find(n=>n.type==='Text').props.style).color,tokens.colors.background.primary);
  assert.equal(nodes(tree).find(n=>n.type==='Text').props.children,'Ver paso a paso');assert.ok(!nodes(tree).some(n=>n.type==='Spinner'));
  assert.equal(flatten(button({label:'Existing',disabled:true}).props.style({pressed:false})).backgroundColor,theme.colors.action.disabled);
 }
});

test('celebration animates once, settles on blur/reduced motion and cleans its subscription',async()=>{
 for(const reduced of [false,true]){
  let effect,focus,change,removed=false;const values=[],timings=[];
  const component=load('components/user/celebration-picture.tsx',{...styling,
   react:{useCallback:fn=>fn,useEffect:fn=>{effect=fn;}},'expo-image':{Image:'Image'},'expo-router':{useFocusEffect:fn=>{focus=fn;}},
   'react-native':{...styling['react-native'],AccessibilityInfo:{isReduceMotionEnabled:async()=>reduced,addEventListener:(event,fn)=>{assert.equal(event,'reduceMotionChanged');change=fn;return{remove:()=>{removed=true;}};}}},
   'react-native-reanimated':{default:{View:'Animated'},cancelAnimation:()=>{},ReduceMotion:{System:'system'},useReducedMotion:()=>reduced,
    useSharedValue:v=>{const shared={value:v,get(){return this.value;},set(next){this.value=next;}};values.push(shared);return shared;},useAnimatedStyle:fn=>fn(),
    withTiming:(v,options)=>{timings.push(options);return v;},withSequence:(...args)=>args.at(-1)}
  }).CelebrationPicture;
  component();const cleanup=effect();await tick();assert.equal(timings.length,reduced?0:4);assert.ok(timings.every(t=>t.reduceMotion==='system'));
  const leave=focus();leave();assert.deepEqual(values.map(v=>v.value),[1,0,1]);const count=timings.length;focus();assert.equal(timings.length,count);
  change(true);assert.deepEqual(values.map(v=>v.value),[1,0,1]);cleanup();assert.equal(removed,true);
 }
});
