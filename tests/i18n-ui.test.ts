import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/i18n/react';
import {LANGS,type Dict,type Lang} from '../src/i18n/core';
import {editorDict} from '../src/i18n/dict/editor';
import {processDict} from '../src/i18n/dict/process';
import Editor from '../src/ladder/Editor';
import Rung from '../src/ladder/Rung';
import {instructionHelp} from '../src/ladder/InstructionIcon';
import {Tags} from '../src/ui/Tags';
import Process from '../src/ui/Process';
import IndustrialScene from '../src/ui/IndustrialScene';
import SignalDiagram from '../src/ui/SignalDiagram';
import MomentaryInput from '../src/ui/MomentaryInput';
import ResizableWorkspace from '../src/ui/ResizableWorkspace';
import MenuBar from '../src/ui/MenuBar';
import {Plant} from '../src/simulation/conveyor';
import {challenge} from '../src/challenges/catalog';
import type {Network,Tag} from '../src/plc/model';

const TURKISH=/[çğıöşüÇĞİÖŞÜ]/;
const render=(lang:Lang,node:ReactNode)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:node}));
// Data (tag comments, input values, network titles) comes from the project and is never translated: drop it before checking the UI text.
const chrome=(html:string)=>html.replace(/ value="[^"]*"/g,'');
const noop=()=>{};

// ---- fixtures ----
const tag=(name:string,type:Tag['type'],address:string,over:Partial<Tag>={}):Tag=>({name,type,address,initial:type==='BOOL'?false:0,comment:'',...over});
const tags:Tag[]=[tag('START','BOOL','%I0.0',{comment:'Başlat düğmesi'}),tag('JOG','BOOL','%I0.1',{inputMode:'momentary'}),tag('LEVEL','INT','%IW64'),tag('MOTOR','BOOL','%Q0.0'),tag('RAW','INT','%MW10'),tag('DELAY','TIME','%MD30')];
const empty=(id:string,pin=false)=>({id,type:'AND' as const,children:[],...(pin?{pin:true}:{})});
const network=():Network=>({id:'n1',title:'Motor start',comment:'',logic:{id:'and',type:'AND',children:[
 {id:'c1',type:'NO',tag:'START'},
 {id:'ton',type:'TON',instance:'T1',pt:1000,input:empty('tin')},
 {id:'ctu',type:'CTU',instance:'C1',pv:3,input:empty('cu'),reset:empty('rst',true)},
 {id:'cmp',type:'COMPARE',op:'>',a:{kind:'tag',tag:'RAW'},b:{kind:'literal',value:5}},
 {id:'edge',type:'R_TRIG',input:{id:'e1',type:'NO',tag:'JOG'}},
]},output:{type:'COIL',tag:'MOTOR'}});
const rungProps=(over:object={})=>({network:network(),tags,trace:{},monitor:false,locked:false,selected:'',onSelect:noop,onWhy:noop,onMove:noop,onTag:noop,onOperand:noop,onInsert:noop,...over});
const editorProps=(over:object={})=>({networks:[network()],tags,trace:{},monitor:false,locked:false,onChange:noop,onWhy:noop,...over}) as Parameters<typeof Editor>[0];

// ---- hook-driven mount: the element tree is produced without a DOM and handlers are invoked directly (state survives re-draws) ----
type El=ReactElement<Record<string,unknown>>;
const internals=(React as unknown as {__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:{H:unknown}}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function mount<P extends object>(component:(props:P)=>ReactNode,props:P,initial:Lang){
 const store:unknown[]=[];let tree:ReactNode,lang=initial;
 const draw=()=>{
  let i=0;const prev=internals.H;
  internals.H={
   useState:(init:unknown)=>{const k=i++;if(!(k in store))store[k]=typeof init==='function'?(init as ()=>unknown)():init;return[store[k],(v:unknown)=>{store[k]=typeof v==='function'?(v as (s:unknown)=>unknown)(store[k]):v;}];},
   useRef:(init:unknown)=>{const k=i++;if(!(k in store))store[k]={current:init};return store[k];},
   useContext:()=>({lang,setLang:noop}),useEffect:noop,useLayoutEffect:noop,useMemo:(fn:()=>unknown)=>fn(),useCallback:(fn:unknown)=>fn,
  };
  try{tree=component(props);}finally{internals.H=prev;}
 };
 draw();
 const isPortal=(n:unknown):n is {children:ReactNode}=>!!n&&typeof n==='object'&&(n as {$$typeof?:symbol}).$$typeof===Symbol.for('react.portal');
 const walk=(node:ReactNode,out:El[]):El[]=>{if(Array.isArray(node))node.forEach(n=>walk(n,out));else if(isPortal(node))walk(node.children,out);else if(isValidElement(node)){out.push(node as El);walk((node.props as {children?:ReactNode}).children,out);}return out;};
 const all=()=>walk(tree,[]);
 const text=(node:ReactNode):string=>Array.isArray(node)?node.map(text).join(''):isValidElement(node)?text((node.props as {children?:ReactNode}).children):typeof node==='string'||typeof node==='number'?String(node):'';
 const portals=()=>{const out:ReactNode[]=[];const find=(n:ReactNode)=>{if(Array.isArray(n))n.forEach(find);else if(isPortal(n))out.push(n.children);else if(isValidElement(n))find((n.props as {children?:ReactNode}).children);};find(tree);return out;};
 const find=(pred:(e:El)=>boolean,what:string)=>{const el=all().find(pred);assert.ok(el,`${what} not found`);return el;};
 const fire=(el:El,handler:string,arg:unknown={stopPropagation:noop,preventDefault:noop})=>{const fn=el.props[handler] as ((e:unknown)=>void)|undefined;assert.ok(fn,`no ${handler}`);fn(arg);draw();};
 return {all,text,find,fire,tree:()=>tree,html:()=>render(lang,tree as ReactNode),portalHtml:()=>render(lang,portals() as ReactNode),setLang:(next:Lang)=>{lang=next;draw();}};
}

// ---- dictionaries ----
const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
const dicts:[string,Dict<string>][]=[['editor',editorDict],['process',processDict]];
for(const [name,dict] of dicts){
 test(`${name} dictionary: English and Turkish have exactly the same keys and placeholders, nothing is empty`,()=>{
  assert.deepEqual(Object.keys(dict.tr).sort(),Object.keys(dict.en).sort());
  for(const key of Object.keys(dict.en)){
   for(const lang of LANGS)assert.ok(dict[lang][key].trim(),`${lang} ${key} is empty`);
   assert.equal(placeholders(dict.tr[key]),placeholders(dict.en[key]),`placeholders of ${key}`);
  }
 });
 test(`${name} dictionary: the English table contains no Turkish letters; Turkish differs wherever the text is words`,()=>{
  for(const [key,value] of Object.entries(dict.en))assert.doesNotMatch(value,TURKISH,key);
  const same=Object.keys(dict.en).filter(key=>dict.en[key]===dict.tr[key]);
  // Identical in both languages = mnemonics / numbers / symbols only (no translatable word may be left in English).
  for(const key of same)assert.doesNotMatch(dict.en[key].replace(/\{\w+\}|\b[A-Z_0-9]{2,}\b|\b(Network|Tag|tag|Ladder|Trace)\b|[^A-Za-z]/g,''),/[a-z]{3,}/,`${key} looks untranslated`);
 });
}
test('Required TIA wording: network header, block title, comment and element properties',()=>{
 assert.equal(editorDict.en['network.label'],'Network {n}:');assert.equal(editorDict.tr['network.label'],'Network {n}:');
 assert.equal(editorDict.en['block.title'],'Block title:');assert.equal(editorDict.tr['block.title'],'Blok başlığı:');
 assert.equal(editorDict.en.comment,'Comment');assert.equal(editorDict.tr.comment,'Açıklama');
 assert.equal(editorDict.en['inspector.title'],'Element properties');assert.equal(editorDict.tr['inspector.title'],'Eleman özellikleri');
 const cols=(lang:Lang)=>['col.name','col.dataType','col.address','col.start','col.monitor','col.modify','col.force','col.comment'].map(k=>processDict[lang][k as keyof typeof processDict.en]);
 assert.deepEqual(cols('en'),['Name','Data type','Address','Start value','Monitor value','Modify value','Force','Comment']);
 assert.deepEqual(cols('tr'),['Ad','Veri tipi','Adres','Başlangıç değeri','İzleme değeri','Değiştirme değeri','Zorlama','Açıklama']);
});
test('instructionHelp is language aware: English default, Turkish on request, undefined for unknown kinds',()=>{
 for(const kind of ['NO','NC','R_TRIG','F_TRIG','COIL','SET','RESET','TON','TOF','TP','CTU','CTD','CTUD','ADD','SUB','MUL','DIV','MOVE','INT_TO_REAL','REAL_TO_INT','WORD_TO_INT','NORM_X','SCALE_X']){
  const en=instructionHelp(kind),tr=instructionHelp(kind,'tr');
  assert.ok(en&&tr,kind);assert.equal(en,instructionHelp(kind,'en'));assert.doesNotMatch(en,TURKISH,kind);
 }
 assert.equal(instructionHelp('NO'),'Normally Open Contact — TRUE when operand = 1');
 assert.equal(instructionHelp('NO','tr'),'Normalde açık kontak — operand = 1 iken TRUE');
 assert.equal(instructionHelp('CTU'),'CTU — counts rising edges of CU (R, PV, Q, CV)');assert.match(instructionHelp('CTU','tr')!,/^CTU — CU yükselen kenarlarını sayar/);
 assert.equal(instructionHelp('COMPARE'),undefined);assert.equal(instructionHelp('constructor','tr'),undefined);
});

// ---- Rung ----
const rung=(lang:Lang,over:object={})=>render(lang,createElement(Rung,rungProps(over)));
test('Rung renders English by default and in en: operand targets, empty path/pin, insertion points, handles',()=>{
 const html=chrome(renderToStaticMarkup(createElement(Rung,rungProps())));
 assert.equal(html,chrome(rung('en')));
 for(const label of ['Edit PT operand','Edit ET output tag','Edit PV operand','Edit CV output tag','Edit TON instance tag','Edit CTU instance tag','Empty pin: add a contact','Empty path: select to add an element','Insert before','Insert after','Add element at the end of the rung','Compare &gt;','TON instruction','CTU instruction','Move left connection of CTU R pin','Motor start Ladder network'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('<title>Comparison properties</title>')&&html.includes('<title>Coil / output properties</title>'));
 assert.ok(html.includes('<title>Drag the left end to a branch point. Delete: remove the connection.</title>'));
 assert.ok(html.includes('IEC counter')===false,'no virtual output is drawn here');
 assert.doesNotMatch(html,TURKISH);
});
test('Rung renders Turkish in tr and keeps the existing Turkish strings',()=>{
 const html=chrome(rung('tr'));
 for(const label of ['PT operandını düzenle','ET çıkış tagini düzenle','PV operandını düzenle','CV çıkış tagini düzenle','TON instance tagini düzenle','CTU instance tagini düzenle','Boş pin: kontak ekle','Boş yol: eleman eklemek için seç','Önüne ekle','Arkasına ekle','Hat sonuna eleman ekle','Karşılaştırma &gt;','TON komutu','CTU komutu','CTU R kolunun sol bağlantısını taşı','Motor start Ladder network’ü'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('<title>Karşılaştırma özellikleri</title>')&&html.includes('<title>Bobin / çıkış özellikleri</title>'));
 assert.ok(html.includes('<title>Sol ucu branch noktasına sürükle. Delete: bağlantıyı kaldır.</title>'));
 assert.doesNotMatch(html,/aria-label="(Edit|Insert|Empty|Add element)/);
 // SVG geometry and instruction mnemonics are language independent.
 const geometry=(h:string)=>(h.match(/<(?:line|path|rect|circle)\b[^>]*>/g)??[]).map(s=>s.replace(/aria-label="[^"]*"/g,''));
 assert.deepEqual(geometry(rung('en')),geometry(rung('tr')));
 for(const mnemonic of ['>TON<','>CTU<','>PT<','>PV<','>P_TRIG<','>Q<'])assert.ok(html.includes(mnemonic),mnemonic);
});
test('Rung connection drop targets are named per language',()=>{
 for(const [lang,before,after] of [['en','Branch connection point before $rail','Branch connection point after c1'],['tr','$rail öncesi branch bağlantı noktası','c1 sonrası branch bağlantı noktası']] as const){
  const view=mount(Rung,rungProps() as Parameters<typeof Rung>[0],lang);
  view.fire(view.find(e=>e.type==='g'&&e.props.className==='pin-connection-handle','pin handle'),'onClick',{stopPropagation:noop,detail:0});
  const html=view.html();assert.ok(html.includes(`aria-label="${before}"`),before);assert.ok(html.includes(`aria-label="${after}"`),after);
 }
});
test('Rung instance-name errors are keyed, not stored as text: the message follows the language',()=>{
 const view=mount(Rung,rungProps() as Parameters<typeof Rung>[0],'en');
 view.fire(view.find(e=>e.type==='g'&&e.props['aria-label']==='Edit CTU instance tag','instance target'),'onClick');
 const input=()=>view.find(e=>e.type==='input'&&/operand (editor|düzenleyici)$/.test(String(e.props['aria-label'])),'operand editor input');
 assert.equal(input().props['aria-label'],'INSTANCE operand editor');
 const small=()=>view.text(view.find(e=>e.type==='small','hint'));
 assert.equal(small(),'Instance name, e.g. Counter_1');
 view.setLang('tr');assert.equal(small(),'Instance adı: ör. Sayac_1');assert.equal(input().props['aria-label'],'INSTANCE operand düzenleyici');view.setLang('en');
 view.fire(input(),'onChange',{target:{value:'t1'}});view.fire(input(),'onBlur');
 assert.equal(small(),'This instance name is already in use.');
 view.setLang('tr');assert.equal(small(),'Bu instance adı zaten kullanılıyor.');view.setLang('en');
 view.fire(input(),'onChange',{target:{value:'1bad'}});view.fire(input(),'onBlur');
 assert.equal(small(),'Enter an instance name that starts with a letter or _.');
 view.setLang('tr');assert.equal(small(),'Harf veya _ ile başlayan bir instance adı yazın.');
});
test('Rung operand hints: PT, PV and output tag editors',()=>{
 for(const [lang,hints] of [['en',['T#3s, T#500ms or a TIME tag','Number or an integer tag']],['tr',['T#3s, T#500ms veya TIME tag','Sayı veya integer tag']]] as const){
  const view=mount(Rung,rungProps() as Parameters<typeof Rung>[0],lang);
  const label=(key:'rung.editPt'|'rung.editPv')=>editorDict[lang][key];
  view.fire(view.find(e=>e.props['aria-label']===label('rung.editPt'),'PT target'),'onClick');
  assert.equal(view.text(view.find(e=>e.type==='small','hint')),hints[0]);
  assert.equal(view.find(e=>e.type==='input'&&String(e.props['aria-label']).startsWith('PT'),'PT input').props.title,hints[0]);
  const pv=mount(Rung,rungProps() as Parameters<typeof Rung>[0],lang);
  pv.fire(pv.find(e=>e.props['aria-label']===label('rung.editPv'),'PV target'),'onClick');
  assert.equal(pv.text(pv.find(e=>e.type==='small','hint')),hints[1]);
  assert.equal(pv.find(e=>e.type==='input'&&String(e.props['aria-label']).startsWith('PV'),'PV input').props.title,lang==='en'?'Number or a tag of a suitable type':'Sayı veya uygun türde tag');
 }
});

// ---- Editor ----
test('Editor (en): ribbon, block title, comment, network header with colon and network controls',()=>{
 const html=chrome(render('en',createElement(Editor,editorProps({blockName:'Main Program Sweep (Cycle)'}))));
 for(const text of ['CONTACTS','COILS','TIMERS / COUNTERS','BRANCH / COMPARE','<span>Counter</span>','<span>IEC timer</span>','<span>Parallel</span>','<span>Series</span>','<span>Compare</span>','<span>Delete</span>','MOVE / Math / Conversion','<b>Block title:</b> “Main Program Sweep (Cycle)”','<div class="block-comment">Comment</div>','<b>Network 1:</b>','Add network'])assert.ok(html.includes(text),text);
 for(const label of ['Add parallel branch','Add series contact','Delete selected element','Collapse network 1','Network 1 title','Network 1 comment','Move network up','Move network down','Delete network'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('placeholder="Comment"'));
 assert.ok(html.includes('title="Normally Open Contact — TRUE when operand = 1"')&&html.includes('title="TON — on-delay timer (IN, PT, Q, ET)"'));
 assert.ok(html.includes('Select an element → click an instruction → assign a tag. Parallel: adds an alternative path to the selected element.'));
 assert.doesNotMatch(html,TURKISH);
});
test('Editor (tr): Turkish ribbon and network header, mnemonics stay untouched',()=>{
 const html=chrome(render('tr',createElement(Editor,editorProps({blockName:'Ana program çevrimi (Cycle)'}))));
 for(const text of ['KONTAKLAR','BOBİNLER','ZAMANLAYICILAR / SAYICILAR','BAĞLANTI / KARŞILAŞTIRMA','<span>Sayıcı</span>','<span>IEC zamanlayıcı</span>','<span>Paralel</span>','<span>Seri</span>','<span>Karşılaştır</span>','<span>Sil</span>','MOVE / Matematik / Dönüştürme','<b>Blok başlığı:</b> “Ana program çevrimi (Cycle)”','<div class="block-comment">Açıklama</div>','<b>Network 1:</b>','Network ekle'])assert.ok(html.includes(text),text);
 for(const label of ['Paralel kol ekle','Seri kontak ekle','Seçili elemanı sil','Network 1 kapat','Network 1 başlığı','Network 1 açıklaması','Network yukarı','Network aşağı','Network sil'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('placeholder="Açıklama"'));
 assert.ok(html.includes('title="Normalde açık kontak — operand = 1 iken TRUE"')&&html.includes('title="TON — çekme gecikmeli zamanlayıcı (IN, PT, Q, ET)"'));
 for(const mnemonic of ['aria-label="NO"','aria-label="NC"','aria-label="R_TRIG"','aria-label="TON"','aria-label="CTUD"','aria-label="COIL"'])assert.ok(html.includes(mnemonic),mnemonic);
 assert.doesNotMatch(html,/Block title|Network 1 comment|Add parallel/);
});
test('Editor: default block title follows the language; empty editor invites to build the first network',()=>{
 const en=chrome(render('en',createElement(Editor,editorProps({networks:[]})))),tr=chrome(render('tr',createElement(Editor,editorProps({networks:[]}))));
 assert.ok(en.includes('“Main Program Sweep (Cycle)”'));assert.ok(tr.includes('“Ana program çevrimi (Cycle)”'));
 assert.ok(en.includes('<h2>Build your first network</h2>')&&en.includes('＋ Add network'));assert.ok(tr.includes('<h2>İlk network’ünü kur</h2>')&&tr.includes('＋ Network ekle'));
 assert.doesNotMatch(en,TURKISH);
});
test('Editor: element properties (inspector) in English and Turkish',()=>{
 const target={nodeType:1} as unknown as HTMLElement;
 const cases:[string,string[],string[]][]=[
  ['ton',['Element properties','Timer instruction','Instance name','Timer instance name','PT operand','BOOL output: T1.Q · TIME output: T1.ET','Why TRUE / FALSE?','PT operand type','PT duration (ms)'],['Eleman özellikleri','Zamanlayıcı komutu','Instance adı','Zamanlayıcı instance adı','PT operandı','BOOL çıkış: T1.Q · TIME çıkış: T1.ET','Neden TRUE / FALSE?','PT operand türü','PT süresi (ms)']],
  ['ctu',['Counter instruction','Counter instance name','PV operand','BOOL outputs: C1.Q · Numeric output: C1.CV','Operand type','Constant value'],['Sayıcı komutu','Sayıcı instance adı','PV operandı','BOOL çıkışlar: C1.Q · Sayısal çıkış: C1.CV','Operand türü','Sabit değer']],
  ['c1',['Contact type','Contact operand / tag'],['Kontak türü','Kontak operandı / tag']],
  ['cmp',['Comparison','Operand type','Numeric tag','Constant value'],['Karşılaştırma','Operand türü','Sayısal tag','Sabit değer']],
  ['and',['Group logic'],['Grup mantığı']],
  ['n1',['Output instruction','Output tag'],['Çıkış komutu','Çıkış tag']],
 ];
 for(const lang of LANGS){
  for(const [id,en,tr] of cases){
   const view=mount(Editor,editorProps({inspectorTarget:target}),lang);
   view.fire(view.find(e=>e.type===Rung,'Rung'),'onSelect',id);
   const html=chrome(view.portalHtml()),expected=lang==='en'?en:tr,other=lang==='en'?tr:en;
   for(const text of expected)assert.ok(html.includes(text),`${lang} ${id}: ${text}`);
   for(const text of other.filter(x=>!expected.includes(x)&&!/^[A-Z]{2,}\b/.test(x)))assert.ok(!html.includes(text),`${lang} ${id} leaks ${text}`);
   if(lang==='en')assert.doesNotMatch(html,TURKISH,id);
  }
 }
 // The editor never uses upper-case "ELEMENT ÖZELLİKLERİ" any more.
 const view=mount(Editor,editorProps({inspectorTarget:target}),'tr');view.fire(view.find(e=>e.type===Rung,'Rung'),'onSelect','ton');
 assert.doesNotMatch(view.portalHtml(),/ELEMENT/);
});
test('Editor: branch connection result is reported in the current language',()=>{
 for(const [lang,done,missing] of [['en','Branch connection established.','The source branch of the connection has been deleted.'],['tr','Branch bağlantısı kuruldu.','Bağlantının kaynak branch’i silinmiş.']] as const){
  const changes:Network[][]=[];
  const view=mount(Editor,editorProps({onChange:(ns:Network[])=>changes.push(ns)}),lang);
  const rungEl=()=>view.find(e=>e.type===Rung,'Rung');
  const status=()=>view.text(view.find(e=>e.props.role==='status','status'));
  view.fire(rungEl(),'onConnect',{block:'ctu',pin:'reset',source:'missing',side:'after'});
  assert.equal(status(),missing);assert.equal(changes.length,0);
  view.fire(rungEl(),'onConnect',{block:'ctu',pin:'reset',source:'$rail',side:'before'});
  assert.equal(status(),done);assert.equal(changes.length,1);assert.deepEqual(changes[0][0].connections,[{block:'ctu',pin:'reset',source:'$rail',side:'before'}]);
 }
});

// ---- Tags / watch table ----
const tagsProps=(watch:boolean)=>({tags,values:{},forces:{START:true},onChange:noop,onInput:noop,onForce:noop,watch,locked:false});
test('Tag table (en): column headers, controls and labels',()=>{
 const html=chrome(render('en',createElement(Tags,tagsProps(false))));
 for(const h of ['Name','Data type','Address','Start value','Monitor value','Modify value','Input behavior','Comment'])assert.ok(html.includes(`>${h}</th>`),h);
 for(const label of ['Search tags','Tag name','Tag address','Tag comment','Delete tag MOTOR','Hold JOG','LEVEL numeric input','Toggle START','Data type','Start value','JOG input behavior'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('placeholder="Search by tag or address…"')&&html.includes('＋ Add tag'));
 assert.ok(html.includes('Change inputs with Modify value; follow the result in Main with Monitoring.'));
 assert.ok(html.includes('○ Hold'));assert.ok(html.includes('title="Momentary input: TRUE while pressed, FALSE when released"'));
 assert.doesNotMatch(html,TURKISH);assert.doesNotMatch(html,/Current value|Initial value/);
});
test('Tag table (tr): Turkish headers and controls, tag data stays as written',()=>{
 const html=chrome(render('tr',createElement(Tags,tagsProps(false))));
 for(const h of ['Ad','Veri tipi','Adres','Başlangıç değeri','İzleme değeri','Değiştirme değeri','Giriş davranışı','Açıklama'])assert.ok(html.includes(`>${h}</th>`),h);
 for(const label of ['Tag ara','Tag adı','Tag adresi','Tag açıklaması','MOTOR tag sil','JOG basılı tut','LEVEL sayısal giriş','START değiştir','JOG giriş davranışı'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.ok(html.includes('placeholder="Tag veya adres ara…"')&&html.includes('＋ Tag ekle'));
 assert.ok(html.includes('○ Basılı tut'));assert.ok(html.includes('title="Momentary giriş: basınca TRUE, bırakınca FALSE"'));
 assert.ok(render('tr',createElement(Tags,tagsProps(false))).includes('value="Başlat düğmesi"'),'tag comments are data');
 assert.doesNotMatch(html,/>(Name|Address|Comment|Data type)<\/th>/);
});
test('Watch table: headers, force controls and hint in both languages',()=>{
 const en=chrome(render('en',createElement(Tags,tagsProps(true)))),tr=chrome(render('tr',createElement(Tags,tagsProps(true))));
 const headers=(html:string)=>[...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m=>m[1]);
 assert.deepEqual(headers(en),['Name','Address','Data type','Monitor value','Modify value','Force']);
 assert.deepEqual(headers(tr),['Ad','Adres','Veri tipi','İzleme değeri','Değiştirme değeri','Zorlama']);
 assert.ok(en.includes('>FORCE true ×</button>')&&en.includes('>Force value</button>')&&en.includes('Change inputs or apply an explicit force.'));
 assert.ok(tr.includes('>ZORLAMA true ×</button>')&&tr.includes('>Değeri zorla</button>')&&tr.includes('Girişleri değiştir veya açıkça zorlama uygula.'));
 assert.ok(en.includes('>TRUE</button>')&&tr.includes('>TRUE</button>')&&tr.includes('>FALSE</button>'));
 assert.doesNotMatch(en,TURKISH);
});

// ---- process screen, industrial scenes, signal diagram ----
const plantFor=(id:number,lang:Lang)=>{const c=challenge(id,0,lang);return {c,state:new Plant(c.plant,lang).snapshot()};};
const processHtml=(id:number,lang:Lang)=>{const {c,state}=plantFor(id,lang);return chrome(render(lang,createElement(Process,{plant:state,c,values:{},inputs:{},onInput:noop,send:noop})));};
test('Process screen (conveyor / tank): all text follows the language',()=>{
 for(const id of [11,14]){
  const en=processHtml(id,'en'),tr=processHtml(id,'tr');
  for(const text of ['PROCESS SIMULATION','IDLE','Automatic sensors','Closed-loop sensors','MANUAL INPUTS','TRUE = active','aria-label="Process diagram driven by the PLC outputs"','aria-label="Sensor fault"'])assert.ok(en.includes(text),`en ${id}: ${text}`);
  for(const text of ['PROSES SİMÜLASYONU','BEKLEME','Otomatik sensörler','Kapalı çevrim sensörleri','MANUEL GİRİŞLER','TRUE = aktif','aria-label="PLC çıkışlarından beslenen proses şeması"','aria-label="Sensör arızası"'])assert.ok(tr.includes(text),`tr ${id}: ${text}`);
  assert.doesNotMatch(en,TURKISH,`en ${id}`);
 }
 assert.ok(processHtml(11,'en').includes('Place product')&&processHtml(11,'tr').includes('Ürün yerleştir'));
 assert.ok(processHtml(11,'en').includes('0 products')&&processHtml(11,'tr').includes('0 ürün'));
 assert.ok(processHtml(14,'en').includes('Change the inputs in the panel below.')&&processHtml(14,'tr').includes('Girişleri aşağıdaki panelden değiştir.'));
});
test('Process screen: motor exercises show the signal diagram',()=>{
 const en=processHtml(1,'en'),tr=processHtml(1,'tr');
 assert.ok(en.includes('PLC_1 · Signal and actuator monitoring')&&en.includes('aria-label="PLC outputs and the states of the connected actuators"')&&en.includes('Change feedback and requests in the input panel; watch the command and alarm results.'));
 assert.ok(tr.includes('PLC_1 · Sinyal ve aktüatör izleme')&&tr.includes('aria-label="PLC çıkışları ve bağlı aktüatör durumları"')&&tr.includes('Geri bildirim ve talepleri giriş panelinden değiştir; komut ve alarm sonuçlarını izle.'));
 assert.doesNotMatch(en,TURKISH);
 const direct=chrome(render('tr',createElement(SignalDiagram,{tags:challenge(1).tags,values:{}})));assert.ok(direct.includes('Sinyal ve aktüatör izleme'));
});
test('Industrial scenes (water / mixer / roaster): titles, status, measures, trend and alarms follow the language',()=>{
 const scene=(id:number,lang:Lang,values:Record<string,boolean>={})=>{const {state}=plantFor(id,lang);return chrome(render(lang,createElement(IndustrialScene,{plant:state,values})));};
 const expect:[number,string,string,string[],string[]][]=[
  [21,'TK-101 · Water filling and transfer','TK-101 · Su dolum ve transfer',['Process diagram of the fill valve, level switches and transfer pump','1000 L · training tank','Fill → high level → transfer → empty tank','Level (%)'],['Dolum valfi, seviye şalterleri ve transfer pompası proses şeması','1000 L · eğitim tankı','Dolum → üst seviye → transfer → boş tank','Seviye (%)']],
  [22,'MX-201 · Paint preparation','MX-201 · Boya hazırlama',['Process diagram of the A and B dosing valves, agitator and tank level','Recipe: A 60 units + B 30 units','Mix (%)'],['A ve B dozaj valfleri, karıştırıcı ve tank seviyesi proses şeması','Reçete: A 60 birim + B 30 birim','Karışım (%)']],
  [23,'R-301 · Nut roasting','R-301 · Çerez kavurma',['Process diagram of the drum, heater, fan and discharge flap','% load','Product load','Temperature (°C)'],['Tambur, ısıtıcı, fan ve boşaltma klapesi proses şeması','% yük','Ürün yükü','Sıcaklık (°C)']],
 ];
 for(const [id,enTitle,trTitle,enText,trText] of expect){
  const en=scene(id,'en'),tr=scene(id,'tr');
  assert.ok(en.includes(`<b>${enTitle}</b>`),enTitle);assert.ok(tr.includes(`<b>${trTitle}</b>`),trTitle);
  for(const text of ['IDLE','Virtual time','Trace · last 60 s','Process trend chart over time','● No active process alarms',...enText])assert.ok(en.includes(text),`en ${id}: ${text}`);
  for(const text of ['BEKLEME','Sanal süre','Trace · son 60 s','Zamana bağlı proses trend grafiği','● Aktif proses alarmı yok',...trText])assert.ok(tr.includes(text),`tr ${id}: ${text}`);
  assert.doesNotMatch(en,TURKISH,`en ${id}`);
 }
 assert.ok(scene(21,'en',{RUN:true}).includes('<span>CYCLE ACTIVE</span>')&&scene(21,'tr',{RUN:true}).includes('<span>ÇEVRİM AKTİF</span>'));
 assert.ok(scene(21,'en',{DONE:true,RUN:true}).includes('<span>BATCH COMPLETE</span>')&&scene(21,'tr',{DONE:true}).includes('<span>PARTİ TAMAMLANDI</span>'));
 // Tag names and mnemonics in the drawing are never translated.
 for(const word of ['HEATER','DRUM','FAN','DISCHARGE'])assert.ok(scene(23,'tr').includes(`>${word}`),word);
});

// ---- small widgets ----
test('MomentaryInput: label, tooltip and caption follow the language',()=>{
 const html=(lang:Lang)=>render(lang,createElement(MomentaryInput,{name:'START',onInput:noop}));
 assert.ok(html('en').includes('aria-label="Hold START"')&&html('en').includes('title="Momentary input: TRUE while pressed, FALSE when released"')&&html('en').includes('○ Hold'));
 assert.ok(html('tr').includes('aria-label="START basılı tut"')&&html('tr').includes('title="Momentary giriş: basınca TRUE, bırakınca FALSE"')&&html('tr').includes('○ Basılı tut'));
 assert.doesNotMatch(html('en'),TURKISH);
});
test('ResizableWorkspace: splitter labels and tooltip follow the language; behaviour attributes are unchanged',()=>{
 const html=(lang:Lang,right:boolean)=>render(lang,createElement(ResizableWorkspace,{className:'w',right,bottomOpen:true,onOpenBottom:noop,children:createElement('div')}));
 const en=html('en',true),tr=html('tr',true);
 for(const label of ['Project tree width','Right pane width','Bottom pane height'])assert.ok(en.includes(`aria-label="${label}"`),label);
 for(const label of ['Proje ağacı genişliği','Sağ panel genişliği','Alt panel yüksekliği'])assert.ok(tr.includes(`aria-label="${label}"`),label);
 assert.equal((en.match(/title="Drag to resize · Double-click: default size"/g)??[]).length,3);assert.equal((tr.match(/title="Boyutlandırmak için sürükle · Çift tık: varsayılan boyut"/g)??[]).length,3);
 assert.equal((html('en',false).match(/role="separator"/g)??[]).length,2);assert.doesNotMatch(en,TURKISH);
 assert.ok(en.includes('aria-orientation="horizontal"')&&en.includes('aria-orientation="vertical"'));
});
test('MenuBar: the landmark label follows the language and menu names come from the caller',()=>{
 const html=(lang:Lang)=>render(lang,createElement(MenuBar,{menus:[{name:lang==='en'?'Project':'Proje',items:[{label:'x',run:noop}]}]}));
 assert.ok(html('en').includes('aria-label="Application menu"')&&html('en').includes('>Project<'));
 assert.ok(html('tr').includes('aria-label="Uygulama menüsü"')&&html('tr').includes('>Proje<'));
});
