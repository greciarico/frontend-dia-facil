const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const ts=require('typescript');
const jsx=(type,props)=>({type,props});
function load(file,modules={}) {
 const exports={};const defaults={'react/jsx-runtime':{jsx,jsxs:jsx},...modules};
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 (id=>{assert.ok(id in defaults,'Missing adapter: '+id);return defaults[id];},exports);return exports;
}
const utils=load('utils/form-keyboard.ts');const {FormKeyboardController,focusedFieldOffset}=utils;
const tokens=load('theme/tokens.ts');
function fixture() {
 let height=400,content=1000,offset=0,fieldY=700,fieldHeight=48,sequence=0,focused=true;
 const frames=new Map(),scrolls=[];
 const field={isFocused:()=>focused,measureInWindow:callback=>callback(0,fieldY-offset,200,fieldHeight)};
 const controller=new FormKeyboardController({measureViewport:callback=>callback(0,24,320,height),
  scrollTo:y=>{offset=y;scrolls.push(y);},requestFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id),gap:12});
 controller.activate();controller.contentChanged(content);
 return {controller,field,frames,scrolls,layout:h=>{height=h;controller.layoutChanged();},
  content:h=>{content=h;controller.contentChanged(h);},position:(y,h=48)=>{fieldY=y;fieldHeight=h;},
  focused:v=>{focused=v;},scroll:y=>{offset=y;controller.scrolled(y);},flush(){for(const [id,fn] of [...frames]){frames.delete(id);fn();}}};
}
test('geometry scrolls by only the obscured distance, independent of device and keyboard height',()=>{
 const base={offset:0,fieldY:700,fieldHeight:48,viewportY:24,viewportHeight:400,contentHeight:1000,gap:12};
 assert.equal(focusedFieldOffset(base),336);
 assert.equal(focusedFieldOffset({...base,fieldY:200}),0);
 assert.equal(focusedFieldOffset({...base,viewportHeight:300}),436);
 assert.equal(focusedFieldOffset({...base,offset:100,fieldY:40}),100);
 assert.equal(focusedFieldOffset({...base,offset:100,fieldY:10}),74);
 assert.equal(focusedFieldOffset({...base,fieldY:990}),600);
});
test('focus before keyboard and content creation does not move the closed layout; keyboard measures then scrolls',()=>{
 const f=fixture();f.controller.focus(f.field);f.flush();assert.deepEqual(f.scrolls,[]);
 f.controller.shown();f.flush();assert.deepEqual(f.scrolls,[336]);
 f.controller.layoutChanged();f.flush();assert.deepEqual(f.scrolls,[336]);
});
test('native resize and later keyboard-height changes remeasure without adding keyboard height twice',()=>{
 const f=fixture();f.controller.focus(f.field);f.controller.shown();f.flush();
 f.layout(300);f.flush();assert.deepEqual(f.scrolls,[336,436]);
 f.layout(400);f.flush();assert.deepEqual(f.scrolls,[336,436]);
});
test('closing restores the original scroll position rather than always jumping to zero',()=>{
 const f=fixture();f.scroll(80);f.controller.focus(f.field);f.controller.shown();f.flush();
 f.layout(800);f.controller.hidden();f.flush();assert.deepEqual(f.scrolls,[336,80]);
 f.controller.layoutChanged();f.flush();assert.deepEqual(f.scrolls,[336,80]);
});
test('restoration is clamped if content disappears while keyboard closes',()=>{
 const f=fixture();f.scroll(80);f.controller.focus(f.field);f.controller.shown();f.flush();
 f.content(500);f.layout(800);f.controller.hidden();f.flush();assert.equal(f.scrolls.at(-1),0);
});
test('OTP focus changes, wrapping and expanded text remeasure the current cell only',()=>{
 const f=fixture();f.controller.focus(f.field);f.controller.shown();f.flush();
 const next={isFocused:()=>true,measureInWindow:callback=>callback(0,500,80,90)};
 f.controller.blur(f.field);f.controller.focus(next);f.flush();assert.equal(f.scrolls.at(-1),514);
 f.controller.blur(next);const length=f.scrolls.length;f.controller.layoutChanged();f.flush();assert.equal(f.scrolls.length,length);
});
test('focus/layout bursts coalesce into one frame and stale native measurements are ignored',()=>{
 const f=fixture();let callback;
 const slow={isFocused:()=>true,measureInWindow:cb=>{callback=cb;}};
 f.controller.focus(slow);f.controller.shown();f.controller.layoutChanged();f.controller.layoutChanged();
 assert.equal(f.frames.size,1);f.flush();assert.ok(callback);
 f.controller.focus(f.field);callback(0,900,100,48);assert.deepEqual(f.scrolls,[]);
 f.flush();assert.deepEqual(f.scrolls,[336]);
});
test('blur/unmount cancels frames and ignores pending measurement callbacks',()=>{
 const f=fixture();let callback;
 const slow={isFocused:()=>true,measureInWindow:cb=>{callback=cb;}};
 f.controller.focus(slow);f.controller.shown();f.flush();f.controller.layoutChanged();assert.equal(f.frames.size,1);
 f.controller.deactivate();assert.equal(f.frames.size,0);callback(0,900,100,48);assert.deepEqual(f.scrolls,[]);
});

function component(context=null,platform='android') {
 const effects=[];const listeners=[];
 const react={createContext:()=>({Provider:'Provider'}),forwardRef:fn=>fn,useContext:()=>context,useRef:current=>({current}),
  useCallback:fn=>fn,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]};
 const exports=load('components/forms/keyboard-aware-form.tsx',{
  react,'react-native':{StyleSheet:{create:v=>v},TextInput:'NativeInput',View:'View',ScrollView:'Scroll',KeyboardAvoidingView:'Avoider',Platform:{OS:platform},
   Keyboard:{isVisible:()=>false,addListener:(name,fn)=>{const entry={name,fn,removed:false};listeners.push(entry);return {remove(){entry.removed=true;}};}}},
  'expo-router':{useFocusEffect:fn=>effects.push(fn)},'@/theme/tokens':tokens,'@/utils/form-keyboard':utils,
 });
 return {...exports,effects,listeners};
}
test('input wrapper forwards the native ref and composes existing focus, blur, layout and text callbacks',()=>{
 const calls=[];const form={focus:n=>calls.push(['focus',n]),blur:n=>calls.push(['blur',n]),layoutChanged:()=>calls.push(['layout'])};
 const {KeyboardAwareTextInput}=component(form);const ref={current:null};const onChangeText=()=>{};
 const element=KeyboardAwareTextInput({value:'unchanged',onChangeText,onFocus:e=>calls.push(['originalFocus',e]),onBlur:e=>calls.push(['originalBlur',e]),
  onLayout:e=>calls.push(['originalLayout',e])},ref);
 const native={focus(){}};element.props.ref(native);assert.equal(ref.current,native);assert.equal(element.props.onChangeText,onChangeText);
 const event={nativeEvent:{}};element.props.onFocus(event);element.props.onBlur(event);element.props.onLayout(event);
 assert.deepEqual(calls,[['focus',native],['originalFocus',event],['blur',native],['originalBlur',event],['layout'],['originalLayout',event]]);
 element.props.ref(null);assert.equal(ref.current,null);
});
test('input wrapper preserves callback refs used by the OTP without requiring a provider',()=>{
 const received=[];const {KeyboardAwareTextInput}=component();const element=KeyboardAwareTextInput({},node=>received.push(node));
 const native={focus(){}};element.props.ref(native);element.props.onFocus({});element.props.ref(null);assert.deepEqual(received,[native,null]);
});
test('one avoider per platform, no automatic inset double-count, handled taps and listener cleanup',()=>{
 for(const platform of ['android','ios']) {
  const f=component(null,platform);const tree=f.KeyboardAwareForm({children:'form'});
  assert.equal(tree.props.behavior,platform==='ios'?'padding':'height');assert.equal(tree.props.keyboardVerticalOffset,0);
  const scroll=tree.props.children.props.children;assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
  assert.equal(scroll.props.automaticallyAdjustKeyboardInsets,false);assert.equal(scroll.props.contentInsetAdjustmentBehavior,'never');
  const cleanup=f.effects.map(fn=>fn());cleanup.forEach(fn=>fn());assert.ok(f.listeners.every(listener=>listener.removed));
 }
});

test('OTP keeps auto advance, full-code paste, backspace and callback refs with the shared input',()=>{
 const changes=[],focused=[],setFocused=[];const refs={current:[]};
 const otp=load('components/carer/otp-input.tsx',{
  react:{useRef:()=>refs,useState:()=>[0,value=>setFocused.push(value)]},
  'react-native':{StyleSheet:{create:v=>v},View:'View',useWindowDimensions:()=>({fontScale:2})},
  '@/components/forms/keyboard-aware-form':{KeyboardAwareTextInput:'Input'},
  '@/theme/tokens':tokens,'@/theme/use-theme':{useAppTheme:()=>tokens.themes.light},
  '@/utils/carer-otp':load('utils/carer-otp.ts'),
 }).OtpInput;
 const digits=Array(6).fill('');const fields=otp({digits,onChange:value=>changes.push(value),disabled:false}).props.children;
 fields.forEach((field,index)=>field.props.ref({focus:()=>focused.push(index)}));
 fields[0].props.onFocus();fields[0].props.onChangeText('123456');
 assert.deepEqual(changes[0],['1','2','3','4','5','6']);assert.equal(focused.at(-1),5);assert.deepEqual(setFocused,[0]);
 fields[1].props.onKeyPress({nativeEvent:{key:'Backspace'}});assert.equal(focused.at(-1),0);
 assert.ok(fields.every(field=>field.type==='Input'));assert.equal(fields[0].props.accessibilityLabel,'Dígito 1 de 6');
});
