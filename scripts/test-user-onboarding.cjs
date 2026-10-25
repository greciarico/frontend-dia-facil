const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}) {
 const exports={};const defaults={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},...modules};
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 (id=>{if(id.startsWith('@/assets/'))return id;assert.ok(id in defaults,'Missing adapter: '+id);return defaults[id];},exports);return exports;
}
const tokens=load('theme/tokens.ts');const {minimumTransition}=load('utils/minimum-transition.ts');
const linkUtils=load('utils/user-link.ts',{'./profiles':{}});
const CODE='DF-7KQ9W6H2M8V3X5RA';const profile={idPerfilUsuario:12,nombre:'Persona',avatar:null};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function clock() {
 let now=0,sequence=0;const timers=new Map();
 return {timers,set:(fn,ms)=>{const id=++sequence;timers.set(id,{at:now+ms,fn});return id;},clear:id=>timers.delete(id),
 advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}};
}
function nodes(tree) {
 if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);
 return [tree,...nodes(tree.props?.children)];
}
function fixture(options={}) {
 const slots=[];let cursor=0,tree,focus=[];const mounted=[];let updates=0;
 const timer=clock(),calls=[],navigation=[];let snapshot=options.state||{status:'pending',stage:'ready'};
 class DeviceFailure extends Error {constructor(kind){super('Mensaje seguro');this.kind=kind;}}
 const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
   return [slots[i],v=>{updates++;slots[i]=typeof v==='function'?v(slots[i]):v;}];},
  useRef:initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useCallback:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j])))slots[i]={fn,deps};return slots[i].fn;},useEffect:()=>{}};
 const access={connect:async code=>{calls.push(code);if(options.connect)await options.connect(code,DeviceFailure);snapshot={status:'linked',stage:'confirmation',profile};},
  logout:async()=>{snapshot={status:'unlinked',stage:'ready'};},finish:()=>{snapshot={...snapshot,stage:'ready'};}};
 const screen=load('app/usuario/index.tsx',{
  react,'react-native':{StyleSheet:{create:v=>v},Text:'Text',TextInput:'Input',Pressable:'Pressable',View:'View',
   AppState:{currentState:'active'},BackHandler:{addEventListener:()=>({remove(){}})},Keyboard:{dismiss(){}},Linking:{}},
  '@/components/forms/keyboard-aware-form':{KeyboardAwareTextInput:'Input'},
  '@/components/user/connection-help':{ConnectionHelp:'ConnectionHelp'},
  'expo-router':{Redirect:'Redirect',router:{replace:p=>navigation.push(p)},useFocusEffect:fn=>focus.push(fn),useIsFocused:()=>true},
  'expo-image':{Image:'Image'},'expo-camera':{},'@/context/device-access':{useDeviceAccess:()=>snapshot},
  '@/services/device-access':{deviceAccess:access},'@/services/device-access-manager':{DeviceFailure},
  '@/utils/user-link':linkUtils,
  '@/components/user/connection-layout':{ConnectionLayout:'Layout',userConnectionStyles:{}},
  '@/components/carer/continue-button':{ContinueButton:'Button'},'@/components/carer/device-link-illustration':{},
  '@/components/carer/area-icon':{AreaIcon:'Icon'},'@/components/user/connection-progress':{ConnectionCalendar:'Calendar',ConnectionProgress:'Progress'},
  '@/utils/minimum-transition':{minimumTransition:ms=>minimumTransition(ms,timer.set,timer.clear)},
  '@/theme/use-theme':{useAppTheme:()=>tokens.themes.light},'@/theme/tokens':tokens,
 }).default;
 const f={timer,calls,navigation,DeviceFailure,updates:()=>updates,
  render(){cursor=0;focus=[];tree=screen();focus.forEach((fn,i)=>{if(mounted[i]?.fn!==fn){mounted[i]?.cleanup?.();mounted[i]={fn,cleanup:fn()};}});return tree;},
  button(label){const result=nodes(tree).find(n=>n.props?.label===label||n.props?.accessibilityLabel===label);assert.ok(result,'Missing button '+label);return result;},
  openManual(){f.render();f.button('Ingresar código').props.onPress();f.render();return nodes(tree).find(n=>n.type==='Input');},
  submit(code=CODE){f.openManual().props.onChangeText(code);f.render();return f.button('Conectar mi agenda').props.onPress();},
  blur(){mounted.forEach(m=>m.cleanup?.());},setState:s=>{snapshot=s;}};
 return f;
}

test('inline manual entry stays on connect, validates format, has accessible arrow and collapses on back',()=>{
 const f=fixture();const input=f.openManual();assert.equal(input.props.accessibilityLabel,'Código de conexión');
 assert.equal(f.render().props.title,'Conecta tu agenda');assert.equal(f.button('Conectar mi agenda').props.disabled,true);
 input.props.onChangeText('DF-123456');f.render();assert.equal(f.button('Conectar mi agenda').props.disabled,true);
 input.props.onChangeText(CODE.toLowerCase());f.render();assert.equal(f.button('Conectar mi agenda').props.disabled,false);
 f.render().props.onBack();f.render();assert.ok(f.button('Ingresar código'));assert.deepEqual(f.navigation,[]);f.blur();
});

test('contextual help stays inside connection without receiving form or connection callbacks',()=>{
 const f=fixture();f.openManual().props.onChangeText('DF-00');let tree=f.render();
 const help=nodes(tree).find(n=>n.type==='ConnectionHelp');assert.ok(help);assert.deepEqual(help.props,{});
 tree=f.render();assert.equal(tree.props.title,'Conecta tu agenda');assert.equal(nodes(tree).find(n=>n.type==='Input').props.value,'DF-00');
 assert.deepEqual(f.calls,[]);assert.deepEqual(f.navigation,[]);f.blur();
});
test('immediate real success remains visually loading for exactly the minimum, then reaches authenticated destination',async()=>{
 const f=fixture();f.submit();await tick();assert.equal(f.calls.length,1);assert.equal(f.render().props.onboarding,'loading');
 f.timer.advance(1199);await tick();assert.equal(f.render().props.onboarding,'loading');
 f.timer.advance(1);await tick();assert.equal(f.render().props.title,'¡Listo, Persona!');
 f.button('Ir a mi agenda').props.onPress();assert.deepEqual(f.navigation,['/mi-agenda']);assert.equal(f.render().props.href,'/mi-agenda');f.blur();
});
test('a slow request has no additional wait after the minimum and duplicate taps do not resubmit',async()=>{
 let finish;const f=fixture({connect:()=>new Promise(resolve=>{finish=resolve;})});
 const input=f.openManual();input.props.onChangeText(CODE);f.render();const send=f.button('Conectar mi agenda').props.onPress;
 send();send();await tick();assert.equal(f.calls.length,1);f.timer.advance(4000);await tick();assert.equal(f.render().props.onboarding,'loading');
 finish();await tick();assert.equal(f.render().props.onboarding,'success');f.blur();
});
test('QR and inline manual submission normalize into the same connect; scanner fallback expands input',async()=>{
 const f=fixture();f.render();f.button('Escanear código QR').props.onPress();let scan=f.render();
 scan.props.onManual();assert.ok(nodes(f.render()).find(n=>n.type==='Input'));
 f.button('Escanear código QR').props.onPress();scan=f.render();scan.props.onCode(' df-7kq9 w6h2 m8v3 x5ra ');
 await tick();assert.deepEqual(f.calls,[CODE]);f.timer.advance(1200);await tick();assert.equal(f.render().props.onboarding,'success');f.blur();
});
test('invalid code and technical error preserve separate states and retry does not close the device connection',async()=>{
 for(const kind of ['invalid-code','network']) {
  const f=fixture({connect:async(code,Failure)=>{throw new Failure(kind);}});f.submit();await tick();
  assert.equal(f.timer.timers.size,0);
  const error=f.render();assert.equal(error.props.title,kind==='invalid-code'?'El código no es válido':'No pudimos conectar tu agenda');
  if(kind==='invalid-code'){assert.ok(error.props.illustration.props.source.endsWith('sad-user.png'));f.button('Intentar nuevamente').props.onPress();}
  else f.button('Volver').props.onPress();
  assert.equal(f.render().props.title,'Conecta tu agenda');assert.deepEqual(f.navigation,[]);f.blur();
 }
});

test('manual input cannot exceed 19 and an extra character keeps the valid arrow enabled',()=>{
 const f=fixture();let input=f.openManual();assert.equal(input.props.maxLength,19);
 input.props.onChangeText(CODE.slice(0,-1));f.render();assert.equal(f.button('Conectar mi agenda').props.disabled,true);
 input=nodes(f.render()).find(n=>n.type==='Input');input.props.onChangeText(CODE.toLowerCase());f.render();assert.equal(f.button('Conectar mi agenda').props.disabled,false);
 // Defensive state bound also covers a programmatically delivered oversized native event.
 nodes(f.render()).find(n=>n.type==='Input').props.onChangeText(CODE+'X');const tree=f.render();
 assert.equal(nodes(tree).find(n=>n.type==='Input').props.value,CODE);assert.equal(f.button('Conectar mi agenda').props.disabled,false);f.blur();
});

test('a syntactically sendable zero code enables arrow and backend invalid-code skips visual minimum',async()=>{
 const code='DF-0000000000000000';let reject;
 const f=fixture({connect:(value,Failure)=>{assert.equal(value,code);return new Promise((resolve,fail)=>{reject=()=>fail(new Failure('invalid-code'));});}});
 const input=f.openManual();input.props.onChangeText(code);f.render();assert.equal(f.button('Conectar mi agenda').props.disabled,false);
 f.button('Conectar mi agenda').props.onPress();await tick();assert.equal(f.render().props.onboarding,'loading');
 f.timer.advance(100);reject();await tick();assert.equal(f.render().props.title,'El código no es válido');assert.equal(f.timer.timers.size,0);f.blur();
});

test('oversized QR is not silently truncated into an accepted code',async()=>{
 const f=fixture();f.render();f.button('Escanear código QR').props.onPress();f.render().props.onCode(CODE+'X');await tick();
 assert.equal(f.render().props.title,'El código no es válido');assert.deepEqual(f.calls,[]);assert.equal(f.timer.timers.size,0);f.blur();
});
test('leaving cancels only the visual timer and ignores late UI completion',async()=>{
 let finish;const f=fixture({connect:()=>new Promise(resolve=>{finish=resolve;})});f.submit();await tick();f.render();
 f.blur();const updates=f.updates();assert.equal(f.timer.timers.size,0);finish();await tick();assert.equal(f.updates(),updates);assert.deepEqual(f.navigation,[]);
});
test('fresh restoration bypasses visual onboarding; welcome uses the existing asset and opt-in layout',()=>{
 const ready=fixture({state:{status:'linked',stage:'ready',profile}});assert.equal(ready.render().props.href,'/mi-agenda');ready.blur();
 const welcome=fixture({state:{status:'unlinked',stage:'ready'}});const tree=welcome.render();assert.equal(tree.props.onboarding,'welcome');
 assert.ok(tree.props.illustration.props.source.endsWith('user-account.png'));assert.ok(welcome.button('Comenzar'));welcome.blur();
});
test('default ConnectionLayout remains unchanged for Hola and recovery; onboarding is explicitly opt-in',()=>{
 const {ConnectionLayout}=load('components/user/connection-layout.tsx',{
  'react-native':{StyleSheet:{create:v=>v},View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable'},
  'react-native-safe-area-context':{SafeAreaView:'SafeArea'},'./onboarding-layout':{OnboardingLayout:'Onboarding'},
  '@/theme/use-theme':{useAppTheme:()=>tokens.themes.light},'@/theme/tokens':tokens,'@/components/carer/area-icon':{},
 });
 assert.equal(ConnectionLayout({title:'Hola Persona',children:null}).type,'SafeArea');
 assert.equal(ConnectionLayout({title:'Conecta',children:null,onboarding:'connect'}).type,'Onboarding');
});

test('loading bar exposes busy state without numeric progress and reduced motion never starts animation',async()=>{
 const effects=[];let animated=0,removed=0,canceled=0;
 const progress=load('components/user/connection-progress.tsx',{
  react:{useState:v=>[v,()=>{}],useEffect:fn=>effects.push(fn)},
  'react-native':{StyleSheet:{create:v=>v},View:'View',AccessibilityInfo:{isReduceMotionEnabled:async()=>true,
   addEventListener:()=>({remove(){removed++;}})}},
  'react-native-reanimated':{default:{View:'AnimatedView'},useReducedMotion:()=>true,useSharedValue:v=>({value:v}),
   useAnimatedStyle:fn=>fn(),cancelAnimation:()=>canceled++,Easing:{linear:'linear'},ReduceMotion:{System:'system'},
   withTiming:()=>animated++,withRepeat:()=>animated++},
  'react-native-svg':{},'@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes.light},
 }).ConnectionProgress;
 const tree=progress();const cleanup=effects.map(fn=>fn());await tick();
 assert.equal(tree.props.accessibilityRole,'progressbar');assert.deepEqual(tree.props.accessibilityState,{busy:true});
 assert.equal(tree.props.accessibilityValue,undefined);assert.equal(animated,0);
 cleanup.forEach(fn=>fn?.());assert.equal(removed,1);assert.ok(canceled>=2);
});
