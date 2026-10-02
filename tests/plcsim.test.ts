import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/i18n/react';
import {LANGS,type Lang} from '../src/i18n/core';
import {shellDict} from '../src/i18n/dict/shell';
import Plcsim from '../src/ui/shell/Plcsim';
import DownloadDialog from '../src/ui/shell/DownloadDialog';
import {TestingCard} from '../src/ui/shell/Cards';
import {startWorker} from './worker-harness';
import type {Tag} from '../src/plc/model';

const TURKISH=/[çğıöşüÇĞİÖŞÜ]/,noop=()=>{};
const render=(lang:Lang,node:ReactNode)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:node}));
const unescape=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
const visible=(html:string)=>{const attrs=[...html.matchAll(/ (?:title|aria-label|placeholder)="([^"]*)"/g)].map(m=>m[1]);return unescape([html.replace(/<[^>]*>/g,'\n'),...attrs].join('\n'));};
const clean=(lang:Lang,html:string,what:string)=>{const text=visible(html);for(const line of text.split('\n').map(x=>x.trim()))assert.ok(!/^(plcsim|dl|msg|tree|testing|toolbar)\.[A-Za-z.]+$/.test(line),`${what}/${lang}: raw key "${line}"`);assert.doesNotMatch(text,/undefined|\[object|NaN|\{\w+\}/,`${what}/${lang}`);if(lang==='en')assert.doesNotMatch(text,TURKISH,`${what}/en Turkish letters`);};
const has=(lang:Lang,html:string,...keys:(keyof typeof shellDict.en)[])=>{const text=visible(html);for(const k of keys)assert.ok(text.includes(shellDict[lang][k]),`${lang}: "${shellDict[lang][k]}" (${k}) missing`);};
const disabledButton=(html:string,text:string)=>new RegExp(`<button[^>]*disabled=""[^>]*>${text}</button>`).test(html);

// ---- dictionary: new keys ----
const NEW_KEYS=['plcsim.title','plcsim.ip','plcsim.close','plcsim.notLoaded','plcsim.loaded','plcsim.differs','plcsim.dock','dl.title','dl.preview','dl.results','dl.search','dl.searching','dl.found','dl.none','dl.load','dl.cancel','dl.finish','dl.ready','dl.notReady','dl.stopModules','dl.stopAll','dl.noAction','dl.software','dl.compileErrors','dl.loading','dl.startAll','dl.done','msg.needDownload','msg.noSimulation','msg.differs','msg.simClosed','testing.needOnline','tree.differs','tree.forceTable','view.force'] as const;
test('shellDict: download / simulation / differs keys exist in en and tr, are translated, keep placeholders',()=>{
 const d=shellDict as unknown as Record<Lang,Record<string,string>>;
 for(const k of NEW_KEYS){for(const lang of LANGS)assert.ok(d[lang][k]?.trim(),`${lang} ${k}`);}
 assert.equal(d.en['dl.compileErrors'].includes('{n}'),true);assert.equal(d.tr['dl.compileErrors'].includes('{n}'),true);
 assert.equal(d.en['msg.differs'].includes('{block}'),true);assert.equal(d.tr['msg.differs'].includes('{block}'),true);
 for(const k of NEW_KEYS)if(!['dl.software','dl.load'].includes(k))assert.notEqual(d.en[k],d.tr[k],`${k} is identical in en and tr`);
 for(const k of ['plcsim.closed','plcsim.project','dl.check'])for(const lang of LANGS)assert.ok(!(k in d[lang]),`${k} was removed`);
 // TIA wording
 assert.equal(d.en['dl.title'],'Extended download to device');assert.equal(d.en['dl.preview'],'Load preview');assert.equal(d.en['dl.results'],'Load results');assert.equal(d.en['dl.search'],'Start search');assert.equal(d.en['dl.startAll'],'Start all');assert.equal(d.en['dl.finish'],'Finish');
 assert.equal(d.tr['dl.search'],'Aramayı başlat');assert.equal(d.tr['dl.finish'],'Bitir');assert.equal(d.tr['dl.startAll'],'Tümünü başlat');
});

// ---- Plcsim ----
const sim=(lang:Lang,over:Partial<Parameters<typeof Plcsim>[0]>={})=>render(lang,createElement(Plcsim,{cpu:'CPU 1214C DC/DC/DC',mode:'STOP',loaded:true,consistent:true,errors:0,forces:0,onRun:noop,onStop:noop,onMres:noop,onClose:noop,...over}));
test('Plcsim SSR: title, CPU, IP, LEDs and RUN/STOP/MRES in en and tr',()=>{
 for(const lang of LANGS){
  const html=sim(lang);has(lang,html,'plcsim.title','plcsim.ip','plcsim.close','plcsim.dock','plcsim.loaded');
  assert.match(html,/role="dialog"/);assert.ok(html.includes('PLC_1')&&html.includes('CPU 1214C DC/DC/DC')&&html.includes('192.168.0.1'));
  for(const led of ['RUN / STOP','ERROR','MAINT'])assert.ok(html.includes(led),led);
  for(const b of ['RUN','STOP','MRES'])assert.ok(html.includes(`>${b}</button>`),b);
  clean(lang,html,'Plcsim');
 }
});
test('Plcsim SSR: STOP → RUN enabled, STOP disabled, MRES enabled, yellow RUN/STOP LED',()=>{
 const html=sim('en');
 assert.ok(!disabledButton(html,'RUN'),'RUN enabled when a program is loaded');assert.ok(disabledButton(html,'STOP'));assert.ok(!disabledButton(html,'MRES'));
 assert.match(html,/<i class="led yellow"><\/i>RUN \/ STOP/);assert.match(html,/<i class="led off"><\/i>ERROR/);assert.match(html,/<i class="led off"><\/i>MAINT/);
 assert.match(html,/<button class="pressed"[^>]*>STOP<\/button>/);
});
test('Plcsim SSR: RUN → green LED, RUN disabled, STOP enabled, MRES disabled',()=>{
 const html=sim('en',{mode:'RUN'});
 assert.match(html,/<i class="led green"><\/i>RUN \/ STOP/);assert.ok(disabledButton(html,'RUN')&&!disabledButton(html,'STOP')&&disabledButton(html,'MRES'));assert.match(html,/<button class="pressed"[^>]*>RUN<\/button>/);
});
test('Plcsim SSR: nothing downloaded → RUN disabled and "No program loaded"; differing program → warning text',()=>{
 for(const lang of LANGS){
  const none=sim(lang,{loaded:false,consistent:false});assert.ok(disabledButton(none,'RUN'));has(lang,none,'plcsim.notLoaded');assert.doesNotMatch(none,/tia-plcsim-state warn/);
  const diff=sim(lang,{loaded:true,consistent:false});has(lang,diff,'plcsim.differs');assert.match(diff,/tia-plcsim-state warn/);assert.ok(!disabledButton(diff,'RUN'),'the CPU may still run the old program');
  clean(lang,none,'Plcsim/none');clean(lang,diff,'Plcsim/differs');
 }
});
test('Plcsim SSR: MAINT LED yellow while forcing; ERROR LED red for ERROR mode',()=>{
 assert.match(sim('en',{forces:2}),/<i class="led yellow"><\/i>MAINT/);
 const e=sim('en',{mode:'ERROR'});assert.match(e,/<i class="led red"><\/i>ERROR/);assert.match(e,/<i class="led red"><\/i>RUN \/ STOP/);
});
test('Plcsim SSR: STOP caused by PAUSE keeps the yellow LED (no green)',()=>{assert.doesNotMatch(sim('en',{mode:'PAUSE'}),/led green/);});

// ---- DownloadDialog ----
const dialog=(lang:Lang,over:Partial<Parameters<typeof DownloadDialog>[0]>={})=>render(lang,createElement(DownloadDialog,{first:true,simulation:true,cpu:'CPU 1214C DC/DC/DC',running:false,errors:0,onLoad:async()=>true,onFinish:noop,onCancel:noop,...over}));
test('DownloadDialog SSR: first download starts at Extended download with search; Load disabled until a device is found',()=>{
 for(const lang of LANGS){
  const html=dialog(lang);has(lang,html,'dl.title','dl.interfaceType','dl.interface','dl.connection','dl.target','dl.search','dl.device','dl.deviceType','dl.interfaceTypeCol','dl.address','dl.load','dl.cancel');
  assert.match(html,/aria-modal="true"/);assert.ok(html.includes('PLC_1')&&html.includes('PN/IE')&&html.includes('PLCSIM')&&html.includes('192.168.0.1'));
  assert.ok(disabledButton(html,visible(shellDict[lang]['dl.load'])),'Load disabled before search');assert.doesNotMatch(html,/<tr class="selected">/,'no device listed before the search');
  assert.ok(!visible(html).includes(shellDict[lang]['dl.found']));
  clean(lang,html,'DownloadDialog/connect');
 }
});
test('DownloadDialog SSR: later downloads skip the connect step and open the Load preview',()=>{
 for(const lang of LANGS){
  const html=dialog(lang,{first:false});
  has(lang,html,'dl.preview','dl.status','dl.col.target','dl.message','dl.action','dl.software','dl.softwareMsg','dl.consistent','dl.ready','dl.load','dl.cancel');
  assert.ok(!visible(html).includes(shellDict[lang]['dl.search']),'no search step');assert.ok(!visible(html).includes(shellDict[lang]['dl.stopModules']),'no Stop modules row while the CPU is in STOP');
  assert.ok(!disabledButton(html,shellDict[lang]['dl.load']),'Load enabled');assert.ok(html.includes('class="tia-dialog-title"')&&html.includes(`<span>${shellDict[lang]['dl.preview']}</span>`));
  clean(lang,html,'DownloadDialog/preview');
 }
});
test('DownloadDialog SSR: running CPU shows Stop modules with Stop all / No action; Load stays enabled with Stop all',()=>{
 for(const lang of LANGS){
  const html=dialog(lang,{first:false,running:true});has(lang,html,'dl.stopModules','dl.stopModulesMsg','dl.stopAll','dl.noAction','dl.ready');
  assert.match(html,/<option value="stop" selected="">/,'Stop all is the default');assert.ok(!disabledButton(html,shellDict[lang]['dl.load']));
  clean(lang,html,'DownloadDialog/running');
 }
});
test('DownloadDialog SSR: compile errors block Load and are listed with their count',()=>{
 for(const lang of LANGS){
  const html=dialog(lang,{first:false,errors:3});has(lang,html,'dl.notReady');
  assert.ok(visible(html).includes(shellDict[lang]['dl.compileErrors'].replace('{n}','3')));assert.ok(disabledButton(html,shellDict[lang]['dl.load']),`${lang}: Load disabled`);assert.ok(!visible(html).includes(shellDict[lang]['dl.ready']));
  assert.ok(html.includes('#c0392b'),'red status icon');
  clean(lang,html,'DownloadDialog/errors');
 }
});

// ---- Testing card: CPU operator panel ----
test('TestingCard SSR: LEDs and buttons follow mode and forces (MAINT)',()=>{
 for(const lang of LANGS){
  const f=render(lang,createElement(TestingCard,{mode:'RUN',scans:5,time:50,forces:2,errors:0,busy:false,speed:'1',onRun:noop,onStop:noop,onMres:noop,onPause:noop,onStep:noop,onSpeed:noop,process:createElement('div',null,'PROCESS')}));
  assert.match(f,/led yellow[^>]*><\/i>MAINT|MAINT[^<]*<i class="led yellow"|<i class="led yellow"><\/i>MAINT/);assert.match(f,/led green/);clean(lang,f,'TestingCard');
 }
});

// ---- worker: download → run → unload protocol used by the Lab ----
const tag=(name:string,type:Tag['type'],address:string,initial:Tag['initial']=false):Tag=>({name,type,address,initial,comment:''});
const prog=(coil:string)=>({version:1,cpu:'CPU 1214C DC/DC/DC',tags:[tag('START','BOOL','%I0.0'),tag('STOP','BOOL','%I0.1'),tag('MOTOR','BOOL','%Q0.0'),tag('LAMP','BOOL','%Q0.1')],blocks:[
 {id:'OB1',kind:'OB',networks:[{id:'n1',title:'n1',logic:{id:'a',type:'AND',children:[{id:'c',type:'NO',tag:'START'}]},output:{type:'COIL',tag:coil}}]},{id:'OB100',kind:'OB',networks:[]}]});
test('Worker: the CPU runs the downloaded program; a second download replaces it; clear unloads (offline edits never reach the CPU)',async()=>{
 const w=await startWorker();
 w.send({action:'clear',plant:'motor',lang:'en'});assert.equal(w.last().snapshot,undefined,'unloaded CPU has no snapshot');
 w.send({action:'run'});assert.equal(w.last().mode,'STOP','run without a program does nothing');
 w.send({action:'load',program:prog('MOTOR'),plant:'motor'});w.send({action:'input',tag:'START',value:true});w.send({action:'run'});w.tick();
 assert.equal(w.last().mode,'RUN');assert.equal(w.last().snapshot?.outputs.MOTOR,true);assert.equal(w.last().snapshot?.outputs.LAMP,false);
 // download of a changed program: CPU is reset to STOP, the new program drives the other coil
 w.send({action:'stop'});w.send({action:'load',program:prog('LAMP'),plant:'motor'});assert.equal(w.last().mode,'STOP');
 w.send({action:'input',tag:'START',value:true});w.send({action:'run'});w.tick();assert.equal(w.last().snapshot?.outputs.LAMP,true);assert.equal(w.last().snapshot?.outputs.MOTOR,false);
 w.send({action:'clear',plant:'motor'});assert.equal(w.last().mode,'STOP');assert.equal(w.last().snapshot,undefined);
 w.tick();assert.equal(w.last().snapshot,undefined,'nothing runs after unload');
});

// ---- Plcsim: mode in the title, collapse button ----
test('Plcsim SSR: title shows the CPU mode; collapse and close buttons are labelled per language; starts expanded',()=>{
 for(const lang of LANGS){
  for(const mode of ['STOP','RUN']){const html=sim(lang,{mode});assert.ok(html.includes(`${shellDict[lang]['plcsim.title']} · ${mode}`),`${lang} ${mode}`);}
  const html=sim(lang);has(lang,html,'pane.collapse','plcsim.close');assert.match(html,/tia-plcsim-body/);
  assert.doesNotMatch(html,/led red"><\/i>ERROR/,'no red ERROR LED when the CPU is fine');
  clean(lang,html,'Plcsim/title');
 }
});
