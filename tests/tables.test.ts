import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/i18n/react';
import {LANGS,type Lang} from '../src/i18n/core';
import {tablesDict as tablesDictTyped,tablesDict} from '../src/i18n/dict/tables';
import {shellDict} from '../src/i18n/dict/shell';
import {TagTable,WatchTable,ForceTable,formatValue,parseValue,defaultFormat,type WatchRow,type ForceRow} from '../src/ui/shell/Tables';
import ProjectTree from '../src/ui/ProjectTree';
import {types,type DataType,type Tag} from '../src/plc/model';
import {validScalar} from '../src/plc/memory';
import {startWorker} from './worker-harness';

// ---- formatValue / parseValue / defaultFormat ----
test('defaultFormat: first display format of every data type',()=>{
 const expected:Record<DataType,string>={BOOL:'Bool',BYTE:'Hex',WORD:'Hex',DWORD:'Hex',INT:'DEC+/-',DINT:'DEC+/-',REAL:'Floating-point number',TIME:'Time'};
 for(const ty of types)assert.equal(defaultFormat(ty),expected[ty],ty);
});
test('formatValue: Bool, DEC, Hex and Bin per data type incl. negative numbers',()=>{
 assert.equal(formatValue(true,'BOOL','Bool'),'TRUE');assert.equal(formatValue(false,'BOOL','Bool'),'FALSE');
 assert.equal(formatValue(undefined,'INT','DEC+/-'),'');
 // INT: signed decimal, two's complement for Hex/Bin
 assert.equal(formatValue(0,'INT','DEC+/-'),'0');assert.equal(formatValue(32767,'INT','DEC+/-'),'32767');assert.equal(formatValue(-32768,'INT','DEC+/-'),'-32768');assert.equal(formatValue(-5,'INT','DEC+/-'),'-5');
 assert.equal(formatValue(-1,'INT','Hex'),'16#FFFF');assert.equal(formatValue(-32768,'INT','Hex'),'16#8000');assert.equal(formatValue(255,'INT','Hex'),'16#00FF');
 assert.equal(formatValue(-1,'INT','Bin'),'2#1111111111111111');assert.equal(formatValue(5,'INT','Bin'),'2#0000000000000101');
 // DINT 32 bits
 assert.equal(formatValue(-1,'DINT','Hex'),'16#FFFFFFFF');assert.equal(formatValue(-2147483648,'DINT','Hex'),'16#80000000');assert.equal(formatValue(2147483647,'DINT','Hex'),'16#7FFFFFFF');
 assert.equal(formatValue(-1,'DINT','Bin'),`2#${'1'.repeat(32)}`);assert.equal(formatValue(-123456,'DINT','DEC+/-'),'-123456');
 // BYTE / WORD / DWORD unsigned
 assert.equal(formatValue(255,'BYTE','Hex'),'16#FF');assert.equal(formatValue(10,'BYTE','Hex'),'16#0A');assert.equal(formatValue(5,'BYTE','Bin'),'2#00000101');assert.equal(formatValue(200,'BYTE','DEC'),'200');
 assert.equal(formatValue(65535,'WORD','Hex'),'16#FFFF');assert.equal(formatValue(65535,'WORD','DEC'),'65535');assert.equal(formatValue(1,'WORD','Bin'),'2#0000000000000001');assert.equal(formatValue(0xABC,'WORD','Hex'),'16#0ABC');
 assert.equal(formatValue(4294967295,'DWORD','Hex'),'16#FFFFFFFF');assert.equal(formatValue(4294967295,'DWORD','DEC'),'4294967295');assert.equal(formatValue(0,'DWORD','Hex'),'16#00000000');assert.equal(formatValue(1,'DWORD','Bin'),`2#${'0'.repeat(31)}1`);
});
test('formatValue: REAL and TIME',()=>{
 const f='Floating-point number';
 assert.equal(formatValue(3.25,'REAL',f),'3.25');assert.equal(formatValue(0,'REAL',f),'0.0');assert.equal(formatValue(-2,'REAL',f),'-2.0');assert.equal(formatValue(-0.5,'REAL',f),'-0.5');
 assert.equal(formatValue(0.1+0.2,'REAL',f),'0.3','REAL is shown with 7 significant digits');assert.equal(formatValue(Math.fround(3.14159265),'REAL',f),'3.141593');
 assert.equal(formatValue(1000,'TIME','Time'),'T#1000MS');assert.equal(formatValue(0,'TIME','Time'),'T#0MS');assert.equal(formatValue(-250,'TIME','Time'),'T#-250MS');
 assert.equal(formatValue(1500,'TIME','DEC+/-'),'1500');assert.equal(formatValue(-1500,'TIME','DEC+/-'),'-1500');
});
test('parseValue: BOOL',()=>{
 for(const [text,v] of [['TRUE',true],['true',true],[' True ',true],['1',true],['FALSE',false],['false',false],['0',false]] as const)assert.equal(parseValue(text,'BOOL'),v,text);
 for(const text of ['','  ','2','yes','-1','16#1','T#1'])assert.equal(parseValue(text,'BOOL'),undefined,text);
});
test('parseValue: decimal, 16#, 2# and T# input incl. negative numbers',()=>{
 assert.equal(parseValue('42','INT'),42);assert.equal(parseValue('-42','INT'),-42);assert.equal(parseValue(' -7 ','DINT'),-7);assert.equal(parseValue('0','BYTE'),0);
 assert.equal(parseValue('16#FF','BYTE'),255);assert.equal(parseValue('16#ff','BYTE'),255,'lower case');assert.equal(parseValue('16#FFFF','WORD'),65535);assert.equal(parseValue('16#00FF','INT'),255);assert.equal(parseValue('16#FFFFFFFF','DWORD'),4294967295);
 assert.equal(parseValue('2#101','BYTE'),5);assert.equal(parseValue('2#0000000000000101','WORD'),5);
 assert.equal(parseValue('T#1500','TIME'),1500);assert.equal(parseValue('T#1500MS','TIME'),1500);assert.equal(parseValue('t#250ms','TIME'),250);assert.equal(parseValue('T#-250MS','TIME'),-250);
 assert.equal(parseValue('3.75','REAL'),3.75);assert.equal(parseValue('-0.5','REAL'),-0.5);assert.equal(parseValue('1e3','REAL'),1000);assert.equal(parseValue('3.99','INT'),3,'integers truncate');assert.equal(parseValue('-3.99','INT'),-3);
});
test('parseValue: invalid input is rejected',()=>{
 for(const ty of types.filter(x=>x!=='BOOL'))for(const text of ['','   ','abc','1,5','NaN','Infinity','--5','12abc','16#','16#XYZ','2#','T#abc'])assert.equal(parseValue(text,ty),undefined,`${ty} "${text}"`);
});
// Known weak spots of parseValue (found by T3): lenient parseInt / empty T# / unit suffixes. They pass as soon as the parser is strict.
test('parseValue: strict radix and time literals',{todo:'parseInt accepts trailing garbage, "T#" is 0, T#5S/T#1S500MS are rejected'},()=>{
 assert.equal(parseValue('16#FFZZ','WORD'),undefined,'16#FFZZ must be invalid, not 255');
 assert.equal(parseValue('2#102','BYTE'),undefined,'2#102 must be invalid, not 1');
 assert.equal(parseValue('T#','TIME'),undefined,'empty T# must be invalid, not 0');
 assert.equal(parseValue('T#5S','TIME'),5000);assert.equal(parseValue('T#1S500MS','TIME'),1500);
});
test('formatValue/parseValue round-trip for every type and format',()=>{
 const cases:[DataType,number|boolean][]=[['BOOL',true],['BOOL',false],['BYTE',0],['BYTE',255],['WORD',0],['WORD',65535],['WORD',4660],['DWORD',0],['DWORD',4294967295],['INT',-32768],['INT',32767],['INT',-1],['DINT',-2147483648],['DINT',2147483647],['DINT',-99],['REAL',3.25],['REAL',-12.5],['TIME',0],['TIME',-5000],['TIME',1234567]];
 const formats:Record<DataType,string[]>={BOOL:['Bool'],BYTE:['Hex','DEC','Bin'],WORD:['Hex','DEC','Bin'],DWORD:['Hex','DEC','Bin'],INT:['DEC+/-','Hex','Bin'],DINT:['DEC+/-','Hex','Bin'],REAL:['Floating-point number'],TIME:['Time','DEC+/-']};
 for(const [ty,v] of cases)for(const fmt of formats[ty]){
  const text=formatValue(v,ty,fmt),back=parseValue(text,ty);
  // Signed types shown as Hex/Bin come back unsigned (two's complement); they must still map to the same bit pattern.
  const signed=(ty==='INT'||ty==='DINT')&&(fmt==='Hex'||fmt==='Bin')&&typeof v==='number'&&v<0;
  if(signed){const bits=ty==='INT'?16:32;assert.equal(back,v+2**bits,`${ty} ${fmt} ${text}`);}else assert.equal(back,v,`${ty} ${fmt} ${text}`);
 }
});
test('Hex/Bin text of a negative INT parses to a value that is out of range for INT (the editor must not feed it to the CPU)',()=>{
 const back=parseValue(formatValue(-1,'INT','Hex'),'INT');assert.equal(back,65535);assert.equal(validScalar('INT',back!),false);
});

// ---- worker 'write' action ----
const tag=(name:string,type:Tag['type'],address:string,initial:Tag['initial']=false):Tag=>({name,type,address,initial,comment:''});
const program=()=>({version:1,cpu:'CPU 1214C DC/DC/DC',tags:[tag('START','BOOL','%I0.0'),tag('MOTOR','BOOL','%Q0.0'),tag('FLAG','BOOL','%M0.0'),tag('CNT','INT','%MW10',0),tag('SP','REAL','%MD20',0),tag('B','BYTE','%MB30',0),tag('T1','TIME','%MD40',0),tag('IW','INT','%IW64',0)],blocks:[
 {id:'OB1',kind:'OB',networks:[{id:'n1',title:'n1',logic:{id:'a',type:'AND',children:[{id:'c',type:'NO',tag:'START'}]},output:{type:'COIL',tag:'MOTOR'}}]},{id:'OB100',kind:'OB',networks:[]}]});
test("Worker 'write': sets %M/%MW/REAL/BYTE/TIME tags, also while RUN; reaches the snapshot",async()=>{
 const w=await startWorker();
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});
 w.send({action:'write',tag:'FLAG',value:true});assert.equal(w.last().snapshot?.values.FLAG,true);assert.equal(w.last().error,undefined);
 w.send({action:'write',tag:'CNT',value:-1234});assert.equal(w.last().snapshot?.values.CNT,-1234);
 w.send({action:'write',tag:'SP',value:2.5});assert.equal(w.last().snapshot?.values.SP,2.5);
 w.send({action:'write',tag:'B',value:200});assert.equal(w.last().snapshot?.values.B,200);
 w.send({action:'write',tag:'T1',value:1500});assert.equal(w.last().snapshot?.values.T1,1500);
 w.send({action:'write',tag:'FLAG',value:false});assert.equal(w.last().snapshot?.values.FLAG,false);
 assert.equal(w.last().mode,'STOP');
 w.send({action:'run'});w.tick();w.send({action:'write',tag:'CNT',value:77});assert.equal(w.last().mode,'RUN');assert.equal(w.last().snapshot?.values.CNT,77);w.tick();assert.equal(w.last().snapshot?.values.CNT,77,'value survives scans (no program writes it)');
 w.send({action:'stop'});
});
test("Worker 'write': %I input is mirrored into the runtime inputs and the program sees it; %Q is overwritten by the next scan",async()=>{
 const w=await startWorker();
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});w.send({action:'run'});
 w.send({action:'write',tag:'START',value:true});assert.equal(w.last().snapshot?.inputs.START,true);w.tick();assert.equal(w.last().snapshot?.outputs.MOTOR,true,'program sees the written input');
 w.send({action:'write',tag:'START',value:false});w.tick();assert.equal(w.last().snapshot?.outputs.MOTOR,false);
 w.send({action:'write',tag:'MOTOR',value:true});w.tick();assert.equal(w.last().snapshot?.outputs.MOTOR,false,'%Q is owned by the program');
 w.send({action:'stop'});
});
test("Worker 'write': no program, unknown tag, null/undefined value and missing tag",async()=>{
 const w=await startWorker();
 w.send({action:'clear',plant:'motor',lang:'en'});
 w.send({action:'write',tag:'FLAG',value:true});assert.equal(w.last().error,undefined,'no program loaded: ignored');assert.equal(w.last().mode,'STOP');assert.equal(w.last().snapshot,undefined);
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});
 w.send({action:'write',tag:'FLAG',value:null});w.send({action:'write',tag:'FLAG'});w.send({action:'write',value:true});assert.equal(w.last().error,undefined);assert.equal(w.last().mode,'STOP');assert.equal(w.last().snapshot?.values.FLAG,false);
 w.send({action:'write',tag:'NOPE',value:true});assert.match(w.last().error??'',/NOPE/);assert.equal(w.last().mode,'ERROR');
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});assert.equal(w.last().mode,'STOP');assert.equal(w.last().error,undefined,'load recovers from ERROR');
});
test("Worker 'write': error text follows the language",async()=>{
 const w=await startWorker();
 w.send({action:'load',program:program(),plant:'motor',lang:'tr'});
 w.send({action:'write',tag:'NOPE',value:true});const tr=w.last().error??'';assert.ok(tr.includes('NOPE'));
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});
 w.send({action:'write',tag:'NOPE',value:true});assert.notEqual(w.last().error,tr);
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});
});
// Out-of-range modify values currently put the whole CPU into ERROR (UI calls send({action:'write'}) without a range check).
test("Worker 'write': an out-of-range value is rejected without stopping the CPU",{todo:'BUG: write 40000 to an INT tag sets mode ERROR and stops the runtime'},async()=>{
 const w=await startWorker();
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});w.send({action:'run'});
 w.send({action:'write',tag:'CNT',value:40000});
 assert.equal(w.last().mode,'RUN','CPU keeps running after a rejected modify value');
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});
});
test("Worker 'force': forced input is seen by the program and survives writes; forces=null clears",async()=>{
 const w=await startWorker();
 w.send({action:'load',program:program(),plant:'motor',lang:'en'});w.send({action:'run'});
 w.send({action:'force',tag:'START',value:true});w.tick();assert.deepEqual(w.last().snapshot?.forces,{START:true});assert.equal(w.last().snapshot?.outputs.MOTOR,true);
 w.send({action:'force',tag:'START',value:null});assert.deepEqual(w.last().snapshot?.forces,{});
 w.send({action:'stop'});
});

// ---- dictionary ----
const TURKISH=/[çğıöşüÇĞİÖŞÜ]/;
const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
test('tablesDict: en/tr same keys and placeholders, nothing empty, no Turkish letters in English, tr really translated',()=>{
 const tablesDict=tablesDictTyped as unknown as Record<Lang,Record<string,string>>;
 assert.deepEqual(Object.keys(tablesDict.tr).sort(),Object.keys(tablesDict.en).sort());
 for(const key of Object.keys(tablesDict.en)){
  for(const lang of LANGS)assert.ok(tablesDict[lang][key].trim(),`${lang} ${key} empty`);
  assert.equal(placeholders(tablesDict.tr[key]),placeholders(tablesDict.en[key]),key);
  assert.doesNotMatch(tablesDict.en[key],TURKISH,key);assert.notEqual(tablesDict.en[key],key);assert.notEqual(tablesDict.tr[key],key);
 }
 const same=Object.keys(tablesDict.en).filter(k=>tablesDict.en[k]===tablesDict.tr[k]);
 assert.deepEqual(same,['col.forceFlag'],'only the "F" column header is identical in both languages');
 assert.equal(placeholders(tablesDict.en['msg.badValue']),'name,value');assert.equal(placeholders(tablesDict.en['msg.modified']),'n');assert.equal(placeholders(tablesDict.en['msg.forced']),'n');assert.equal(placeholders(tablesDict.en['msg.unknownTag']),'name');
});
test('tablesDict: TIA wording for tables',()=>{
 assert.equal(tablesDict.en['tab.tags'],'Tags');assert.equal(tablesDict.en['tab.userConstants'],'User constants');assert.equal(tablesDict.en['tab.systemConstants'],'System constants');
 assert.equal(tablesDict.en['col.monitor'],'Monitor value');assert.equal(tablesDict.en['col.format'],'Display format');assert.equal(tablesDict.en['col.modify'],'Modify value');assert.equal(tablesDict.en['col.force'],'Force value');
 assert.equal(tablesDict.en['addNew'],'<Add new>');assert.equal(tablesDict.tr['addNew'],'<Yeni ekle>');assert.equal(tablesDict.en['tool.modifyNow'],'Modify now');assert.equal(tablesDict.tr['tab.tags'],'Etiketler');
 assert.equal(shellDict.en['tree.forceTable'],'Force table');assert.equal(shellDict.tr['tree.forceTable'],'Zorlama tablosu');assert.equal(shellDict.en['view.force'],'Force table');assert.equal(shellDict.tr['view.force'],'Zorlama tablosu');
});

// ---- SSR ----
const noop=()=>{};
const render=(lang:Lang,node:ReactNode)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:node}));
const unescape=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
const visible=(html:string)=>{const attrs=[...html.matchAll(/ (?:title|aria-label|placeholder)="([^"]*)"/g)].map(m=>m[1]);return unescape([html.replace(/<[^>]*>/g,'\n'),...attrs].join('\n'));};
const clean=(lang:Lang,html:string,what:string)=>{const text=visible(html);for(const line of text.split('\n').map(x=>x.trim()))assert.ok(!/^(tab|col|tool|msg|empty|pick)\.[A-Za-z]+$/.test(line),`${what}/${lang}: raw key "${line}"`);assert.doesNotMatch(text,/undefined|\[object|NaN|\{\w+\}/,`${what}/${lang}`);if(lang==='en')assert.doesNotMatch(text,TURKISH,`${what}/en Turkish letters`);};
const has=(lang:Lang,html:string,...keys:(keyof typeof tablesDict.en)[])=>{const text=visible(html);for(const k of keys)assert.ok(text.includes(tablesDict[lang][k]),`${lang}: "${tablesDict[lang][k]}" (${k}) missing`);};
const tags:Tag[]=[tag('START','BOOL','%I0.0'),tag('MOTOR','BOOL','%Q0.0'),tag('Count','INT','%MW10',0),tag('Setpoint','REAL','%MD20',0),tag('Delay','TIME','%MD30',0),tag('Mask','WORD','%MW40',0)];
const values={START:true,MOTOR:false,Count:-5,Setpoint:2.5,Delay:1500,Mask:255};
const tagTable=(lang:Lang,over:Partial<Parameters<typeof TagTable>[0]>={})=>render(lang,createElement(TagTable,{tags,values,monitoring:false,locked:false,onChange:noop,onMonitor:noop,...over}));
const watchRows:WatchRow[]=[{name:'START',format:'Bool',modify:'TRUE',modifyOn:true},{name:'Count',format:'Hex',modify:'',modifyOn:false},{name:'Setpoint',format:'Floating-point number',modify:'',modifyOn:false},{name:'Delay',format:'Time',modify:'',modifyOn:false},{name:'Ghost',format:'DEC',modify:'',modifyOn:false}];
const watchTable=(lang:Lang,over:Partial<Parameters<typeof WatchTable>[0]>={})=>render(lang,createElement(WatchTable,{tags,rows:watchRows,setRows:noop,values,monitoring:false,onMonitor:noop,onModify:noop,message:noop,...over}));
const forceRows:ForceRow[]=[{name:'START',format:'Bool',force:'TRUE',forceOn:true},{name:'MOTOR',format:'Bool',force:'FALSE',forceOn:false}];
const forceTable=(lang:Lang,over:Partial<Parameters<typeof ForceTable>[0]>={})=>render(lang,createElement(ForceTable,{tags,rows:forceRows,setRows:noop,values,forces:{},monitoring:false,onMonitor:noop,onForce:noop,message:noop,...over}));
test('TagTable SSR: tabs, TIA columns, toolbar, <Add new>, rows; en and tr; no raw keys',()=>{
 for(const lang of LANGS){
  const html=tagTable(lang);
  has(lang,html,'tab.tags','tab.userConstants','tab.systemConstants','col.name','col.dataType','col.address','col.retain','col.hmiAccess','col.hmiWrite','col.hmiVisible','col.supervision','col.comment','tool.insertRow','tool.addRow','tool.delete','tool.monitorAll','addNew');
  for(const x of tags){assert.ok(html.includes(`value="${x.name}"`),x.name);assert.ok(html.includes(`value="${x.address}"`),x.address);}
  assert.doesNotMatch(html,/Monitor value|İzleme değeri/,'no monitor column while not monitoring');
  assert.match(html,/<option value="BOOL" selected="">Bool<\/option>/);assert.match(html,/<option value="TIME"[^>]*>Time<\/option>/);
  assert.equal([...html.matchAll(/aria-label="[^"]*"[^>]*disabled=""[^>]*type="checkbox"|type="checkbox"[^>]*disabled=""/g)].length>0,true,'Retain/HMI checkboxes are read-only');
  assert.match(html,/<button[^>]*aria-label="[^"]*"[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*<\/button>|aria-label="(Delete|Sil)"[^>]*disabled/,'Delete disabled without selection');
  clean(lang,html,'TagTable');
 }
});
test('TagTable SSR: monitor column and values while monitoring; locked while RUN',()=>{
 for(const lang of LANGS){
  const m=tagTable(lang,{monitoring:true});has(lang,m,'col.monitor');
  assert.match(m,/tia-monitor true"><i><\/i>TRUE/);assert.match(m,/tia-monitor false"><i><\/i>FALSE/);assert.ok(m.includes('-5')&&m.includes('2.5')&&m.includes('T#1500MS'),'values in default formats');assert.ok(m.includes('16#00FF'));
  const locked=tagTable(lang,{locked:true});
  const inputs=[...locked.matchAll(/<input[^>]*>/g)].map(x=>x[0]).filter(x=>!/type="checkbox"/.test(x)),selects=[...locked.matchAll(/<select[^>]*>/g)].map(x=>x[0]);
  assert.ok(inputs.length>=tags.length*3&&inputs.every(x=>x.includes('disabled=""')),'all text inputs disabled while locked');assert.ok(selects.every(x=>x.includes('disabled=""')));
  for(const label of [tablesDict[lang]['tool.insertRow'],tablesDict[lang]['tool.addRow']])assert.match(locked,new RegExp(`aria-label="${label}"[^>]*disabled=""|disabled=""[^>]*aria-label="${label}"`),label);
  clean(lang,m,'TagTable/monitor');clean(lang,locked,'TagTable/locked');
 }
 assert.doesNotMatch(tagTable('en'),/<input[^>]*value="START"[^>]*disabled/);
});
test('WatchTable SSR: columns, formats per type, unknown tag row, offline note; en and tr',()=>{
 for(const lang of LANGS){
  const html=watchTable(lang);
  has(lang,html,'col.name','col.address','col.format','col.monitor','col.modify','col.modifyFlag','col.tagComment','tool.monitorAll','tool.modifyNow','tool.delete','addNew','msg.monitorOffline');
  assert.ok(html.includes('⚡'));assert.ok(html.includes('&quot;START&quot;')&&html.includes('%I0.0'));
  assert.ok(html.includes('&quot;Ghost&quot;')&&html.includes('???'),'unknown tag keeps its name and shows ???');
  const selects=[...html.matchAll(/<select[^>]*>(.*?)<\/select>/g)].map(x=>[...x[1].matchAll(/<option[^>]*>([^<]*)</g)].map(o=>o[1]));
  assert.deepEqual(selects,[['Bool'],['DEC+/-','Hex','Bin'],['Floating-point number'],['Time','DEC+/-']],'formats offered per data type; no select for unknown tag');
  assert.match(html,/<option selected="">Hex<\/option>/);assert.match(html,/value="TRUE"/);assert.match(html,/type="checkbox"[^>]*checked=""|checked=""[^>]*type="checkbox"/);
  assert.doesNotMatch(html,/tia-monitor/);assert.match(html,/<datalist id="tia-tag-names">/);
  assert.ok(tags.every(x=>html.includes(`<option value="${x.name}">${x.address}</option>`)),'datalist lists every tag with its address');
  clean(lang,html,'WatchTable');
 }
});
test('WatchTable SSR: monitoring shows the value in the chosen display format and hides the offline note',()=>{
 for(const lang of LANGS){
  const html=watchTable(lang,{monitoring:true});
  assert.match(html,/tia-monitor true"><i><\/i>TRUE/);assert.ok(html.includes('16#FFFB'),'INT -5 as Hex');assert.ok(html.includes('2.5')&&html.includes('T#1500MS'));
  assert.ok(!visible(html).includes(tablesDict[lang]['msg.monitorOffline']));
  assert.match(html,/aria-pressed="true"/,'monitor button pressed');
  clean(lang,html,'WatchTable/monitor');
 }
});
test('ForceTable SSR: columns, :P addresses, F flag on forced rows, Stop forcing enabled only with forces; input-only datalist',()=>{
 for(const lang of LANGS){
  const html=forceTable(lang),active=forceTable(lang,{forces:{START:true},monitoring:true});
  has(lang,html,'col.name','col.address','col.format','col.monitor','col.force','tool.startForce','tool.stopForce','tool.monitorAll','tool.delete','addNew','msg.monitorOffline');
  assert.ok(html.includes('%I0.0:P')&&html.includes('%Q0.0:P'));
  assert.doesNotMatch(html,/tia-forced-flag/);assert.match(html,new RegExp(`aria-label="${tablesDict[lang]['tool.stopForce']}"[^>]*disabled=""|disabled=""[^>]*aria-label="${tablesDict[lang]['tool.stopForce']}"`),'Stop forcing disabled without forces');
  assert.match(active,/<tr class=" forced"[^>]*><td><b class="tia-forced-flag" title="F">F<\/b>/);assert.doesNotMatch(active,new RegExp(`disabled=""[^>]*aria-label="${tablesDict[lang]['tool.stopForce']}"|aria-label="${tablesDict[lang]['tool.stopForce']}"[^>]*disabled=""`));
  assert.equal([...active.matchAll(/tia-forced-flag/g)].length,1,'only the forced row is flagged');
  assert.match(active,/tia-monitor true"><i><\/i>TRUE/);
  assert.ok(html.includes('<option value="START">')&&html.includes('<option value="MOTOR">')&&!html.includes('<option value="Count">'),'only I/Q tags are offered');
  clean(lang,html,'ForceTable');clean(lang,active,'ForceTable/forcing');
 }
});
test('ProjectTree: Force table item next to Watch table_1 in en and tr; differs marker ◐ per block and on PLC/Program blocks',()=>{
 const blocks=[{id:'OB1',kind:'OB' as const,networks:[]},{id:'OB100',kind:'OB' as const,networks:[]}];
 const tree=(lang:Lang,online:boolean,differs?:Set<string>)=>render(lang,createElement(ProjectTree,{projectName:'P',cpuName:'CPU 1214C DC/DC/DC',blocks,tags,active:'ladder:OB1',online,differs,onOpen:noop,onCollapse:noop}));
 for(const lang of LANGS){
  const html=tree(lang,false);assert.ok(html.includes(`>${shellDict[lang]['tree.forceTable']}<`),`${lang} Force table item`);assert.ok(html.includes(`>${shellDict[lang]['tree.watchTable1']}<`));
  assert.ok(html.indexOf(shellDict[lang]['tree.forceTable'])<html.indexOf(shellDict[lang]['tree.watchTable1']+'<'),'order');
  assert.ok(!html.includes('tia-tree-status'));
  const ok=tree(lang,true,new Set());assert.ok(!ok.includes('◐')&&ok.includes('●'));assert.ok(ok.includes(shellDict[lang]['tree.consistent']));
  const bad=tree(lang,true,new Set(['OB1']));
  assert.equal([...bad.matchAll(/◐/g)].length,3,'OB1, Program blocks and PLC_1 show ◐');assert.ok(bad.includes(`title="${shellDict[lang]['tree.differs']}"`));assert.match(bad,/tia-tree-status differs/);
  assert.equal([...bad.matchAll(/●/g)].length,1,'OB100 stays consistent');
  clean(lang,bad,'ProjectTree/differs');
 }
});
