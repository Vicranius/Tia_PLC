import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PortalView,{type ProjectTarget} from '../src/ui/PortalView';
import {LanguageProvider} from '../src/i18n/react';
import {portalDict} from '../src/i18n/dict/portal';
import type {Lang} from '../src/i18n/core';
import {catalog,catalogFor,challenge,conceptLabel} from '../src/challenges/catalog';
import {material} from '../src/challenges/private';

type Props=Parameters<typeof PortalView>[0];
type El=ReactElement<Record<string,unknown>>;
const make=(over:Partial<Props>={}):Props=>({visible:true,dirty:false,message:'',projectName:'PLC_Lab_Project',cpu:'CPU 1214C DC/DC/DC',blocks:material(7).reference.blocks,challenge:challenge(7),mode:'STOP',locked:false,saved:true,onOpen:()=>{},onCreate:()=>{},onCpu:()=>{},onStart:()=>{},onStop:()=>{},...over});
const markup=(p:Props)=>renderToStaticMarkup(createElement(PortalView,p));
// Minimal hook-driven renderer: the element tree is produced without a DOM and clicked by invoking its handlers.
// It fakes the hooks PortalView and LanguageProvider use: useState, useContext, useEffect/useLayoutEffect, useMemo, useCallback, useRef, useId.
// Without options the context default applies (English, no-op setLang); with {lang} the real LanguageProvider is run inside the same render so
// language switches re-render the portal exactly as in the browser (the cookie write goes to the stubbed document).
const internals=(React as unknown as {__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:{H:unknown}}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
interface CtxLike {_currentValue:unknown}
function mount(p:Props,opts:{lang?:Lang;explicit?:boolean}={}){
 const store:unknown[]=[];let tree:ReactNode;let provided:unknown;
 const draw=()=>{
  let i=0;const prev=internals.H;
  internals.H={
   useState:(init:unknown)=>{const k=i++;if(!(k in store))store[k]=typeof init==='function'?(init as ()=>unknown)():init;return[store[k],(v:unknown)=>{store[k]=typeof v==='function'?(v as (s:unknown)=>unknown)(store[k]):v;}];},
   useContext:(c:CtxLike)=>opts.lang?provided:c._currentValue,
   useEffect:()=>{},useLayoutEffect:()=>{},useMemo:(fn:()=>unknown)=>fn(),useCallback:(fn:unknown)=>fn,useRef:(v:unknown)=>({current:v}),useId:()=>':r0:',
  };
  try{
   if(opts.lang){const provider=LanguageProvider({initial:opts.lang,explicit:opts.explicit??true,children:null}) as ReactElement<{value:unknown}>;provided=provider.props.value;}
   tree=PortalView(p) as ReactNode;
  }finally{internals.H=prev;}
 };
 draw();
 const walk=(node:ReactNode,out:El[]):El[]=>{if(Array.isArray(node))node.forEach(n=>walk(n,out));else if(isValidElement(node)){out.push(node as El);walk((node.props as {children?:ReactNode}).children,out);}return out;},all=()=>walk(tree,[]);
 const text=(node:ReactNode):string=>Array.isArray(node)?node.map(text).join(''):isValidElement(node)?text((node.props as {children?:ReactNode}).children):typeof node==='string'||typeof node==='number'?String(node):'';
 const find=(type:string,label:string|RegExp,within?:string)=>{const el=all().find(e=>e.type===type&&(label instanceof RegExp?label.test(text(e)):text(e)===label)&&(!within||e.props.className===within));assert.ok(el,`${type} "${label}" not found`);return el;};
 const fire=(el:El,handler:string,arg:unknown={})=>{const fn=el.props[handler] as ((e:unknown)=>void)|undefined;assert.ok(fn,`no ${handler}`);fn(arg);draw();};
 return {click:(type:string,label:string|RegExp)=>fire(find(type,label),'onClick'),find,fire,all,text,html:()=>renderToStaticMarkup(tree)};
}
// document stub so LanguageProvider.setLang can write its cookie in Node; restored afterwards.
function withDocument<T>(fn:(doc:{cookie:string})=>T):T{
 const g=globalThis as unknown as {document?:unknown},prev=g.document,doc={cookie:''};g.document=doc;
 try{return fn(doc);}finally{if(prev===undefined)delete g.document;else g.document=prev;}
}
const portalLabels=['Start','Devices & networks','PLC programming','Visualization','Online & Diagnostics'];

test('Portal view default render: five task portals, First steps, footer project and exercise',()=>{
 const html=markup(make());
 assert.match(html,/aria-label="Portal view"/);
 const nav=html.match(/<nav class="portal-tasks"[\s\S]*?<\/nav>/)?.[0]??'';
 assert.equal((nav.match(/<button/g)??[]).length,5);
 for(const label of portalLabels)assert.ok(nav.includes(`</span>${label.replace('&','&amp;')}</button>`),label);
 assert.match(nav,/class="active" aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Start<\/button>/);
 assert.match(html,/<section class="portal-content" aria-label="First steps"><h2>First steps<\/h2>/);
 assert.match(html,/Project “PLC_Lab_Project” was opened successfully/);
 assert.equal((html.match(/class="portal-step[ "]/g)??[]).length,5);
 for(const s of['Configure a device','Write PLC program','Configure an HMI screen','Simulate and monitor the CPU','Open the project view'])assert.ok(html.includes(s),s);
 assert.match(html,/<button class="portal-switch"[^>]*>(?:(?!<\/button>)[\s\S])*Project view<\/button>/);
 assert.match(html,/Opened project: PLC_Lab_Project · 07 TON motor delay<\/span>/);
 assert.match(html,/<nav class="portal-actions" aria-label="Start actions">/);
 for(const a of['Open existing project','Create new project','First steps','Installed software','Help'])assert.ok(html.includes(`${a}</button>`),a);
});
test('Portal view footer follows the current project name and exercise',()=>{
 assert.match(markup(make({projectName:'Line_9',challenge:challenge(27)})),new RegExp(`Opened project: Line_9 · 27 ${challenge(27).title.replace(/[()]/g,'\\$&')}`));
});
test('Create new project lists all 27 industrial exercises',()=>{
 assert.equal(catalog.length,27);
 const v=mount(make());v.click('button','Create new project');
 const html=v.html();
 assert.match(html,/<h2>Create new project<\/h2>/);
 const rows=html.match(/<tr class="[^"]*"><td>\d\d<\/td>/g)??[];assert.equal(rows.length,27);
 for(const x of catalog){const cells=`<td>${String(x.id).padStart(2,'0')}</td><td>${x.title.replace(/&/g,'&amp;')}</td><td>L${x.level}</td><td>${x.concepts.join(', ')}</td>`;assert.ok(html.includes(cells),`exercise ${x.id}`);}
 assert.match(html,/<tr class="selected"><td>07<\/td>/,'current exercise preselected');
 assert.match(html,/Creates a new “PLC_Lab_Project” with an empty Main \[OB1\]/);
 assert.doesNotMatch(html,/<button class="portal-primary" disabled="">Create/);
});
test('Create new project: click selects, Create and double-click load the exercise, locked CPU blocks both',()=>{
 const created:number[]=[];let v=mount(make({onCreate:id=>created.push(id)}));v.click('button','Create new project');
 const row=(n:string)=>v.all().find(e=>e.type==='tr'&&v.text(e).startsWith(n))!;
 v.fire(row('12'),'onClick');assert.match(v.html(),/<tr class="selected"><td>12<\/td>/);assert.doesNotMatch(v.html(),/<tr class="selected"><td>07<\/td>/);
 v.click('button','Create');assert.deepEqual(created,[12]);
 v.fire(row('21'),'onDoubleClick');assert.deepEqual(created,[12,21]);
 v=mount(make({locked:true,onCreate:id=>created.push(id)}));v.click('button','Create new project');
 assert.match(v.html(),/<button class="portal-primary" disabled="">Create<\/button>/);assert.match(v.html(),/Stop the CPU before creating a new project\./);
 v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('05'))!,'onDoubleClick');assert.deepEqual(created,[12,21]);
});
test('First steps cards jump to the matching portal and action; Project view opens the project',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({onOpen:t=>opened.push(t)}));
 for(const [card,heading] of[['Devices & networks','Show all devices'],['PLC programming','Show all objects'],['Visualization','Show all screens'],['Online & Diagnostics','Accessible devices']]){
  v.fire(v.find('button',new RegExp(`^${card}`),'portal-step'),'onClick');
  assert.match(v.html(),new RegExp(`<section class="portal-content" aria-label="${heading}"><h2>${heading}</h2>`),card);
  assert.match(v.html(),new RegExp(`class="active" aria-pressed="true"[^>]*>(?:(?!</button>)[\\s\\S])*${heading}</button>`));
  v.click('button','Start');v.click('button','First steps');
 }
 v.fire(v.find('button',/Open the project view/,'portal-step project'),'onClick');assert.deepEqual(opened,[undefined]);
 v.fire(v.find('button',/Project view/,'portal-switch'),'onClick');assert.deepEqual(opened,[undefined,undefined]);
});
test('Open existing project: recent project row, status and Open button',()=>{
 const opened:(ProjectTarget|undefined)[]=[];let v=mount(make({onOpen:t=>opened.push(t)}));v.click('button','Open existing project');
 assert.match(v.html(),/<td>PLC_Lab_Project<\/td>|PLC_Lab_Project<\/td><td>Browser session/);assert.match(v.html(),/07 · TON motor delay<\/td><td>Saved<\/td>/);
 v.click('button','Open');assert.deepEqual(opened,[undefined]);
 v=mount(make({saved:false}));v.click('button','Open existing project');assert.match(v.html(),/<td>Modified<\/td>/);
});
test('Installed software and Help actions render their content',()=>{
 const v=mount(make());v.click('button','Installed software');assert.match(v.html(),/Virtual CPU/);assert.match(v.html(),/10 ms deterministic scan/);
 v.click('button','Help');assert.match(v.html(),/<ol class="portal-help"><li>/);
});
test('Devices & networks: device rows open the device view or process screen',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({mode:'RUN',onOpen:t=>opened.push(t)}));v.click('button','Devices & networks');
 assert.match(v.html(),/<h2>Show all devices<\/h2>/);assert.match(v.html(),/PLC_1<\/td><td>CPU 1214C DC\/DC\/DC<\/td><td>Virtual \(browser\)<\/td><td>RUN<\/td>/);assert.match(v.html(),/HMI_1<\/td>/);
 v.click('button','Open the device view');
 const rows=v.all().filter(e=>e.type==='tr'&&e.props.onDoubleClick);v.fire(rows[0],'onDoubleClick');v.fire(rows[1],'onDoubleClick');
 assert.deepEqual(opened,[{view:'device'},{view:'device'},{view:'process'}]);
});
test('Change device: commits the chosen CPU, disabled when unchanged or locked',()=>{
 const cpus:string[]=[];let v=mount(make({onCpu:c=>cpus.push(c)}));v.click('button','Devices & networks');v.click('button','Change device');
 const radios=()=>v.all().filter(e=>e.type==='input');assert.equal(radios().length,5);
 for(const c of['1211C','1212C','1214C','1215C','1217C'])assert.ok(v.html().includes(`CPU ${c} DC/DC/DC</label>`),c);
 assert.match(v.html(),/<input type="radio" name="portal-cpu" checked=""[^>]*\/><svg[^>]*>.*?<\/svg>CPU 1214C DC\/DC\/DC/);
 assert.match(v.html(),/<button class="portal-primary" disabled="">Change<\/button>/);
 v.fire(radios()[3],'onChange');assert.doesNotMatch(v.html(),/disabled="">Change/);
 v.click('button','Change');assert.deepEqual(cpus,['CPU 1215C DC/DC/DC']);
 v=mount(make({locked:true,onCpu:c=>cpus.push(c)}));v.click('button','Devices & networks');v.click('button','Change device');
 v.fire(v.all().filter(e=>e.type==='input')[0],'onChange');assert.match(v.html(),/disabled="">Change/);assert.match(v.html(),/Stop the CPU before changing the device\./);
});
test('PLC programming lists OB1 and OB100 with network counts and opens blocks',()=>{
 const blocks=material(7).reference.blocks;assert.deepEqual(blocks.map(b=>b.id),['OB1','OB100']);
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({blocks,onOpen:t=>opened.push(t)}));v.click('button','PLC programming');
 assert.match(v.html(),/<h2>Show all objects<\/h2>/);
 for(const b of blocks)assert.ok(v.html().includes(`${b.id==='OB1'?'Main':'Startup'}</td><td>${b.id.replace(/\D/g,'')}</td><td>Organization block</td><td>LAD</td><td>${b.networks.length}</td>`),b.id);
 const rows=v.all().filter(e=>e.type==='tr'&&e.props.onDoubleClick);v.fire(rows[1],'onDoubleClick');v.click('button','Open Main [OB1]');
 assert.deepEqual(opened,[{view:'ladder',block:'OB100'},{view:'ladder',block:'OB1'}]);
});
test('Visualization opens the HMI process screen',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({onOpen:t=>opened.push(t)}));v.click('button','Visualization');
 assert.match(v.html(),/<h2>Show all screens<\/h2>/);assert.match(v.html(),new RegExp(`HMI_1</td><td>${challenge(7).title}</td>`));
 v.click('button','Open screen');assert.deepEqual(opened,[{view:'process'}]);
});
test('Online & Diagnostics: operating mode, Start/Stop enablement and Go online',()=>{
 const calls:string[]=[];const opened:(ProjectTarget|undefined)[]=[];
 const stop=mount(make({mode:'STOP',onStart:()=>calls.push('start'),onStop:()=>calls.push('stop'),onOpen:t=>opened.push(t)}));stop.click('button','Online & Diagnostics');
 assert.match(stop.html(),/<td class="portal-stop">● STOP<\/td>/);assert.match(stop.html(),/<button disabled="">Stop CPU<\/button>/);assert.doesNotMatch(stop.html(),/disabled="">Start CPU/);
 stop.click('button','Start CPU');stop.click('button','Go online · monitor OB1');assert.deepEqual(calls,['start']);assert.deepEqual(opened,[{view:'ladder',block:'OB1',monitor:true}]);
 const run=mount(make({mode:'RUN',onStart:()=>calls.push('start'),onStop:()=>calls.push('stop')}));run.click('button','Online & Diagnostics');
 assert.match(run.html(),/<td class="portal-run">● RUN<\/td>/);assert.match(run.html(),/<button disabled="">Start CPU<\/button>/);assert.doesNotMatch(run.html(),/disabled="">Stop CPU/);
 run.click('button','Stop CPU');assert.deepEqual(calls,['start','stop']);
});
test('Portal view is hidden through the hidden attribute but stays rendered',()=>{
 assert.match(markup(make({visible:false})),/<div class="portal" hidden="" role="application" aria-label="Portal view">/);
 assert.doesNotMatch(markup(make()),/hidden=""/);assert.ok(markup(make({visible:false})).includes('Opened project: PLC_Lab_Project'));
});
test('Dirty program: Create and double-click ask for confirmation, Create anyway commits, Cancel clears',()=>{
 const created:number[]=[];const v=mount(make({dirty:true,onCreate:id=>created.push(id)}));v.click('button','Create new project');
 assert.doesNotMatch(v.html(),/alertdialog/);
 v.click('button','Create');assert.deepEqual(created,[]);
 assert.match(v.html(),/<div class="portal-buttons portal-confirm" role="alertdialog" aria-label="Replace current program">/);assert.match(v.html(),/exercise 07 with an empty Main \[OB1\]/);
 assert.doesNotMatch(v.html(),/disabled="">Create/);assert.ok(!v.all().some(e=>e.type==='button'&&v.text(e)==='Create'),'plain Create replaced by the confirm bar');
 v.click('button','Cancel');assert.deepEqual(created,[]);assert.doesNotMatch(v.html(),/alertdialog/);
 v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('12'))!,'onDoubleClick');assert.deepEqual(created,[]);assert.match(v.html(),/exercise 12 with an empty Main/);
 v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('05'))!,'onClick');assert.doesNotMatch(v.html(),/alertdialog/,'selecting another row dismisses the confirm bar');
 v.click('button','Create');v.click('button','Create anyway');assert.deepEqual(created,[5]);assert.doesNotMatch(v.html(),/alertdialog/);
});
test('Clean program: Create and double-click call onCreate immediately; locked + dirty does nothing',()=>{
 const created:number[]=[];let v=mount(make({dirty:false,onCreate:id=>created.push(id)}));v.click('button','Create new project');
 v.click('button','Create');v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('09'))!,'onDoubleClick');assert.deepEqual(created,[7,9]);assert.doesNotMatch(v.html(),/alertdialog/);
 v=mount(make({dirty:true,locked:true,onCreate:id=>created.push(id)}));v.click('button','Create new project');
 v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('09'))!,'onDoubleClick');assert.doesNotMatch(v.html(),/alertdialog/);assert.deepEqual(created,[7,9]);
});
test('Accessible devices shows the CPU message (e.g. compile errors) as a status note',()=>{
 const text='4 derleme hatası var. Diagnostics bölümünü incele.';
 const v=mount(make({message:text}));v.click('button','Online & Diagnostics');
 assert.match(v.html(),new RegExp(`<p class="portal-note" role="status">${text}</p>`));
 const other=mount(make({message:text}));other.click('button','Devices & networks');assert.doesNotMatch(other.html(),/portal-note/);
 const empty=mount(make());empty.click('button','Online & Diagnostics');assert.doesNotMatch(empty.html(),/portal-note/);
});
test('Each portal remembers its last action; Create and Change device reset to the current project',()=>{
 const v=mount(make());const active=()=>v.all().filter(e=>e.type==='button'&&e.props['aria-pressed']===true).map(e=>v.text(e));
 v.click('button','Devices & networks');v.click('button','Change device');
 v.click('button','Start');assert.deepEqual(active(),['Start','First steps']);
 v.click('button','Devices & networks');assert.deepEqual(active(),['Devices & networks','Change device'],'Change device remembered');
 v.click('button','Start');v.click('button','Create new project');v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('12'))!,'onClick');
 v.click('button','First steps');v.click('button','Create new project');assert.match(v.html(),/<tr class="selected"><td>07<\/td>/,'Create selection resets to the current exercise');
 v.click('button','Devices & networks');v.fire(v.all().filter(e=>e.type==='input')[3],'onChange');assert.doesNotMatch(v.html(),/disabled="">Change/);
 v.click('button','Show all devices');v.click('button','Change device');assert.match(v.html(),/disabled="">Change/,'radio resets to the current CPU');
 v.click('button','Online & Diagnostics');v.click('button','Start');v.click('button','Online & Diagnostics');assert.deepEqual(active().slice(-1),['Accessible devices']);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Turkish / language switching
type Key=keyof typeof portalDict.en;
const T=(k:Key)=>portalDict.tr[k],E=(k:Key)=>portalDict.en[k];
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inProvider=(p:Props,lang:Lang,explicit=true)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit,children:createElement(PortalView,p)}));
const portalActions:[Key,Key[]][]=[['portal.start',['action.open','action.create','action.first','action.software','action.help','action.language']],['portal.devices',['action.devices','action.addDevice']],['portal.plc',['action.blocks']],['portal.hmi',['action.screens']],['portal.online',['action.accessible']]];
const dict=(lang:Lang)=>portalDict[lang];
// Exercise titles and concept labels come from the catalog in the page language (translated by the catalog, not by the portal dictionary).
const title=(id:number,lang:Lang)=>catalogFor(lang).find(x=>x.id===id)!.title;

test('Turkish default render: portals, First steps, footer and aria labels come from the Turkish dictionary',()=>{
 const html=inProvider(make(),'tr');
 assert.match(html,/aria-label="Portal görünümü"/);
 const nav=html.match(/<nav class="portal-tasks"[\s\S]*?<\/nav>/)?.[0]??'';
 assert.match(nav,/aria-label="Portallar"/);assert.equal((nav.match(/<button/g)??[]).length,5);
 for(const label of['Başlangıç','Cihazlar ve ağlar','PLC programlama','Görselleştirme','Çevrimiçi ve tanılama'])assert.ok(nav.includes(`</span>${label}</button>`),label);
 assert.match(nav,/class="active" aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Başlangıç<\/button>/);
 assert.match(html,/<section class="portal-content" aria-label="İlk adımlar"><h2>İlk adımlar<\/h2>/);
 assert.match(html,/“PLC_Lab_Project” projesi başarıyla açıldı\. Lütfen sonraki adımı seçin:/);
 assert.equal((html.match(/class="portal-step[ "]/g)??[]).length,5);
 for(const s of['Bir cihazı yapılandır','PLC programı yaz','Bir HMI ekranı yapılandır','CPU’yu simüle et ve izle','Proje görünümünü aç'])assert.ok(html.includes(s),s);
 assert.match(html,/<button class="portal-switch"[^>]*>(?:(?!<\/button>)[\s\S])*Proje görünümü<\/button>/);
 assert.ok(html.includes(`Açık proje: PLC_Lab_Project · 07 ${esc(title(7,'tr'))}</span>`));
 assert.match(html,/<nav class="portal-actions" aria-label="Başlangıç işlemleri">/);
 for(const a of['Mevcut projeyi aç','Yeni proje oluştur','İlk adımlar','Yüklü yazılım','Yardım','Arayüz dili'])assert.ok(html.includes(`${a}</button>`),a);
 assert.ok(html.includes('<b>S7-1200 EĞİTİM</b>'));
});
test('Turkish default render has no English chrome left over and no raw dictionary keys',()=>{
 const html=inProvider(make(),'tr');
 for(const en of['Portal view','Devices &amp; networks','PLC programming','Visualization','Online &amp; Diagnostics','First steps','Create new project','Open existing project','Installed software','User interface language','Project view','Opened project','Configure a device','Write PLC program','Open the project view','S7-1200 TRAINER','Start actions'])assert.ok(!html.includes(en),en);
 assert.doesNotMatch(html,/\b(?:Start|Help)\b/);
 assert.doesNotMatch(html,/[>"](?:aria|brand|portal|action|common|first|open|create|software|help|language|devices|addDevice|blocks|screens|accessible|foot)\.\w+[<"]/,'raw key leaked');
});
test('LanguageProvider adds no markup: English provider output equals the context default, explicit=false still renders the server language',()=>{
 assert.equal(inProvider(make(),'en'),markup(make()));
 assert.equal(inProvider(make(),'tr',false),inProvider(make(),'tr',true));
 assert.notEqual(inProvider(make(),'tr'),markup(make()));
});
test('Turkish Create new project: lead, table headers, hint, locked and confirm texts',()=>{
 let v=mount(make(),{lang:'tr'});v.click('button','Yeni proje oluştur');
 assert.match(v.html(),/<h2>Yeni proje oluştur<\/h2>/);
 assert.match(v.html(),/Her proje bir endüstriyel alıştırmadan başlar\./);
 assert.match(v.html(),/<thead><tr><th>No\.<\/th><th>Endüstriyel alıştırma<\/th><th>Seviye<\/th><th>Kavramlar<\/th><\/tr><\/thead>/);
 assert.match(v.html(),/Boş bir Main \[OB1\] ile yeni bir “PLC_Lab_Project” oluşturur\./);
 assert.match(v.html(),/<button class="portal-primary">Oluştur<\/button>/);
 assert.equal((v.html().match(/<tr class="[^"]*"><td>\d\d<\/td>/g)??[]).length,27,'exercise rows unchanged by the language');
 for(const x of catalogFor('tr')){const cells=`<td>${String(x.id).padStart(2,'0')}</td><td>${esc(x.title)}</td><td>L${x.level}</td><td>${esc(x.concepts.map(k=>conceptLabel(k,'tr')).join(', '))}</td>`;assert.ok(v.html().includes(cells),`exercise ${x.id}`);}
 v=mount(make({locked:true}),{lang:'tr'});v.click('button','Yeni proje oluştur');
 assert.match(v.html(),/<button class="portal-primary" disabled="">Oluştur<\/button>/);assert.match(v.html(),/Yeni proje oluşturmadan önce CPU’yu durdur\./);
 const created:number[]=[];v=mount(make({dirty:true,onCreate:id=>created.push(id)}),{lang:'tr'});v.click('button','Yeni proje oluştur');v.click('button','Oluştur');
 assert.match(v.html(),/<div class="portal-buttons portal-confirm" role="alertdialog" aria-label="Mevcut programı değiştir">/);
 assert.match(v.html(),/ardından boş bir Main \[OB1\] ile 07 numaralı alıştırma yüklenir\./);
 v.click('button','İptal');assert.doesNotMatch(v.html(),/alertdialog/);
 v.click('button','Oluştur');v.click('button','Yine de oluştur');assert.deepEqual(created,[7]);
});
test('Turkish actions: open, software, help, devices, change device, blocks, screens and accessible devices',()=>{
 const opened:(ProjectTarget|undefined)[]=[],calls:string[]=[],cpus:string[]=[];
 const v=mount(make({mode:'STOP',onOpen:t=>opened.push(t),onStart:()=>calls.push('start'),onStop:()=>calls.push('stop'),onCpu:c=>cpus.push(c),message:'3 hata var.'}),{lang:'tr'});
 v.click('button','Mevcut projeyi aç');
 assert.match(v.html(),/<h3>Son kullanılanlar<\/h3>/);assert.match(v.html(),/<th>Proje<\/th><th>Konum<\/th><th>Alıştırma<\/th><th>Durum<\/th>/);
 assert.match(v.html(),/Tarayıcı oturumu \(sunucuda kayıt\)/);assert.ok(v.html().includes(`07 · ${esc(title(7,'tr'))}</td><td>Kaydedildi</td>`));
 v.click('button','Aç');assert.deepEqual(opened,[undefined]);
 v.click('button','Yüklü yazılım');assert.match(v.html(),/<th>Yazılım<\/th><th>Sürüm<\/th><th>Kapsam<\/th>/);assert.match(v.html(),/Sanal CPU/);assert.match(v.html(),/10 ms deterministik tarama/);
 v.click('button','Yardım');assert.equal((v.html().match(/<li>/g)??[]).length,5);assert.match(v.html(),/Başlangıç → Yeni proje oluştur/);
 v.click('button','Cihazlar ve ağlar');
 assert.match(v.html(),/<nav class="portal-actions" aria-label="Cihazlar ve ağlar işlemleri">/);
 assert.match(v.html(),/<h2>Tüm cihazları göster<\/h2>/);assert.match(v.html(),/<th>Cihaz<\/th><th>Tür<\/th><th>Arayüz<\/th><th>Durum<\/th>/);
 assert.match(v.html(),/PLC_1<\/td><td>CPU 1214C DC\/DC\/DC<\/td><td>Sanal \(tarayıcı\)<\/td><td>STOP<\/td>/);assert.match(v.html(),/HMI_1<\/td><td>Proses ekranları<\/td><td>Dahili etiketler<\/td>/);
 v.click('button','Cihaz görünümünü aç');assert.deepEqual(opened.slice(1),[{view:'device'}]);
 v.click('button','Cihazı değiştir');assert.match(v.html(),/PLC_1 için CPU’yu seç\./);assert.match(v.html(),/<button class="portal-primary" disabled="">Değiştir<\/button>/);
 v.fire(v.all().filter(e=>e.type==='input')[4],'onChange');v.click('button','Değiştir');assert.deepEqual(cpus,['CPU 1217C DC/DC/DC']);
 v.click('button','PLC programlama');assert.match(v.html(),/<h2>Tüm nesneleri göster<\/h2>/);
 assert.match(v.html(),/<th>Ad<\/th><th>Numara<\/th><th>Tür<\/th><th>Dil<\/th><th>Network<\/th>/);assert.match(v.html(),/Main<\/td><td>1<\/td><td>Organizasyon bloğu<\/td><td>LAD<\/td>/);
 assert.match(v.html(),/Açmak için bir bloğa çift tıkla\./);v.click('button','Main [OB1] aç');assert.deepEqual(opened.slice(-1),[{view:'ladder',block:'OB1'}]);
 v.click('button','Görselleştirme');assert.match(v.html(),/<h2>Tüm ekranları göster<\/h2>/);assert.match(v.html(),/<th>Ekran<\/th><th>Cihaz<\/th><th>Proses<\/th>/);
 v.click('button','Ekranı aç');assert.deepEqual(opened.slice(-1),[{view:'process'}]);
 v.click('button','Çevrimiçi ve tanılama');assert.match(v.html(),/<h2>Erişilebilir cihazlar<\/h2>/);assert.match(v.html(),/<th>Cihaz<\/th><th>Cihaz tipi<\/th><th>Arayüz<\/th><th>Çalışma modu<\/th>/);
 assert.match(v.html(),/Sanal CPU \(Web Worker\)/);assert.match(v.html(),/<td class="portal-stop">● STOP<\/td>/);assert.match(v.html(),/<button disabled="">CPU’yu durdur<\/button>/);
 v.click('button','CPU’yu başlat');v.click('button','Çevrimiçi ol · OB1’i izle');assert.deepEqual(calls,['start']);assert.deepEqual(opened.slice(-1),[{view:'ladder',block:'OB1',monitor:true}]);
 assert.match(v.html(),/<p class="portal-note" role="status">3 hata var\.<\/p>/,'CPU message is passed through untouched');
});
test('Turkish footer and "Proje görünümü" buttons open the project; exercise title follows the project',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({projectName:'Hat_9',challenge:challenge(27),onOpen:t=>opened.push(t)}),{lang:'tr'});
 assert.ok(v.html().includes(`Açık proje: Hat_9 · 27 ${esc(title(27,'tr'))}</span>`));
 v.fire(v.find('button',/Proje görünümünü aç/,'portal-step project'),'onClick');v.fire(v.find('button',/Proje görünümü/,'portal-switch'),'onClick');assert.deepEqual(opened,[undefined,undefined]);
});
test('Turkish First steps cards jump to the matching portal and Turkish action',()=>{
 const v=mount(make(),{lang:'tr'});
 for(const [card,heading] of[['Cihazlar ve ağlar','Tüm cihazları göster'],['PLC programlama','Tüm nesneleri göster'],['Görselleştirme','Tüm ekranları göster'],['Çevrimiçi ve tanılama','Erişilebilir cihazlar']]){
  v.fire(v.find('button',new RegExp(`^${card}`),'portal-step'),'onClick');
  assert.match(v.html(),new RegExp(`<section class="portal-content" aria-label="${heading}"><h2>${heading}</h2>`),card);
  v.click('button','Başlangıç');v.click('button','İlk adımlar');
 }
});
test('No view leaks the other language: every portal action, English and Turkish, shows only its own dictionary',()=>{
 for(const lang of['en','tr'] as const){
  const other=dict(lang==='en'?'tr':'en'),own=dict(lang),ownValues=new Set(Object.values(own));
  // Exact element texts of the other language that are not also valid texts of this language.
  const foreign=new Map<string,string>();for(const k of Object.keys(other) as Key[])if(!other[k].includes('{')&&!ownValues.has(other[k]))foreign.set(other[k],k);
  assert.ok(foreign.size>60,`${lang}: foreign set too small (${foreign.size})`);
  for(const [portal,list] of portalActions)for(const action of list){
   const v=mount(make({message:''}),{lang});v.click('button',own[portal]);v.click('button',own[action]);
   const texts=v.all().filter(e=>typeof e.type==='string').map(e=>v.text(e)).filter(Boolean);
   assert.ok(texts.length>=4,`${lang}/${action}: nothing rendered`);
   for(const txt of texts)assert.ok(!foreign.has(txt),`${lang}/${action}: "${txt}" is the ${lang==='en'?'Turkish':'English'} text of ${foreign.get(txt)}`);
   const html=v.html();assert.doesNotMatch(html,/[>"](?:aria|brand|portal|action|common|first|open|create|software|help|language|devices|addDevice|blocks|screens|accessible|foot)\.\w+[<"]/,`${lang}/${action}: raw key leaked`);
   // The heading and the section label are the selected action in this language.
   assert.ok(html.includes(`<section class="portal-content" aria-label="${esc(own[action])}"><h2>${esc(own[action])}</h2>`),`${lang}/${action}: title`);
  }
 }
});
test('Language action lists English and Türkçe (never translated), marks the current one and has a labelled radio group',()=>{
 for(const [lang,label,lead,current] of[['en','User interface language',E('language.lead'),[true,false]],['tr','Arayüz dili',T('language.lead'),[false,true]]] as const){
  const v=mount(make(),{lang});v.click('button',label);
  assert.ok(v.html().includes(`<h2>${label}</h2>`));assert.ok(v.html().includes(esc(lead)));
  const group=v.find('div',/^EnglishTürkçe$/,'portal-device-list');assert.equal(group.props.role,'radiogroup');assert.equal(group.props['aria-label'],label);
  const radios=v.all().filter(e=>e.type==='input'&&e.props.name==='portal-lang');assert.equal(radios.length,2);assert.deepEqual(radios.map(r=>r.props.checked),current);
  const labels=v.all().filter(e=>e.type==='label');assert.deepEqual(labels.map(l=>v.text(l)),['English','Türkçe']);assert.deepEqual(labels.map(l=>l.props.lang),['en','tr']);
  assert.deepEqual(labels.map(l=>l.props.className),current.map(c=>c?'selected':''));
  assert.match(v.html(),/<input type="radio" name="portal-lang"/);
 }
});
test('Language action calls setLang: choosing Türkçe flips the portal immediately and stores plc_lang; choosing English flips back',()=>{
 withDocument(doc=>{
  const v=mount(make(),{lang:'en',explicit:false});v.click('button','User interface language');
  const radio=(i:number)=>v.all().filter(e=>e.type==='input'&&e.props.name==='portal-lang')[i];
  v.fire(radio(1),'onChange');
  assert.equal(doc.cookie,'plc_lang=tr; Path=/; Max-Age=31536000; SameSite=Lax');
  assert.match(v.html(),/<h2>Arayüz dili<\/h2>/);assert.match(v.html(),/aria-label="Portal görünümü"/);assert.match(v.html(),/Başlangıç/);assert.doesNotMatch(v.html(),/User interface language|First steps/);
  assert.deepEqual([radio(0),radio(1)].map(r=>r.props.checked),[false,true]);
  assert.deepEqual(v.all().filter(e=>e.type==='button'&&e.props['aria-pressed']===true).map(e=>v.text(e)),['Başlangıç','Arayüz dili'],'selected portal and action are kept');
  v.fire(radio(0),'onChange');
  assert.equal(doc.cookie,'plc_lang=en; Path=/; Max-Age=31536000; SameSite=Lax');
  assert.match(v.html(),/<h2>User interface language<\/h2>/);assert.match(v.html(),/aria-label="Portal view"/);assert.doesNotMatch(v.html(),/Arayüz dili|Başlangıç/);
  assert.deepEqual([radio(0),radio(1)].map(r=>r.props.checked),[true,false]);
 });
});
test('Without a LanguageProvider the portal stays English and setLang is a harmless no-op',()=>{
 withDocument(doc=>{
  const v=mount(make());v.click('button','User interface language');
  v.fire(v.all().filter(e=>e.type==='input'&&e.props.name==='portal-lang')[1],'onChange');
  assert.equal(doc.cookie,'');assert.match(v.html(),/<h2>User interface language<\/h2>/);
 });
});
test('Switching language mid-flow: the confirm bar is dismissed and Create resets to the current exercise, as for any other action change',()=>{
 withDocument(()=>{
  const v=mount(make({dirty:true}),{lang:'en'});v.click('button','Create new project');
  v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('12'))!,'onClick');v.click('button','Create');assert.match(v.html(),/alertdialog/);
  v.click('button','Start');v.click('button','User interface language');v.fire(v.all().filter(e=>e.type==='input'&&e.props.name==='portal-lang')[1],'onChange');
  v.click('button','Yeni proje oluştur');assert.match(v.html(),/<tr class="selected"><td>07<\/td>/);assert.doesNotMatch(v.html(),/alertdialog/);
 });
});
