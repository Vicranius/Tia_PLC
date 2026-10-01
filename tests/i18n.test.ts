import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {createElement,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DEFAULT_LANG,LANGS,LANG_COOKIE,LANG_NAMES,defineDict,format,isLang,langOf,parseAcceptLanguage,pick,pickLanguage,readLangCookie,resolveLanguage,translator,type Lang} from '../src/i18n/core';
import {LanguageProvider,useLang,useT} from '../src/i18n/react';
import {portalDict} from '../src/i18n/dict/portal';

// Same decision the server makes in app/page.tsx and app/layout.tsx.
const server=(cookieHeader:string|null|undefined,acceptLanguage:string|null|undefined)=>resolveLanguage(readLangCookie(cookieHeader),parseAcceptLanguage(acceptLanguage));

test('constants: English is the default, Turkish the second language, the cookie is plc_lang',()=>{
 assert.deepEqual([...LANGS],['en','tr']);assert.equal(DEFAULT_LANG,'en');assert.equal(LANG_COOKIE,'plc_lang');
 assert.deepEqual(LANG_NAMES,{en:'English',tr:'Türkçe'});
});
test('isLang / langOf accept only the two supported codes, exactly',()=>{
 for(const v of['en','tr'])assert.equal(isLang(v),true,v);
 for(const v of['EN','TR','en-US','tr-TR','de','',' tr',null,undefined,1,{},['tr']])assert.equal(isLang(v),false,String(v));
 assert.equal(langOf('tr'),'tr');assert.equal(langOf('en'),'en');
 for(const v of['de','TR','',null,undefined,0,{}])assert.equal(langOf(v),'en',String(v));
});

test('pickLanguage: the first supported preference wins, otherwise English',()=>{
 assert.equal(pickLanguage(['tr-TR']),'tr');
 assert.equal(pickLanguage(['tr']),'tr');
 assert.equal(pickLanguage(['en-US','tr']),'en');
 assert.equal(pickLanguage(['de','tr-TR']),'tr');
 assert.equal(pickLanguage(['de','fr','tr','en']),'tr');
 assert.equal(pickLanguage(['de','fr']),'en');
 assert.equal(pickLanguage([]),'en');
 assert.equal(pickLanguage(['en']),'en');
 assert.equal(pickLanguage(['en-GB','tr-TR']),'en');
});
test('pickLanguage: casing, underscores, whitespace and odd tags',()=>{
 for(const tag of['TR','Tr','tR-tr','TR-tr','tr_TR','Tr_tr','  tr-TR  ','\ttr\n','tr-','tr_','tr-Latn-TR','tr-u-nu-latn'])assert.equal(pickLanguage([tag]),'tr',JSON.stringify(tag));
 for(const tag of['EN','En-us','en_GB','  en  ','en-'])assert.equal(pickLanguage([tag,'tr']),'en',JSON.stringify(tag));
 // Only the primary subtag counts: a region that happens to be "TR" does not make a tag Turkish.
 for(const tag of['de-TR','zh-TR','ku-TR','az-TR','tr1','trx','tur','turkish','english','tr.TR','t','','  ','-','_','-tr','_tr','*','*;q=0.5','x-tr'])assert.equal(pickLanguage([tag]),'en',JSON.stringify(tag));
 assert.equal(pickLanguage(['de-TR','tr']),'tr','unsupported entries are skipped, not fatal');
 assert.equal(pickLanguage(['','  ','*','tr']),'tr');
});
test('pickLanguage does not mutate its input and works with readonly / frozen arrays',()=>{
 const prefs=Object.freeze(['de','tr-TR','en']);assert.equal(pickLanguage(prefs),'tr');assert.deepEqual([...prefs],['de','tr-TR','en']);
});

test('parseAcceptLanguage: empty and missing headers',()=>{
 assert.deepEqual(parseAcceptLanguage(null),[]);assert.deepEqual(parseAcceptLanguage(undefined),[]);assert.deepEqual(parseAcceptLanguage(''),[]);
 assert.deepEqual(parseAcceptLanguage('   '),[]);assert.deepEqual(parseAcceptLanguage(',,, ,'),[]);assert.deepEqual(parseAcceptLanguage(';q=0.5'),[]);
});
test('parseAcceptLanguage: orders by q, highest first',()=>{
 assert.deepEqual(parseAcceptLanguage('tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'),['tr-TR','tr','en-US','en']);
 assert.deepEqual(parseAcceptLanguage('en;q=0.5,tr;q=0.9'),['tr','en']);
 assert.deepEqual(parseAcceptLanguage('en;q=0.8,tr'),['tr','en'],'no q means q=1 and beats an earlier q=0.8');
 assert.deepEqual(parseAcceptLanguage('en;q=0.1,de;q=0.7,tr;q=0.4,fr'),['fr','de','tr','en']);
 assert.deepEqual(parseAcceptLanguage('en;q=0.123,tr;q=0.1234'),['tr','en'],'more than three decimals still sorts');
 assert.deepEqual(parseAcceptLanguage('en;q=1,tr;q=1.0'),['en','tr']);
});
test('parseAcceptLanguage: equal q values keep header order (stable)',()=>{
 assert.deepEqual(parseAcceptLanguage('de;q=0.8,tr;q=0.8,en;q=0.8'),['de','tr','en']);
 assert.deepEqual(parseAcceptLanguage('tr,en,de'),['tr','en','de']);
 assert.deepEqual(parseAcceptLanguage('en,tr'),['en','tr']);
 const many=Array.from({length:40},(_,i)=>`l${i}`);assert.deepEqual(parseAcceptLanguage(many.join(',')),many);
 assert.deepEqual(parseAcceptLanguage('a;q=0.5,b,c;q=0.5,d'),['b','d','a','c']);
});
test('parseAcceptLanguage: q=0 means "not acceptable" and is dropped; wildcard is dropped',()=>{
 assert.deepEqual(parseAcceptLanguage('tr;q=0,en'),['en']);
 assert.deepEqual(parseAcceptLanguage('tr;q=0.0,en;q=0.000'),[]);
 assert.deepEqual(parseAcceptLanguage('en,tr;q=0.001'),['en','tr'],'tiny but positive q is kept');
 assert.deepEqual(parseAcceptLanguage('*'),[]);assert.deepEqual(parseAcceptLanguage('*;q=0.5'),[]);assert.deepEqual(parseAcceptLanguage('*,tr'),['tr']);
 assert.deepEqual(parseAcceptLanguage('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5'),['fr-CH','fr','en','de']);
});
test('parseAcceptLanguage: whitespace, extra parameters and garbage',()=>{
 assert.deepEqual(parseAcceptLanguage(' tr-TR , en ; q=0.5 '),['tr-TR','en']);
 assert.deepEqual(parseAcceptLanguage('en;q=0.5;level=1,tr;level=2;q=0.9'),['tr','en']);
 assert.deepEqual(parseAcceptLanguage('tr;q=abc,en'),['en'],'unparsable q is treated as not acceptable');
 assert.deepEqual(parseAcceptLanguage('tr;q=,en'),['en']);assert.deepEqual(parseAcceptLanguage('tr;q=-1,en'),['en']);assert.deepEqual(parseAcceptLanguage('tr;q=NaN,en'),['en']);assert.deepEqual(parseAcceptLanguage('tr;q=Infinity,en'),['en']);
 assert.deepEqual(parseAcceptLanguage('tr;foo,en'),['tr','en'],'parameter without q is ignored');
 assert.deepEqual(parseAcceptLanguage('!!!'),['!!!'],'garbage tags pass through; pickLanguage ignores them');
 assert.equal(pickLanguage(parseAcceptLanguage('!!!;;;,<script>,%00')),'en');
 assert.deepEqual(parseAcceptLanguage('x'.repeat(5000)),['x'.repeat(5000)]);
 assert.doesNotThrow(()=>parseAcceptLanguage('\u0000￿;q=\u0000,;,;;;q=1;;'));
});
test('Accept-Language end to end: realistic browser headers',()=>{
 const cases:[string|null|undefined,Lang][]=[
  ['tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7','tr'],['tr','tr'],['tr-TR','tr'],['TR-tr','tr'],['tr_TR','tr'],
  ['en-US,en;q=0.9,tr;q=0.8','en'],['en-US','en'],['en','en'],
  ['de-DE,de;q=0.9,en;q=0.8','en'],['de-DE,de;q=0.9','en'],['de-DE,tr;q=0.5','tr'],['fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5','en'],
  ['zh-TW,zh;q=0.9','en'],['ja','en'],['az-TR,az;q=0.9','en'],
  ['*','en'],['','en'],[null,'en'],[undefined,'en'],
  ['tr;q=0','en'],['tr;q=0,en;q=0.5','en'],['tr;q=0,de','en'],['en;q=0.1,tr','tr'],['en;q=0.2,tr;q=0.3','tr'],['de,tr;q=0.1','tr'],
 ];
 for(const [header,expected] of cases)assert.equal(pickLanguage(parseAcceptLanguage(header)),expected,String(header));
});

test('resolveLanguage: a valid cookie always beats the browser',()=>{
 assert.equal(resolveLanguage('tr',['en-US']),'tr');assert.equal(resolveLanguage('en',['tr-TR']),'en');
 assert.equal(resolveLanguage('tr',[]),'tr');assert.equal(resolveLanguage('en',['tr','de']),'en');
 assert.equal(resolveLanguage('tr',['tr']),'tr');assert.equal(resolveLanguage('en',['de']),'en');
});
test('resolveLanguage: a missing or invalid cookie is ignored and the browser decides',()=>{
 assert.equal(resolveLanguage(undefined,['tr-TR']),'tr');assert.equal(resolveLanguage(null,['tr']),'tr');assert.equal(resolveLanguage('',['tr']),'tr');
 for(const bad of['de','TR','En','tr-TR','en-US',' tr','tr ','null','undefined','0'])assert.equal(resolveLanguage(bad,['tr']),'tr',`bad cookie ${JSON.stringify(bad)} falls to browser (tr)`);
 for(const bad of['de','TR','tr-TR'])assert.equal(resolveLanguage(bad,['en']),'en',bad);
 assert.equal(resolveLanguage(undefined,[]),'en');assert.equal(resolveLanguage('xx',['de']),'en');
});

test('readLangCookie: finds plc_lang among other cookies',()=>{
 assert.equal(readLangCookie('plc_lang=tr'),'tr');assert.equal(readLangCookie('plc_lang=en'),'en');
 assert.equal(readLangCookie('a=b; plc_lang=en; c=d'),'en');assert.equal(readLangCookie('plc_lang=tr; a=b'),'tr');
 assert.equal(readLangCookie('a=b;plc_lang=tr'),'tr','no space after the semicolon');assert.equal(readLangCookie('a=b;   plc_lang=tr;c=d'),'tr','several spaces');
 assert.equal(readLangCookie('theme=dark; plc_lang=tr'),'tr');
 assert.equal(readLangCookie('plc_lang=en; plc_lang=tr'),'en','first one wins');
});
test('readLangCookie: absent, invalid and look-alike cookies give undefined',()=>{
 for(const h of[undefined,null,'','a=b','; ;',' '])assert.equal(readLangCookie(h),undefined,String(h));
 for(const h of['plc_lang=','plc_lang=de','plc_lang=TR','plc_lang=EN','plc_lang=tr-TR','plc_lang=trx','plc_lang=t','plc_lang="tr"','plc_lang=%74r','plc_lang=tr ','plc_lang =tr','PLC_LANG=tr'])assert.equal(readLangCookie(h),undefined,JSON.stringify(h));
 for(const h of['xplc_lang=tr','a=b;xplc_lang=tr','my_plc_lang=en','plc_lang_old=tr','plc_lang2=tr','a=plc_lang=tr','a=1,plc_lang=tr'])assert.equal(readLangCookie(h),undefined,JSON.stringify(h));
});
test('readLangCookie + resolveLanguage: server-side decision (cookie, else Accept-Language)',()=>{
 assert.equal(server(undefined,'tr-TR,tr;q=0.9'),'tr');assert.equal(server(undefined,'en-US'),'en');assert.equal(server(undefined,undefined),'en');assert.equal(server('',null),'en');
 assert.equal(server('plc_lang=en','tr-TR,tr;q=0.9'),'en','manual English beats a Turkish browser');
 assert.equal(server('plc_lang=tr','en-US,en;q=0.9'),'tr','manual Turkish beats an English browser');
 assert.equal(server('plc_lang=tr','de-DE'),'tr');assert.equal(server('x=1; plc_lang=en; y=2','tr'),'en');
 assert.equal(server('plc_lang=fr','tr'),'tr','garbage cookie value is ignored');assert.equal(server('plc_lang=fr','de'),'en');
 assert.equal(server('other=tr','de'),'en');
});

test('format: fills {name} placeholders with strings, numbers and booleans',()=>{
 assert.equal(format('Hello {name}',{name:'Ada'}),'Hello Ada');
 assert.equal(format('{a}+{b}={c}',{a:1,b:2,c:3}),'1+2=3');
 assert.equal(format('{n}',{n:0}),'0');assert.equal(format('{ok}/{no}',{ok:true,no:false}),'true/false');assert.equal(format('{x}',{x:''}),'');
 assert.equal(format('{a} {a} {a}',{a:'x'}),'x x x','repeated placeholders');
 assert.equal(format('exercise {id} “{project}”',{id:'07',project:'Line_9'}),'exercise 07 “Line_9”');
 assert.equal(format('{a}{b}',{a:'1',b:'2'}),'12');assert.equal(format('Opened project: {project} · {id} {title}',{project:'P',id:'07',title:'T'}),'Opened project: P · 07 T');
});
test('format: missing params are left intact, never "undefined"',()=>{
 assert.equal(format('{a} and {b}',{a:1}),'1 and {b}');assert.equal(format('{a}',{}),'{a}');assert.equal(format('x {missing} y',{other:'o'}),'x {missing} y');
 assert.equal(format('{a} {b} {c}',{b:'B'}),'{a} B {c}');
 assert.doesNotMatch(format('{a} {b}',{c:1}),/undefined|null|NaN/);
});
test('format: without params the template is returned untouched',()=>{
 assert.equal(format('Hello {name}'),'Hello {name}');assert.equal(format('Hello {name}',undefined),'Hello {name}');assert.equal(format(''),'');assert.equal(format('',{a:1}),'');
 assert.equal(format('no placeholders',{a:1}),'no placeholders');
});
test('format: only {word} is a placeholder; replacement values are inserted literally and not expanded again',()=>{
 for(const t of['{}','{ a }','{a b}','{a-b}','{a.b}','{{}}x','{','}','a{','}{a','{a','a}','$a','%s'])assert.equal(format(t,{a:'X'}),t,JSON.stringify(t));
 assert.equal(format('{{a}}',{a:'X'}),'{X}','braces around a placeholder survive');
 assert.equal(format('{a}',{a:'{b}'}),'{b}');assert.equal(format('{a} {b}',{a:'{b}',b:'B'}),'{b} B','no recursive expansion');
 for(const v of['$&','$1','$$','$`',"$'",'\\1','$<x>'])assert.equal(format('[{a}]',{a:v}),`[${v}]`,`value ${v}`);
 assert.equal(format('{a_1}',{a_1:'ok'}),'ok');assert.equal(format('{A}',{a:'x'}),'{A}','keys are case-sensitive');assert.equal(format('{1}',{1:'one'}),'one');
 assert.equal(format('line1\n{a}\nline3',{a:'2'}),'line1\n2\nline3');
 assert.equal(format('{a}',{a:'ğüşiöçİı'}),'ğüşiöçİı');
});

test('defineDict returns the two tables unchanged; translator picks the language',()=>{
 const en={'a':'Hello {n}','b':'Bye'},tr={'a':'Merhaba {n}','b':'Hoşça kal'};
 const d=defineDict(en,tr);assert.equal(d.en,en);assert.equal(d.tr,tr);assert.deepEqual(Object.keys(d).sort(),['en','tr']);
 assert.equal(translator(d,'en')('a',{n:1}),'Hello 1');assert.equal(translator(d,'tr')('a',{n:1}),'Merhaba 1');
 assert.equal(translator(d,'tr')('b'),'Hoşça kal');assert.equal(translator(d,'en')('b'),'Bye');
 assert.equal(translator(d,'tr')('a'),'Merhaba {n}','missing params stay intact through the translator');
 const t=translator(d,'tr');assert.equal(t('b'),t('b'),'translator is pure');
});
test('translator falls back to English for a key missing in Turkish, and to the key itself when missing everywhere',()=>{
 const d=defineDict({a:'English A',b:'English {x}'},{a:'Türkçe A',b:'Türkçe {x}'});
 const partial={en:d.en,tr:{a:'Türkçe A'}} as unknown as typeof d;
 const t=translator(partial,'tr');assert.equal(t('a'),'Türkçe A');assert.equal(t('b',{x:5}),'English 5','fallback is formatted too');
 const none=translator({en:{},tr:{}} as unknown as typeof d,'tr');assert.equal(none('b',{x:5}),'b','unknown key renders as the key');
 const emptyTr=translator({en:{a:'English A'},tr:{}} as unknown as typeof d,'tr');assert.equal(emptyTr('a'),'English A');
 assert.equal(translator(partial,'en')('b',{x:1}),'English 1');
});
test('defineDict is checked by the compiler: missing, extra and non-string Turkish entries are rejected',()=>{
 // These @ts-expect-error lines fail `npm run typecheck` if the compiler ever stops rejecting them.
 // @ts-expect-error the Turkish table is missing key b
 const missing=defineDict({a:'x',b:'y'},{a:'z'});
 // @ts-expect-error the Turkish table has an extra key c
 const extra=defineDict({a:'x'},{a:'z',c:'w'});
 // @ts-expect-error Turkish values must be strings
 const wrong=defineDict({a:'x'},{a:1});
 const ok=defineDict({a:'x'},{a:'z'});
 const key:'a'=Object.keys(ok.en)[0] as keyof typeof ok.en;assert.equal(translator(ok,'tr')(key),'z');
 void missing;void extra;void wrong;
});

test('pick: reads inline {en,tr} text, falls back to English, and formats',()=>{
 const text={en:'Start the motor',tr:'Motoru çalıştır'};
 assert.equal(pick(text,'en'),'Start the motor');assert.equal(pick(text,'tr'),'Motoru çalıştır');
 assert.equal(pick({en:'English',tr:''},'tr'),'English','empty Turkish falls back to English');
 assert.equal(pick({en:'Hold {s} s',tr:'{s} sn bekle'},'tr',{s:3}),'3 sn bekle');assert.equal(pick({en:'Hold {s} s',tr:'{s} sn bekle'},'en',{s:3}),'Hold 3 s');
 assert.equal(pick({en:'Hold {s} s',tr:'{s} sn bekle'},'tr'),'{s} sn bekle');
});

// --- portalDict -----------------------------------------------------------------------------------------------------------------
const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
// Values that are intentionally identical in both languages (identifiers, abbreviations).
const sameInBoth=new Set(['create.no']);

test('portalDict: English and Turkish have identical key sets',()=>{
 const en=Object.keys(portalDict.en).sort(),tr=Object.keys(portalDict.tr).sort();
 assert.ok(en.length>=60,`unexpectedly small dictionary (${en.length})`);
 assert.deepEqual(tr.filter(k=>!en.includes(k)),[],'keys only in Turkish');assert.deepEqual(en.filter(k=>!tr.includes(k)),[],'keys only in English');
 assert.deepEqual(tr,en);
});
test('portalDict: no empty, blank, untrimmed or key-like values',()=>{
 for(const lang of LANGS)for(const [k,v] of Object.entries(portalDict[lang])){
  assert.equal(typeof v,'string',`${lang}/${k}`);assert.ok(v.trim().length>0,`${lang}/${k} is empty`);assert.equal(v,v.trim(),`${lang}/${k} has outer whitespace`);
  assert.notEqual(v,k,`${lang}/${k} is just its key`);assert.doesNotMatch(v,/^[a-z]+\.[A-Za-z0-9]+$/,`${lang}/${k} looks like a raw key`);
  assert.doesNotMatch(v,/undefined|\[object|TODO|FIXME|XXX/,`${lang}/${k}`);
  assert.doesNotMatch(v,/\{\s|\s\}|\{\}/,`${lang}/${k} has a malformed placeholder`);
 }
});
test('portalDict: both languages use the same placeholders for every key',()=>{
 for(const k of Object.keys(portalDict.en) as (keyof typeof portalDict.en)[])assert.deepEqual(placeholders(portalDict.tr[k]),placeholders(portalDict.en[k]),k);
 const used=new Set(Object.values(portalDict.en).flatMap(placeholders));assert.deepEqual([...used].sort(),['id','portal','project','title']);
});
test('portalDict: Turkish is actually translated (differs from English except the known identical entries)',()=>{
 const same=(Object.keys(portalDict.en) as (keyof typeof portalDict.en)[]).filter(k=>portalDict.en[k]===portalDict.tr[k]);
 assert.deepEqual(same.filter(k=>!sameInBoth.has(k)),[],'untranslated Turkish values (add to sameInBoth only if intentional)');
});
test('portalDict: Turkish values use Turkish letters where expected and never the ASCII apostrophe before a suffix',()=>{
 const tr=Object.values(portalDict.tr).join('\n');assert.match(tr,/[çğıöşüÇĞİÖŞÜ]/);
 assert.doesNotMatch(tr,/\w'\w/,'docs/I18N.md: use the typographic apostrophe ’ for suffixes');
});
test('portalDict: the language action keys exist in both languages',()=>{
 assert.equal(portalDict.en['action.language'],'User interface language');assert.equal(portalDict.tr['action.language'],'Arayüz dili');
 assert.equal(portalDict.en['portal.start'],'Start');assert.equal(portalDict.tr['portal.start'],'Başlangıç');
 assert.equal(portalDict.tr['action.first'],'İlk adımlar');assert.equal(portalDict.tr['common.projectView'],'Proje görünümü');
});

// --- React layer ----------------------------------------------------------------------------------------------------------------
type Effect={fn:()=>unknown;deps?:readonly unknown[]};
const internals=(React as unknown as {__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:{H:unknown}}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const g=globalThis as unknown as Record<string,unknown>;
// Runs `fn` with a stubbed navigator / document, restoring the originals (Node 22 has a global navigator getter).
function withBrowser<T>(nav:{languages?:readonly string[];language?:string}|undefined,fn:(doc:{cookie:string;documentElement:{lang:string}})=>T,doc:{cookie:string;documentElement:{lang:string}}={cookie:'',documentElement:{lang:''}}):T{
 const navDesc=Object.getOwnPropertyDescriptor(globalThis,'navigator'),docDesc=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'navigator',{value:nav,configurable:true,writable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true,writable:true});
 try{return fn(doc);}finally{
  if(navDesc)Object.defineProperty(globalThis,'navigator',navDesc);else delete g.navigator;
  if(docDesc)Object.defineProperty(globalThis,'document',docDesc);else delete g.document;
 }
}
// Hook harness for LanguageProvider: state survives re-renders and effects run when their deps change, like React after commit.
function provider(initial:Lang,explicit:boolean){
 const state:unknown[]=[],deps:(readonly unknown[]|undefined)[]=[];let value!:{lang:Lang;setLang:(l:Lang)=>void};let renders=0,dirty=false;
 const once=()=>{
  let i=0;const pending:{k:number;e:Effect}[]=[],prev=internals.H;
  internals.H={
   useState:(init:unknown)=>{const k=i++;if(!(k in state))state[k]=init;return[state[k],(v:unknown)=>{state[k]=v;dirty=true;}];},
   useEffect:(fn:()=>unknown,d?:readonly unknown[])=>{pending.push({k:i++,e:{fn,deps:d}});},
   useMemo:(fn:()=>unknown)=>fn(),useCallback:(fn:unknown)=>fn,
  };
  try{const el=LanguageProvider({initial,explicit,children:null}) as ReactElement<{value:typeof value}>;value=el.props.value;renders++;}finally{internals.H=prev;}
  for(const {k,e} of pending){const old=deps[k],changed=!e.deps||!old||e.deps.some((d,j)=>!Object.is(d,old[j]));if(changed){deps[k]=e.deps;e.fn();}}
 };
 // Like React: a state update (also from an effect) re-renders, and effects whose deps changed run again.
 const render=()=>{for(let n=0;n<10;n++){dirty=false;once();if(!dirty)return;}throw new Error('LanguageProvider does not settle');};
 render();
 return {get lang(){return value.lang;},get renders(){return renders;},setLang:(l:Lang)=>{value.setLang(l);render();},rerender:render};
}

test('LanguageProvider: starts in the server language; an explicit choice is never overridden by the browser',()=>{
 withBrowser({languages:['tr-TR','tr'],language:'tr-TR'},doc=>{
  const p=provider('en',true);assert.equal(p.lang,'en');assert.equal(doc.documentElement.lang,'en');assert.equal(doc.cookie,'','explicit choice does not rewrite the cookie');
  p.rerender();assert.equal(p.lang,'en');
 });
 withBrowser({languages:['en-US'],language:'en-US'},doc=>{const p=provider('tr',true);assert.equal(p.lang,'tr');assert.equal(doc.documentElement.lang,'tr');});
});
test('LanguageProvider: without a cookie the browser (navigator.languages) re-checks the language and flips it',()=>{
 withBrowser({languages:['tr-TR','en'],language:'tr-TR'},doc=>{const p=provider('en',false);assert.equal(p.lang,'tr');assert.equal(doc.documentElement.lang,'tr');assert.equal(doc.cookie,'','automatic detection does not store a cookie');assert.equal(p.renders,2,'one extra render, no loop');});
 withBrowser({languages:['en-US','tr'],language:'en-US'},()=>{const p=provider('tr',false);p.rerender();assert.equal(p.lang,'en');});
 withBrowser({languages:['de','tr-TR'],language:'de'},()=>{const p=provider('en',false);p.rerender();assert.equal(p.lang,'tr');});
 withBrowser({languages:['de','fr'],language:'de'},()=>{const p=provider('en',false);p.rerender();assert.equal(p.lang,'en','unsupported languages stay English');});
 withBrowser({languages:['tr-TR'],language:'tr-TR'},()=>{const p=provider('tr',false);p.rerender();assert.equal(p.lang,'tr','agreeing browser changes nothing');});
});
test('LanguageProvider: falls back to navigator.language when navigator.languages is empty or missing',()=>{
 withBrowser({languages:[],language:'tr-TR'},()=>{const p=provider('en',false);p.rerender();assert.equal(p.lang,'tr');});
 withBrowser({language:'tr'},()=>{const p=provider('en',false);p.rerender();assert.equal(p.lang,'tr');});
 withBrowser({language:'fr'},()=>{const p=provider('tr',false);p.rerender();assert.equal(p.lang,'en');});
});
test('LanguageProvider.setLang: updates state, writes the plc_lang cookie and the html lang; invalid codes are ignored',()=>{
 withBrowser({languages:['en-US'],language:'en-US'},doc=>{
  const p=provider('en',false);p.rerender();
  p.setLang('tr');assert.equal(p.lang,'tr');assert.equal(doc.cookie,'plc_lang=tr; Path=/; Max-Age=31536000; SameSite=Lax');assert.equal(doc.documentElement.lang,'tr');
  assert.equal(readLangCookie(doc.cookie),'tr','the cookie it writes is the cookie the server reads');assert.equal(server(doc.cookie,'en-US'),'tr');
  p.setLang('en');assert.equal(p.lang,'en');assert.equal(doc.cookie,'plc_lang=en; Path=/; Max-Age=31536000; SameSite=Lax');assert.equal(doc.documentElement.lang,'en');assert.equal(server(doc.cookie,'tr-TR'),'en');
  const before=doc.cookie;p.setLang('de' as Lang);p.setLang('' as Lang);p.setLang(undefined as unknown as Lang);assert.equal(p.lang,'en');assert.equal(doc.cookie,before);
 });
});
test('LanguageProvider.setLang: a manual choice in the page is not undone by the browser re-check, and survives a throwing cookie jar',()=>{
 withBrowser({languages:['tr-TR'],language:'tr-TR'},doc=>{
  const p=provider('tr',false);p.rerender();assert.equal(p.lang,'tr');
  p.setLang('en');p.rerender();p.rerender();assert.equal(p.lang,'en','effect deps are unchanged so the browser does not win again');
  assert.equal(doc.documentElement.lang,'en');
 });
 const jar={get cookie(){return '';},set cookie(_:string){throw new Error('cookies blocked');},documentElement:{lang:''}};
 withBrowser({languages:['en-US'],language:'en-US'},()=>{const p=provider('en',true);assert.doesNotThrow(()=>p.setLang('tr'));assert.equal(p.lang,'tr','state still changes when the cookie cannot be written');},jar as never);
});

test('useT / useLang: English without a provider, the provider language inside one',()=>{
 const Probe=()=>createElement('i',null,useT(portalDict)('portal.start'),'|',useLang().lang,'|',String(typeof useLang().setLang));
 assert.equal(renderToStaticMarkup(createElement(Probe)),'<i>Start|en|function</i>');
 assert.equal(renderToStaticMarkup(createElement(LanguageProvider,{initial:'tr',explicit:true,children:createElement(Probe)})),'<i>Başlangıç|tr|function</i>');
 assert.equal(renderToStaticMarkup(createElement(LanguageProvider,{initial:'en',explicit:false,children:createElement(Probe)})),'<i>Start|en|function</i>');
 const Params=()=>createElement('i',null,useT(portalDict)('first.lead',{project:'P'}));
 assert.equal(renderToStaticMarkup(createElement(LanguageProvider,{initial:'tr',explicit:true,children:createElement(Params)})),'<i>“P” projesi başarıyla açıldı. Lütfen sonraki adımı seçin:</i>');
 assert.equal(renderToStaticMarkup(createElement(Params)),'<i>Project “P” was opened successfully. Please select the next step:</i>');
 // setLang from the default context is a harmless no-op.
 const Noop=()=>{useLang().setLang('tr');return createElement('i',null,useLang().lang);};assert.equal(renderToStaticMarkup(createElement(Noop)),'<i>en</i>');
});
