import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/i18n/react';
import {LANGS,type Dict,type Lang} from '../src/i18n/core';
import {shellDict} from '../src/i18n/dict/shell';
import {instructionsDict} from '../src/i18n/dict/instructions';
import {labDict} from '../src/i18n/dict/lab';
import TopBar,{type ToolbarActions} from '../src/ui/shell/TopBar';
import ProjectTree from '../src/ui/ProjectTree';
import Inspector,{type InspectorTab,type InspectorSub} from '../src/ui/shell/Inspector';
import EditorBar from '../src/ui/shell/EditorBar';
import {TaskCardPane,TaskCardTabs,type CardId} from '../src/ui/shell/TaskCards';
import {LibrariesCard,TasksCard,TestingCard} from '../src/ui/shell/Cards';
import {BlockProperties,CompileList,MessageLog,TestResults} from '../src/ui/shell/InspectorPanes';
import Instructions from '../src/ui/Instructions';
import {challenge,catalogFor} from '../src/challenges/catalog';
import {evaluate,validated} from '../src/challenges/evaluator';
import {blankNetwork,type Block,type Tag} from '../src/plc/model';

const TURKISH=/[çğıöşüÇĞİÖŞÜ]/;
const noop=()=>{};
const render=(lang:Lang,node:ReactNode)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:node}));
const unescape=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
// Everything a user can read: text nodes plus title / aria-label / placeholder attributes.
const visible=(html:string)=>{const attrs=[...html.matchAll(/ (?:title|aria-label|placeholder)="([^"]*)"/g)].map(m=>m[1]);return unescape([html.replace(/<[^>]*>/g,'\n'),...attrs].join('\n'));};
const RAW_KEY=/(?:^|[\s"'(])(?:pane|details|tree|menu|toolbar|card|inspector|editorbar|editor|iface|overview|msg|view|testing|tasks|tests|info|sub|props|instructor|scan|diag|block|device|d|g|x|t|c|col)\.[A-Za-z0-9_ =<>]+$/m;
const rawKeys=(text:string)=>text.split('\n').map(x=>x.trim()).filter(x=>x&&/^[a-z]{1,12}\.[A-Za-z0-9]{2,}$/.test(x));

// ---- dictionaries ----
const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
const dicts:[string,Dict<string>][]=[['shell',shellDict],['instructions',instructionsDict],['lab',labDict]];
for(const [name,dict] of dicts){
 test(`${name} dictionary: en/tr have the same keys, placeholders, nothing empty, no Turkish letters in English`,()=>{
  assert.deepEqual(Object.keys(dict.tr).sort(),Object.keys(dict.en).sort());
  for(const key of Object.keys(dict.en)){
   for(const lang of LANGS)assert.ok(dict[lang][key].trim(),`${lang} ${key} is empty`);
   assert.equal(placeholders(dict.tr[key]),placeholders(dict.en[key]),`placeholders of ${key}`);
   assert.doesNotMatch(dict.en[key],TURKISH,`English ${key}`);
   assert.notEqual(dict.en[key],key,`${key} value equals its key`);assert.notEqual(dict.tr[key],key,`${key} value equals its key`);
  }
 });
 test(`${name} dictionary: identical en/tr text is only mnemonics, names or symbols`,()=>{
  for(const key of Object.keys(dict.en).filter(k=>dict.en[k]===dict.tr[k]))
   assert.doesNotMatch(dict.en[key].replace(/\{\w+\}|\b[A-Z_0-9]{2,}\b|\b(Network|Tag|tag|Ladder|Trace|PLC|Lab|Web|String|Char|PROFIenergy|OB|LAD|PID|IO)\b|[^A-Za-z]/g,''),/[a-z]{3,}/,`${key} looks untranslated`);
 });
}
test('shell dictionary: required TIA wording per language',()=>{
 const pairs:[keyof typeof shellDict.en,string,string][]=[['pane.projectTree','Project tree','Proje ağacı'],['pane.details','Details view','Ayrıntı görünümü'],['tree.programBlocks','Program blocks','Program blokları'],['tree.addBlock','Add new block','Yeni blok ekle'],['tree.defaultTagTable','Default tag table','Varsayılan etiket tablosu'],['tree.watchTables','Watch and force tables','İzleme ve zorlama tabloları'],['menu.project','Project','Proje'],['menu.options','Options','Seçenekler'],['inspector.properties','Properties','Özellikler'],['inspector.info','Info','Bilgi'],['inspector.diagnostics','Diagnostics','Tanılama'],['toolbar.compile','Compile','Derle'],['toolbar.download','Download to device','Cihaza yükle'],['toolbar.goOnline','Go online','Çevrimiçi ol'],['toolbar.goOffline','Go offline','Çevrimdışı ol'],['editorbar.portal','Portal view','Portal görünümü'],['editor.interface','Block interface','Blok arayüzü']];
 for(const [k,en,tr] of pairs){assert.equal(shellDict.en[k],en,k);assert.equal(shellDict.tr[k],tr,k);}
 assert.equal(instructionsDict.en.favorites,'Favorites');assert.equal(instructionsDict.tr.favorites,'Favoriler');assert.equal(instructionsDict.tr.basic,'Temel komutlar');
});
test('instructions dictionary: every instruction listed in the task card has a description',()=>{
 for(const k of ['NETWORK','NO','NC','COIL','SET','RESET','R_TRIG','F_TRIG','TON','TOF','TP','CTU','CTD','CTUD','CMP ==','CMP <>','CMP >=','CMP <=','CMP >','CMP <','ADD','SUB','MUL','DIV','MOVE','INT_TO_REAL','REAL_TO_INT','WORD_TO_INT','NORM_X','SCALE_X'])
  for(const lang of LANGS)assert.ok((instructionsDict[lang] as Record<string,string>)[`d.${k}`],`${lang} d.${k}`);
});

// ---- fixtures ----
const tags:Tag[]=[{name:'START',type:'BOOL',address:'%I0.0',initial:false,comment:''},{name:'MOTOR',type:'BOOL',address:'%Q0.0',initial:false,comment:''}];
const blocks:Block[]=[{id:'OB1',kind:'OB',networks:[{...blankNetwork(),title:'Motor start'}]},{id:'OB100',kind:'OB',networks:[]}];
const actions=(over:Partial<ToolbarActions>={}):ToolbarActions=>({newProject:noop,openProject:noop,save:noop,undo:noop,redo:noop,canUndo:true,canRedo:true,compile:noop,download:noop,startSimulation:noop,goOnline:noop,goOffline:noop,accessible:noop,startCpu:noop,stopCpu:noop,search:noop,online:false,running:false,busy:false,locked:false,...over});
const menuNames=(lang:Lang)=>(['project','edit','view','insert','online','options','tools','window','help'] as const).map(k=>shellDict[lang][`menu.${k}`]);
const topBar=(lang:Lang,over:Partial<ToolbarActions>={})=>render(lang,createElement(TopBar,{menus:menuNames(lang).map(name=>({name,items:[]})),a:actions(over)}));
const tree=(lang:Lang,online=false,active:'ladder:OB1'='ladder:OB1')=>render(lang,createElement(ProjectTree,{projectName:'PLC_Lab_Project',cpuName:'CPU 1214C DC/DC/DC',blocks,tags,active,online,onOpen:noop,onCollapse:noop}));
const subs=(lang:Lang):Record<InspectorTab,InspectorSub[]>=>({properties:[{id:'general',label:shellDict[lang]['sub.general'],content:'props'}],info:[{id:'general',label:shellDict[lang]['sub.general'],content:'info'},{id:'compile',label:shellDict[lang]['sub.compile'],content:'cmp'}],diagnostics:[{id:'device',label:shellDict[lang]['sub.deviceInfo'],content:'dev'}]});
const inspector=(lang:Lang,tab:InspectorTab='properties',open=true)=>render(lang,createElement(Inspector,{title:'Main [OB1]',tab,sub:'general',open,badge:2,subs:subs(lang),onTab:noop,onSub:noop,onToggle:noop}));
const editorBar=(lang:Lang,kind:'ok'|'warning'|'error'='ok')=>render(lang,createElement(EditorBar,{editors:[{id:'ladder:OB1',label:'Main [OB1]',icon:null},{id:'tags',label:shellDict[lang]['view.tags'],icon:null}],active:'ladder:OB1',status:{kind,text:'status text'},onActivate:noop,onPortal:noop,onOverview:noop}));
const cards:CardId[]=['instructions','testing','tasks','libraries','addins'];
const testing=(lang:Lang,mode='STOP',over:object={})=>render(lang,createElement(TestingCard,{mode,scans:0,time:0,forces:0,errors:0,busy:false,speed:'1',onRun:noop,onStop:noop,onMres:noop,onPause:noop,onStep:noop,onSpeed:noop,process:createElement('div',null,'PROCESS'),...over}));
const tasks=(lang:Lang,id=3)=>render(lang,createElement(TasksCard,{c:challenge(id,0,lang),locked:false,busy:false,onChoose:noop,onVariant:noop,onDebug:noop,onCheck:noop,onLearning:noop,onInstructor:noop,exercise:createElement('div',null,'EXERCISE')}));
const instructions=(lang:Lang)=>render(lang,createElement(Instructions,{insert:noop,disabled:false,onProblem:noop}));

const has=(lang:Lang,html:string,...keys:(keyof typeof shellDict.en)[])=>{const text=visible(html);for(const k of keys)assert.ok(text.includes(shellDict[lang][k]),`${lang}: "${shellDict[lang][k]}" (${k}) missing`);};
const clean=(lang:Lang,html:string,what:string)=>{const text=visible(html);assert.deepEqual(rawKeys(text),[],`${what}/${lang}: raw dictionary keys leaked`);assert.doesNotMatch(text,RAW_KEY,`${what}/${lang}: raw key`);assert.doesNotMatch(text,/undefined|\[object|NaN|\{\w+\}/,`${what}/${lang}: undefined/NaN/placeholder`);if(lang==='en')assert.doesNotMatch(text,TURKISH,`${what}/en has Turkish letters`);};

test('TopBar: menu names, toolbar labels and search box per language; wordmark; no raw keys',()=>{
 for(const lang of LANGS){
  const html=topBar(lang);
  has(lang,html,'toolbar.label','toolbar.save','toolbar.goOnline','toolbar.goOffline','toolbar.compile','toolbar.download','toolbar.startCpu','toolbar.stopCpu','toolbar.search','toolbar.undo','toolbar.redo');
  for(const name of menuNames(lang))assert.ok(html.includes(`>${name}<`),`${lang} menu ${name}`);
  assert.match(html,new RegExp(`placeholder="&lt;${shellDict[lang]['toolbar.search']}&gt;"`));
  assert.match(html,/PLC Lab Web/);assert.match(html,/TRAINER/);
  clean(lang,html,'TopBar');
 }
 assert.ok(menuNames('en').includes('Options')&&menuNames('tr').includes('Seçenekler'));
});
test('TopBar: online / running / busy / locked state drives disabled buttons',()=>{
 const disabled=(html:string,label:string)=>new RegExp(`<button[^>]*aria-label="${label}"[^>]*disabled`).test(html)||new RegExp(`<button[^>]*disabled[^>]*aria-label="${label}"`).test(html);
 const off=topBar('en'),on=topBar('en',{online:true,running:true});
 assert.ok(disabled(off,'Go offline')&&!disabled(off,'Go online')&&disabled(off,'Stop CPU')&&!disabled(off,'Start CPU')&&!disabled(off,'Compile'));
 assert.ok(!disabled(on,'Go offline')&&disabled(on,'Go online')&&!disabled(on,'Stop CPU')&&disabled(on,'Start CPU')&&disabled(on,'Download to device'));
 assert.match(on,/tia-tool pressed|tia-tool with-text pressed/);
 assert.ok(disabled(topBar('tr',{busy:true}),shellDict.tr['toolbar.save'])&&disabled(topBar('tr',{locked:true}),shellDict.tr['toolbar.undo']));
});
test('ProjectTree: tabs, object names, details view; no raw keys; English-only chrome in en',()=>{
 for(const lang of LANGS){
  const html=tree(lang);
  has(lang,html,'pane.projectTree','pane.collapse','tree.devices','tree.plantObjects','tree.addDevice','tree.devicesNetworks','tree.deviceConfig','tree.onlineDiag','tree.programBlocks','tree.addBlock','tree.plcTags','tree.showAllTags','tree.addTagTable','tree.watchTables','tree.addWatchTable','tree.watchTable1','tree.screens','tree.processScreen','tree.exercises','pane.details','details.name','details.address','tree.overview');
  assert.ok(html.includes(`${shellDict[lang]['tree.defaultTagTable']} [2]`),`${lang} default tag table with count`);
  assert.ok(html.includes('Main [OB1]')&&html.includes('Startup [OB100]'),'block names are stable identifiers');
  assert.ok(html.includes('PLC_1 [CPU 1214C DC/DC/DC]')&&html.includes(`HMI_1 [${shellDict[lang]['tree.processScreens']}]`)&&html.includes('PLC_Lab_Project'));
  assert.match(html,/role="tree"/);assert.match(html,/Double-click|çift tıkla/);
  assert.match(html,/Motor start/,'details view of the selected block lists its networks');
  clean(lang,html,'ProjectTree');
 }
 assert.ok(!tree('en').includes('tia-tree-status'));assert.ok(tree('en',true).includes('tia-tree-status'),'online shows status dots');
});
test('Inspector: tab names per language, active tab, badge, collapse button, secondary tabs',()=>{
 for(const lang of LANGS){
  const html=inspector(lang);
  has(lang,html,'inspector.label','inspector.properties','inspector.info','inspector.diagnostics','pane.collapse','sub.general');
  assert.ok(html.includes('Main [OB1]'));assert.match(html,/<i class="tia-badge">2<\/i>/);
  assert.match(html,/role="tab" aria-selected="true" class="active"[^>]*>[\s\S]{0,1500}?(Properties|Özellikler)/);
  clean(lang,html,'Inspector');
  const info=inspector(lang,'info');assert.ok(visible(info).includes(shellDict[lang]['sub.compile']));assert.match(info,/>cmp<|hidden/);
  const closed=inspector(lang,'info',false);assert.ok(closed.includes('collapsed')&&!closed.includes('tia-subtabs'));has(lang,closed,'pane.expand');
 }
});
test('EditorBar: Portal view, Overview, open editors, status line with message',()=>{
 for(const lang of LANGS){
  for(const kind of ['ok','warning','error'] as const){const html=editorBar(lang,kind);has(lang,html,'editorbar.portal','editorbar.overview','editorbar.open');assert.ok(html.includes('status text')&&html.includes(`tia-statusline ${kind}`));clean(lang,html,'EditorBar');}
  const html=editorBar(lang);assert.ok(html.includes('Main [OB1]')&&html.includes(shellDict[lang]['view.tags']));assert.match(html,/aria-selected="true"[^>]*class="tia-editor-tab active"|class="tia-editor-tab active"/);
 }
});
test('TaskCardPane / TaskCardTabs: five cards named per language, active card collapsible',()=>{
 for(const lang of LANGS){
  const tabs=render(lang,createElement(TaskCardTabs,{active:'tasks',open:true,onSelect:noop}));
  has(lang,tabs,'card.tabs','card.instructions','card.testing','card.tasks','card.libraries','card.addins');
  assert.equal([...tabs.matchAll(/aria-pressed="true"/g)].length,1);assert.equal([...render(lang,createElement(TaskCardTabs,{active:'tasks',open:false,onSelect:noop})).matchAll(/aria-pressed="true"/g)].length,0);
  for(const card of cards){const html=render(lang,createElement(TaskCardPane,{active:card,onClose:noop,children:'BODY'}));has(lang,html,`card.${card}` as keyof typeof shellDict.en,'pane.collapse');assert.ok(html.includes('BODY'));clean(lang,html,`TaskCardPane/${card}`);}
  const lib=render(lang,createElement(LibrariesCard));has(lang,lib,'card.projectLibrary','card.globalLibraries');clean(lang,lib,'LibrariesCard');
 }
});
test('TestingCard: CPU panel, mode, LEDs, buttons, scan control, speed',()=>{
 for(const lang of LANGS){
  const stop=testing(lang),run=testing(lang,'RUN',{scans:42,time:420,forces:1});
  has(lang,stop,'testing.cpuPanel','testing.mode','testing.mres','testing.scanControl','testing.pause','testing.singleScan','testing.process','testing.note');
  for(const w of ['RUN / STOP','ERROR','MAINT','PROCESS'])assert.ok(stop.includes(w),w);
  assert.match(stop,/<strong class="stop">STOP/);assert.match(run,/<strong class="run">RUN/);
  assert.match(stop,/led yellow/);assert.match(run,/led green/);assert.match(run,/led yellow/,'forces light MAINT');
  assert.match(testing(lang,'STOP',{errors:1}),/led red/);
  assert.match(visible(run),/42/);clean(lang,stop,'TestingCard');clean(lang,run,'TestingCard run');
  assert.match(run,/<button class="pressed"[^>]*disabled[^>]*>RUN/);assert.match(stop,/<button class="pressed"[^>]*disabled[^>]*>STOP/);
 }
});
test('TasksCard: exercise chooser, localized exercise text, chips, I/O, actions',()=>{
 for(const lang of LANGS)for(const id of [1,3,7,20]){
  const html=tasks(lang,id),c=challenge(id,0,lang),entry=catalogFor(lang).find(x=>x.id===id)!;
  has(lang,html,'tasks.requirements','tasks.io','tasks.check','tasks.instructor','tasks.newVariant','tasks.debug','tasks.learning');
  assert.ok(visible(html).includes(entry.title),`${lang} ${id} title in chooser`);
  assert.ok(html.includes(`>${String(id).padStart(2,'0')} · ${entry.title}<`)||html.includes(entry.title));
  assert.ok(html.includes('EXERCISE'));assert.ok(c.tags.length>0&&html.includes(c.tags.find(x=>x.address.startsWith('%I')||x.address.startsWith('%Q'))!.address));
  clean(lang,html,`TasksCard/${id}`);
 }
 assert.notEqual(tasks('en',3),tasks('tr',3));assert.match(tasks('tr',3),/Mühürleme|Seal-in/);assert.match(tasks('en',3),/Seal-in/);
});
test('Instructions task card: sections, folders, instruction rows per language; search placeholder',()=>{
 for(const lang of LANGS){
  const html=instructions(lang),d=instructionsDict[lang];
  for(const k of ['options','favorites','basic','extended','technology','communication','optional','col.name','col.description','col.version','g.general','g.bit','g.timer','g.counter','g.compare','g.math','g.move','g.convert','hint','showTask'] as const)assert.ok(visible(html).includes(d[k]),`${lang} ${k}`);
  assert.ok(visible(html).includes(d.search)&&html.includes(`aria-label="${d.searchLabel}"`));
  // Open by default: Basic instructions › Bit logic and Timer operations.
  for(const k of ['NO','NC','COIL','SET','RESET','TON','TOF','TP'])assert.ok(html.includes((instructionsDict[lang] as Record<string,string>)[`d.${k}`]),`${lang} ${k} description`);
  for(const w of ['P_TRIG','N_TRIG'])assert.ok(html.includes(w),w);
  assert.ok(!/R_TRIG|F_TRIG/.test(html.replace(/title="[^"]*"/g,'').replace(/<svg[\s\S]*?<\/svg>/g,'')),'R_TRIG/F_TRIG shown as P_TRIG/N_TRIG');
  assert.match(html,/Version|Sürüm/);assert.ok(html.includes('V1.0'));
  clean(lang,html,'Instructions');
 }
});
test('Inspector panes: block properties, message log, compile list, test results are localized',()=>{
 for(const lang of LANGS){
  const props=render(lang,createElement(BlockProperties,{block:blocks[0],name:'Main'}));has(lang,props,'props.general','props.name','props.type','props.language','props.number','props.networks');clean(lang,props,'BlockProperties');
  assert.match(props,/<button class="active">/);
  const empty=render(lang,createElement(MessageLog,{log:[]}));has(lang,empty,'info.empty');
  const log=render(lang,createElement(MessageLog,{log:[{time:'10:00:00',text:'hello',kind:'ok'},{time:'10:00:01',text:'bad',kind:'error'}]}));has(lang,log,'info.time','info.message');assert.ok(log.indexOf('bad')<log.indexOf('hello'),'newest first');
  const cl=render(lang,createElement(CompileList,{diagnostics:[{code:'E1',severity:'error',message:'broken',network:'n1'}],onFocus:noop}));assert.ok(cl.includes('E1')&&cl.includes('broken'));clean(lang,cl,'CompileList');
  const none=render(lang,createElement(TestResults,{busy:false,onCheck:noop,onNext:noop}));has(lang,none,'tests.emptyTitle','tests.emptyText','tests.check');
  const m=validated(3,0),res=evaluate(m.reference,3,0,0,lang),fail=evaluate({version:1,cpu:'CPU 1214C DC/DC/DC',tags:m.reference.tags,blocks:[{id:'OB1',kind:'OB',networks:[]},{id:'OB100',kind:'OB',networks:[]}]},3,0,0,lang);
  const ok=render(lang,createElement(TestResults,{result:res,busy:false,onCheck:noop,onNext:noop}));has(lang,ok,'tests.result','tests.passed','tests.pass','tests.next','tests.note');
  assert.ok(res.results.every(r=>ok.includes(unescape(r.title??r.name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'))||ok.includes(r.title??r.name)),`${lang}: every test row shows its localized title`);
  const bad=render(lang,createElement(TestResults,{result:fail,busy:false,onCheck:noop,onNext:noop}));has(lang,bad,'tests.failed','tests.fail','tests.expected','tests.actual');
  for(const k of ['logic','safety','structure','conventions','efficiency','debugging'])assert.ok(!ok.includes(`>${k}<`)||lang==='en','score names are translated');
  clean(lang,ok,'TestResults');
 }
});

// ---- regressions found by browser testing ----
test('Inspector: panes of different tabs may share a sub-tab id without duplicate React keys',()=>{
 const seen:string[]=[],original=console.error;console.error=(...a:unknown[])=>{seen.push(a.map(String).join(' '));};
 try{for(const lang of LANGS)for(const tab of ['properties','info','diagnostics'] as const)inspector(lang,tab);}finally{console.error=original;}
 assert.deepEqual(seen.filter(x=>/same key|unique/i.test(x)),[]);
});
test('Stylesheet does not hide the Tasks card exercise panel',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const f of ['app/globals.css','app/tia.css'])assert.doesNotMatch(readFileSync(f,'utf8'),/\.exercise-panel\{display:none/);
});
