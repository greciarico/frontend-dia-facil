const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={},frame={}) {
 const exports={};const defaults={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},...modules};
 new Function('require','exports','requestAnimationFrame','cancelAnimationFrame',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 (id=>{assert.ok(id in defaults,'Unexpected dependency: '+id);return defaults[id];},exports,frame.request,frame.cancel);return exports;
}
const tokens=load('theme/tokens.ts');
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
const styles=value=>Object.assign({},...(Array.isArray(value)?value:[value]).filter(Boolean));
function fixture(scheme='light') {
 const slots=[];let cursor=0,tree,jobs=[],focusCallback,focusCleanup,focused=true,nextFrame=0,dismissed=0;
 const frames=new Map(),accessibility=[];
 const frame={request:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancel:id=>frames.delete(id)};
 const changed=(old,deps)=>!old||deps.some((v,i)=>!Object.is(v,old.deps[i]));
 const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=v;}];},
  useRef:initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useCallback:(fn,deps)=>{const i=cursor++;if(changed(slots[i],deps))slots[i]={deps,fn};return slots[i].fn;},
  useEffect:(fn,deps)=>{const i=cursor++;if(changed(slots[i],deps)){const old=slots[i];slots[i]={deps};jobs.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}};
 const screen=load('components/user/connection-help.tsx',{
  react,'react-native':{StyleSheet:{create:v=>v},Pressable:'Pressable',View:'View',Text:'Text',Keyboard:{dismiss:()=>dismissed++},
   findNodeHandle:n=>n?.tag,AccessibilityInfo:{setAccessibilityFocus:id=>accessibility.push(id)}},
  'expo-router':{useIsFocused:()=>focused,useFocusEffect:fn=>{focusCallback=fn;}},
  '@/components/carer/activity-dialog':{ActivityDialog:'Dialog'},'@/components/carer/area-icon':{AreaIcon:'Icon'},
  '@/components/carer/continue-button':{ContinueButton:'Button'},'@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes[scheme]},
 },frame).ConnectionHelp;
 let priorFocus;
 const f={frames,accessibility,dismissed:()=>dismissed,
  render(){cursor=0;jobs=[];tree=screen();
   if(focused&&priorFocus!==focusCallback){focusCleanup?.();priorFocus=focusCallback;focusCleanup=focusCallback();}
   if(!focused){focusCleanup?.();focusCleanup=undefined;priorFocus=undefined;}jobs.forEach(fn=>fn());
   const trigger=nodes(tree).find(n=>n.props?.accessibilityLabel==='¿Necesitas ayuda?');trigger.props.ref.current={tag:51};return tree;},
  trigger:()=>nodes(tree).find(n=>n.props?.accessibilityLabel==='¿Necesitas ayuda?'),dialog:()=>nodes(tree).find(n=>n.type==='Dialog'),
  open(){f.render();f.trigger().props.onPress();f.render();return f.dialog();},
  flush(){for(const [id,fn] of [...frames]){frames.delete(id);fn();}},
  blur(){focused=false;f.render();},destroy(){focusCleanup?.();slots.forEach(s=>s?.cleanup?.());}};
 return f;
}
function nativeDialog(props,scheme='light') {
 const focus=[];const Dialog=load('components/carer/activity-dialog.tsx',{
  react:{useRef:v=>({current:v})},
  'react-native':{View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',ScrollView:'Scroll',KeyboardAvoidingView:'Avoider',
   StyleSheet:{create:v=>v},Platform:{OS:'android'},findNodeHandle:n=>n?.tag,AccessibilityInfo:{setAccessibilityFocus:id=>focus.push(id)}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:60,bottom:38,left:32,right:0})},
  '@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes[scheme]},'./account-layout':{accountStyles:{}},'./area-icon':{AreaIcon:'Icon'},
 }).ActivityDialog;
 return {tree:Dialog(props),focus};
}

test('help is enabled, opens locally with exact copy and two noninteractive accessible choices',()=>{
 const f=fixture();f.render();assert.equal(f.trigger().props.accessibilityState.expanded,false);
 const dialog=f.open();assert.equal(f.dismissed(),1);assert.equal(f.trigger().props.accessibilityState.expanded,true);
 assert.equal(dialog.props.title,'¿Necesitas ayuda para conectar tu agenda?');
 assert.equal(dialog.props.description,'Pídele a tu cuidador que abra tu perfil y te muestre tu código de conexión.');
 assert.equal(dialog.props.respectSafeArea,true);assert.equal(dialog.props.showClose,true);assert.equal(dialog.props.closeLabel,'Cerrar ayuda');
 const sections=nodes(dialog).filter(n=>n.props?.accessible);
 assert.deepEqual(sections.map(n=>n.props.accessibilityLabel),['Escanear QR. Apunta la cámara al código QR.','Ingresar código. Escribe el código que aparece debajo del QR.']);
 assert.ok(sections.every(n=>!n.props.onPress));assert.deepEqual(nodes(dialog).filter(n=>n.type==='Icon').map(n=>n.props.name),['camera','keyboard']);
 const button=nodes(dialog).find(n=>n.type==='Button');assert.equal(button.props.label,'Entendido');assert.equal(button.props.size,'modal');
 f.destroy();
});
test('Entendido, X, Android back and VoiceOver escape close the same local state and help can reopen',()=>{
 const f=fixture();
 for(const method of ['understood','close','back','escape']) {
  const dialog=f.open();const native=nativeDialog(dialog.props).tree;
  if(method==='understood')nodes(dialog).find(n=>n.type==='Button').props.onPress();
  if(method==='close')nodes(native).find(n=>n.props?.accessibilityLabel==='Cerrar ayuda').props.onPress();
  if(method==='back')native.props.onRequestClose();
  if(method==='escape')nodes(native).find(n=>n.props?.accessibilityViewIsModal).props.onAccessibilityEscape();
  f.render();assert.equal(f.dialog(),undefined);f.flush();assert.equal(f.accessibility.at(-1),51);
 }
 assert.equal(f.dismissed(),4);f.destroy();
});
test('reopening cancels old focus return; blur or unmount prevents late accessibility callbacks',()=>{
 const f=fixture();let dialog=f.open();dialog.props.onClose();f.render();assert.equal(f.frames.size,1);
 dialog=f.open();assert.equal(f.frames.size,0);f.flush();assert.deepEqual(f.accessibility,[]);
 dialog.props.onClose();f.render();f.blur();f.flush();assert.deepEqual(f.accessibility,[]);assert.equal(f.dialog(),undefined);f.destroy();
 const fresh=fixture();fresh.open().props.onClose();fresh.render();fresh.destroy();fresh.flush();assert.deepEqual(fresh.accessibility,[]);
});
test('shared dialog remains scrollable and animation-free, protects safe areas only when opted in',()=>{
 const f=fixture();const help=f.open();const {tree,focus}=nativeDialog(help.props);
 assert.equal(tree.props.animationType,'none');assert.ok(nodes(tree).some(n=>n.type==='Scroll'));
 const overlay=tree.props.children;const overlayStyle=styles(overlay.props.style);
 assert.equal(overlayStyle.paddingTop,60);assert.equal(overlayStyle.paddingBottom,38);assert.equal(overlayStyle.paddingLeft,32);assert.equal(overlayStyle.paddingRight,24);
 const heading=nodes(tree).find(n=>n.props?.accessibilityRole==='header');heading.props.ref.current={tag:75};tree.props.onShow();assert.deepEqual(focus,[75]);
 assert.ok(nodes(tree).filter(n=>n.type==='Text').every(n=>n.props.numberOfLines===undefined));
 const plain=nativeDialog({title:'Existing dialog',onClose(){},children:null}).tree;
 const plainStyle=styles(plain.props.children.props.style);assert.equal(plainStyle.padding,24);assert.equal(plainStyle.paddingTop,undefined);
 assert.equal(overlay.props.onPress,undefined);f.destroy();
});
test('help and shared dialog use semantic colors in both light and dark',()=>{
 for(const scheme of ['light','dark']) {
  const f=fixture(scheme);const dialog=f.open();const colors=tokens.themes[scheme].colors;
  const sections=nodes(dialog).filter(n=>n.props?.accessible);assert.ok(sections.every(n=>styles(n.props.style).backgroundColor===undefined&&styles(n.props.style).borderRadius===undefined));
  assert.ok(nodes(dialog).filter(n=>n.type==='Icon').every(n=>n.props.color===colors.action.primary));
  const native=nativeDialog(dialog.props,scheme).tree;assert.equal(styles(native.props.children.props.style).backgroundColor,colors.overlay.scrim);
  assert.equal(styles(nodes(native).find(n=>n.props?.accessibilityViewIsModal).props.style).backgroundColor,colors.surface.elevated);f.destroy();
 }
});
