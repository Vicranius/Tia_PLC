import {test} from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
import {compile,parseProgram} from '../src/plc/compiler';
import {Runtime} from '../src/plc/runtime';
import {Memory,address} from '../src/plc/memory';
import {connectBranch,connectionError} from '../src/plc/connections';
import {IndustrialPlant} from '../src/simulation/industrial';
import {Plant} from '../src/simulation/conveyor';
import {plcDict} from '../src/i18n/dict/plc';
import type {Diagnostic,Expr,Network,Program,Tag} from '../src/plc/model';
import {startWorker} from './worker-harness';

const turkishLetters=/[çğıöşüÇĞİÖŞÜ]/;
const tag=(name:string,type:Tag['type'],address:string,initial:Tag['initial']=false):Tag=>({name,type,address,initial,comment:''});
const no=(id:string,name:string):Expr=>({id,type:'NO',tag:name});
const net=(id:string,logic:Expr,output:Network['output'],connections?:Network['connections']):Network=>({id,title:id,logic,output,...(connections?{connections}:{})});
const and=(id:string,...children:Expr[]):Expr=>({id,type:'AND',children});
const pinAnd=(id:string):Expr=>({id,type:'AND',pin:true,children:[]});

// One program that triggers every diagnostic code the compiler can produce.
const faulty=():Program=>({version:1,cpu:'CPU 1214C',tags:[
 tag('bad name','BOOL','%M0.0'),tag('BADADDR','BOOL','%X9'),tag('WRONGINIT','INT','%MW10',true as never),
 tag('DUP','BOOL','%M1.0'),tag('DUP','BOOL','%M1.1'),
 tag('IN1','BOOL','%I0.0'),tag('Q1','BOOL','%Q0.0'),tag('NUM','INT','%MW20',0),tag('T','TIME','%MD30',0),tag('INCV','INT','%IW4',0)
],blocks:[
 {id:'OB1',kind:'OB',networks:[
  net('n-undefined',and('a1',no('c1','MISSING')),{type:'COIL',tag:'Q1'}),
  net('n-input-unassigned',and('a2',no('c2','IN1')),{type:'COIL',tag:'IN1',unassigned:true}),
  net('n-bool',and('a3',no('c3','NUM')),{type:'MOVE',tag:'Q1'}),
  net('n-calc',and('a4',no('c4','IN1')),{type:'MOVE',tag:'NUM',value:{kind:'calc',op:'ADD',a:{kind:'calc',op:'DIV',a:{kind:'literal',value:1},b:{kind:'literal',value:0}},b:{kind:'calc',op:'ADD',a:{kind:'tag',tag:'IN1'},b:{kind:'calc',op:'NORM_X',a:{kind:'literal',value:0},b:{kind:'literal',value:1}}}}}),
  net('n-empty',{id:'a5',type:'AND',children:[]},{type:'COIL',tag:'Q1'}),
  net('n-unreachable',and('a6',no('c6','IN1'),{id:'c7',type:'NC',tag:'IN1'}),{type:'COIL',tag:'Q1'}),
  net('n-timer',{id:'t1',type:'TON',instance:'bad name',pt:-1,etTag:'Q1',input:no('c8','IN1')},{type:'COIL',tag:'Q1'}),
  net('n-timer-tags',and('a7',{id:'t2',type:'TON',instance:'T1',pt:{kind:'tag',tag:'NUM'},input:no('c9','IN1')},{id:'t3',type:'TOF',instance:'T1',pt:1000,input:no('c10','IN1')}),{type:'COIL',tag:'Q1'}),
  net('n-counter',and('a8',{id:'ct1',type:'CTU',instance:'bad name',pv:1.5,cvTag:'INCV',input:no('c11','IN1'),reset:no('c12','IN1')},{id:'ct2',type:'CTU',instance:'C1',pv:1,input:no('c13','IN1'),reset:no('c14','IN1')},{id:'ct3',type:'CTD',instance:'C1',pv:1,input:no('c15','IN1'),load:no('c1','IN1')}),{type:'COIL',tag:'Q1'},
   [{block:'ct2',pin:'reset',source:'missing',side:'after'},{block:'ct2',pin:'reset',source:'missing',side:'after'}])
 ]},
 {id:'FC1',kind:'FC',networks:[net('fc',and('fa'),{type:'COIL',tag:'Q1'})]}
]});
const noOb1=():Program=>({version:1,cpu:'CPU 1214C',tags:[],blocks:[]});
const EXPECTED_CODES=['E001','E002','E003','E004','E005','E006','E009','E010','E011','E012','E013','E014','E015','E030','E031','E034','E035','E036','E037','E038','E041','W021','W040','W061'];

test('compile(): messages follow the language, codes and order stay identical',()=>{
 const seen=new Set<string>();
 for(const program of [faulty(),noOb1()]){
  const en=compile(program),tr=compile(program,'tr'),explicit=compile(program,'en');
  assert.ok(en.length>0);
  assert.deepEqual(explicit,en,'English is the default');
  assert.deepEqual(tr.map(d=>[d.code,d.severity,d.network]),en.map(d=>[d.code,d.severity,d.network]),'codes/severity/network are language independent');
  en.forEach((d,i)=>{seen.add(d.code);assert.notEqual(tr[i].message,d.message,`${d.code} differs between languages`);assert.doesNotMatch(d.message,turkishLetters,`${d.code}: ${d.message}`);});
 }
 for(const code of EXPECTED_CODES)assert.ok(seen.has(code),`diagnostic ${code} is exercised`);
});
test('compile(): known messages in both languages',()=>{
 const find=(ds:Diagnostic[],code:string)=>ds.filter(d=>d.code===code).map(d=>d.message);
 assert.deepEqual(find(compile(noOb1()),'E010'),['Main [OB1] not found']);
 assert.deepEqual(find(compile(noOb1(),'tr'),'E010'),['Main [OB1] bulunamadı']);
 const p=faulty();
 assert.ok(find(compile(p),'W040').includes('The same tag is in series as NO and NC: this path is unreachable'));
 assert.ok(find(compile(p,'tr'),'W040').includes('Aynı tag NO ve NC seri: bu yol erişilemez'));
 assert.ok(find(compile(p),'E001').includes('Undefined tag MISSING'));
 assert.ok(find(compile(p,'tr'),'E001').includes('Tanımsız tag MISSING'));
 assert.ok(find(compile(p),'E004').includes('WRONGINIT: initial value is incompatible with INT'));
 assert.ok(find(compile(p,'tr'),'E004').includes('WRONGINIT: başlangıç değeri INT ile uyumsuz'));
 assert.ok(find(compile(p),'E003').includes('Invalid address: %X9'));
 assert.ok(find(compile(p,'tr'),'E003').includes('Geçersiz adres: %X9'));
 assert.ok(find(compile(p),'E041').includes('The source branch of the connection has been deleted.'));
 assert.ok(find(compile(p,'tr'),'E041').includes('Bağlantının kaynak branch’i silinmiş.'));
 assert.ok(find(compile(p),'E038').includes('Q1: a TIME tag is required for ET'));
 assert.ok(find(compile(p,'tr'),'E038').includes('Q1: ET için TIME tag gerekli'));
 assert.ok(find(compile(p),'W061').includes('FC1 [FC1] is not called from any OB'));
 assert.ok(find(compile(p,'tr'),'W061').includes('FC1 [FC1] hiçbir OB’den çağrılmıyor'));
});
test('compile(): an unknown language falls back to English',()=>{
 const p=noOb1();
 assert.deepEqual(compile(p,'de' as never),compile(p));
});
test('dictionary: every English message has a Turkish one and the same placeholders',()=>{
 const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
 for(const key of Object.keys(plcDict.en) as (keyof typeof plcDict.en)[]){
  assert.ok(plcDict.tr[key],key);assert.equal(placeholders(plcDict.tr[key]),placeholders(plcDict.en[key]),key);
  assert.doesNotMatch(plcDict.en[key],turkishLetters,`${key}: ${plcDict.en[key]}`);
 }
 assert.deepEqual(Object.keys(plcDict.tr).sort(),Object.keys(plcDict.en).sort());
});

test('parseProgram(): validation errors are localized',()=>{
 const good=material(3).reference;
 const clone=():Record<string,any>=>JSON.parse(JSON.stringify(good));/* eslint-disable-line @typescript-eslint/no-explicit-any */
 const bad:[string,unknown,string,string][]=[
  ['not an object',null,'Object expected','Nesne bekleniyor'],
  ['wrong version',{...clone(),version:2},'Invalid program format','Program formatı geçersiz'],
  ['text too long',{...clone(),cpu:'x'.repeat(301)},'Invalid text','Geçersiz metin'],
  ['bad input mode',(()=>{const p=clone();p.tags[0].inputMode='bogus';return p;})(),'Invalid input behavior','Geçersiz giriş davranışı'],
  ['bad tag value',(()=>{const p=clone();p.tags[0].initial='nope';return p;})(),'Invalid tag type or value','Tag türü/değeri geçersiz'],
  ['duplicate block',(()=>{const p=clone();p.blocks[1].id=p.blocks[0].id;return p;})(),'Duplicate block ID','Blok kimliği yinelenmiş'],
  ['bad block kind',(()=>{const p=clone();p.blocks[0].kind='XX';return p;})(),'Invalid block format','Blok formatı geçersiz'],
  ['unsupported instruction',(()=>{const p=clone();p.blocks[0].networks[0].logic={id:'z',type:'MAGIC'};return p;})(),'Unsupported instruction','Desteklenmeyen instruction'],
  ['bad output type',(()=>{const p=clone();p.blocks[0].networks[0].output.type='X';return p;})(),'Invalid output type','Çıkış tipi geçersiz'],
  ['missing children',(()=>{const p=clone();p.blocks[0].networks[0].logic={id:'z',type:'AND'};return p;})(),'children is missing','children eksik'],
  ['bad compare',(()=>{const p=clone();p.blocks[0].networks[0].logic={id:'z',type:'COMPARE',op:'~',a:{kind:'literal',value:1},b:{kind:'literal',value:1}};return p;})(),'Invalid comparison','Geçersiz karşılaştırma'],
  ['bad operand',(()=>{const p=clone();p.blocks[0].networks[0].logic={id:'z',type:'COMPARE',op:'==',a:{kind:'nope'},b:{kind:'literal',value:1}};return p;})(),'Invalid operand','Geçersiz operand'],
  ['bad number',(()=>{const p=clone();p.blocks[0].networks[0].logic={id:'z',type:'COMPARE',op:'==',a:{kind:'literal',value:'x'},b:{kind:'literal',value:1}};return p;})(),'Invalid number','Geçersiz sayı'],
  ['bad pin',(()=>{const p=clone();p.blocks[0].networks[0].connections=[{block:'a',source:'b',pin:'pv',side:'after'}];return p;})(),'Invalid branch pin','Geçersiz branch pini'],
  ['bad connections',(()=>{const p=clone();p.blocks[0].networks[0].connections='x';return p;})(),'Invalid branch connections','Geçersiz branch bağlantıları'],
  ['bad scaffold',(()=>{const p=clone();p.blocks[0].networks[0].output.unassigned='yes';return p;})(),'Invalid output scaffold value','Çıkış scaffold değeri geçersiz'],
  ['duplicate network',(()=>{const p=clone();const n=p.blocks[0].networks[0];p.blocks[0].networks.push(JSON.parse(JSON.stringify(n)));return p;})(),'Duplicate network ID','Network kimliği yinelenmiş'],
  ['too complex',(()=>{const p=clone();let e:Record<string,unknown>={id:'leaf',type:'NO',tag:'START'};for(let i=0;i<16;i++)e={id:'w'+i,type:'AND',children:[e]};p.blocks[0].networks[0].logic=e;return p;})(),'Program exceeds the complexity limit','Program karmaşıklık sınırını aşıyor']
 ];
 assert.doesNotThrow(()=>parseProgram(JSON.parse(JSON.stringify(good))));
 for(const [name,input,en,tr] of bad){
  assert.throws(()=>parseProgram(input),{message:en},name+' (default)');
  assert.throws(()=>parseProgram(input,'en'),{message:en},name+' (en)');
  assert.throws(()=>parseProgram(input,'tr'),{message:tr},name+' (tr)');
 }
});

// A program with the instructions whose trace text is language dependent: R_TRIG, a counter input pin and a connected reset pin.
const traced=():Program=>({version:1,cpu:'CPU 1214C',tags:[
 tag('START','BOOL','%I0.0'),tag('UP','BOOL','%I0.1'),tag('VALVE','BOOL','%Q0.0'),tag('PUMP','BOOL','%Q0.1'),tag('DONE','BOOL','%Q0.2'),tag('ZERO','INT','%MW10',0),tag('RESULT','INT','%MW12',0)
],blocks:[{id:'OB1',kind:'OB',networks:[
 net('n1',and('a1',no('c1','START')),{type:'COIL',tag:'VALVE'}),
 net('n2',and('a2',no('c2','START')),{type:'COIL',tag:'PUMP'}),
 net('n3',and('a3',{id:'edge',type:'R_TRIG',input:no('up','UP')},{id:'ct',type:'CTU',instance:'C1',pv:3,input:pinAnd('cin'),reset:pinAnd('crs')}),{type:'COIL',tag:'DONE'},[{block:'ct',pin:'reset',source:'$rail',side:'before'}])
]}]});
const withoutDetail=(snapshot:ReturnType<Runtime['snapshot']>)=>({...snapshot,trace:Object.fromEntries(Object.entries(snapshot.trace).map(([id,t])=>[id,{value:t.value,incoming:t.incoming,signal:t.signal}]))});
const drive=(rt:Runtime,i:number)=>{rt.inputs.START=i%7<4;rt.inputs.UP=i%3===0;return rt.scan(10);};

test('Runtime: trace details are localized (English default, Turkish on request)',()=>{
 const en=new Runtime(traced()),tr=new Runtime(traced(),{lang:'tr'});
 assert.equal(en.lang,'en');assert.equal(tr.lang,'tr');
 for(const rt of [en,tr]){rt.inputs.UP=false;rt.scan(10);rt.inputs.UP=true;rt.scan(10);}
 assert.equal(en.trace.edge.detail,'before=false, now=true, Q=true');
 assert.equal(tr.trace.edge.detail,'önce=false, şimdi=true, Q=true');
 assert.equal(en.trace.cin.detail,'Network connection = true');
 assert.equal(tr.trace.cin.detail,'Network bağlantısı = true');
 assert.equal(en.trace.crs.detail,'Branch connection = true');
 assert.equal(tr.trace.crs.detail,'Branch bağlantısı = true');
 // Language-neutral trace text is shared.
 assert.equal(en.trace.c1.detail,tr.trace.c1.detail);
 assert.equal(en.trace.n1.detail,tr.trace.n1.detail);
});
test('Runtime: scan results are identical in both languages',()=>{
 for(const make of [traced,()=>material(3).reference,()=>material(7).reference,()=>material(10).reference]){
  const en=new Runtime(make()),tr=new Runtime(make(),{lang:'tr'});
  for(let i=0;i<120;i++){
   for(const rt of [en,tr]){for(const name of Object.keys(rt.inputs))rt.inputs[name]=typeof rt.inputs[name]==='boolean'?((i+name.length)%5<2):rt.inputs[name];}
   assert.deepEqual(withoutDetail(en.scan(10)),withoutDetail(tr.scan(10)),`scan ${i}`);
  }
 }
});
test('Runtime: switching language mid-run re-renders the trace and does not change behavior',()=>{
 const a=new Runtime(traced()),b=new Runtime(traced()),control=new Runtime(traced(),{lang:'tr'});
 for(let i=0;i<30;i++){drive(a,i);drive(b,i);drive(control,i);}
 const before=JSON.stringify(withoutDetail(a.snapshot()));
 a.lang='tr';
 assert.equal(a.trace.edge.detail,control.trace.edge.detail);
 assert.equal(a.trace.cin.detail,control.trace.cin.detail);
 assert.equal(a.trace.crs.detail,control.trace.crs.detail);
 assert.equal(JSON.stringify(withoutDetail(a.snapshot())),before,'switching language does not touch the simulation state');
 assert.equal(a.memory.lang,'tr');
 for(let i=30;i<90;i++)assert.deepEqual(withoutDetail(drive(a,i)),withoutDetail(drive(b,i)),`scan ${i}`);
 assert.equal(a.trace.edge.detail.startsWith('önce='),true);assert.equal(b.trace.edge.detail.startsWith('before='),true);
 a.lang='xx' as never;assert.equal(a.lang,'en');
});
test('Runtime: thrown errors are localized',()=>{
 assert.throws(()=>new Runtime(noOb1()),/Main \[OB1\] not found/);
 assert.throws(()=>new Runtime(noOb1(),{lang:'tr'}),/Main \[OB1\] bulunamadı/);
 const divide=():Program=>({version:1,cpu:'CPU 1214C',tags:[tag('GO','BOOL','%I0.0'),tag('ZERO','INT','%MW10',0),tag('OUT','INT','%MW12',0)],blocks:[{id:'OB1',kind:'OB',networks:[net('n',and('a',no('c','GO')),{type:'MOVE',tag:'OUT',value:{kind:'calc',op:'DIV',a:{kind:'literal',value:10},b:{kind:'tag',tag:'ZERO'}}})]}]});
 const run=(lang?:'en'|'tr')=>{const rt=new Runtime(divide(),lang?{lang}:{});rt.inputs.GO=true;return rt;};
 assert.throws(()=>run().scan(10),{message:'DIV: division by zero'});
 assert.throws(()=>run('tr').scan(10),{message:'DIV: sıfıra bölme'});
 assert.throws(()=>run().scan(0),{message:'Scan delta must be between 0 and 1000 ms'});
 assert.throws(()=>run('tr').scan(2000),{message:'Scan delta 0–1000 ms olmalı'});
});

test('Memory and address(): errors are localized',()=>{
 const tags=[tag('N','INT','%MW10',0)];
 assert.throws(()=>new Memory(tags).read('X'),{message:'Undefined tag X'});
 assert.throws(()=>new Memory(tags,'tr').read('X'),{message:'Tanımsız tag X'});
 assert.throws(()=>new Memory(tags).set('N',70000),{message:'N: value (70000) is outside the INT range'});
 assert.throws(()=>new Memory(tags,'tr').set('N',70000),{message:'N: INT değer aralığı dışında (70000)'});
 assert.throws(()=>address('%X1','BOOL'),{message:'Invalid address: %X1'});
 assert.throws(()=>address('%X1','BOOL','tr'),{message:'Geçersiz adres: %X1'});
 assert.throws(()=>address('%MW1','BOOL'),{message:'BOOL does not match the width of address %MW1'});
 assert.throws(()=>address('%MW1','BOOL','tr'),{message:'BOOL ile %MW1 adres genişliği uyuşmuyor'});
 assert.throws(()=>address('%MW70000','INT'),{message:'Address exceeds the memory limit'});
 assert.throws(()=>address('%MW70000','INT','tr'),{message:'Adres bellek sınırını aşıyor'});
 assert.deepEqual(address('%M1.2','BOOL','tr'),address('%M1.2','BOOL'));
});

test('Branch connection errors are localized',()=>{
 const p=traced(),n=p.blocks[0].networks[2];
 const missing={block:'ct',pin:'reset' as const,source:'ghost',side:'after' as const};
 assert.equal(connectionError(n,missing),'The source branch of the connection has been deleted.');
 assert.equal(connectionError(n,missing,'tr'),'Bağlantının kaynak branch’i silinmiş.');
 const noPin={block:'ct',pin:'down' as const,source:'edge',side:'after' as const};
 assert.equal(connectionError(n,noPin),'Control pin not found.');
 assert.equal(connectionError(n,noPin,'tr'),'Kontrol pini bulunamadı.');
 const self={block:'ct',pin:'reset' as const,source:'crs',side:'after' as const};
 assert.equal(connectionError(n,self),'A branch cannot be connected into itself.');
 assert.equal(connectionError(n,self,'tr'),'Bir kol kendi içine bağlanamaz.');
 const order={block:'ct',pin:'reset' as const,source:'ct',side:'after' as const};
 assert.equal(connectionError(n,order),'The source must be a branch that is evaluated before the pin.');
 assert.equal(connectionError(n,order,'tr'),'Kaynak, pinin öncesinde hesaplanan bir branch olmalı.');
 assert.throws(()=>connectBranch(n,missing),{message:'The source branch of the connection has been deleted.'});
 assert.throws(()=>connectBranch(n,missing,'tr'),{message:'Bağlantının kaynak branch’i silinmiş.'});
 assert.deepEqual(connectBranch(n,{block:'ct',pin:'reset',source:'$rail',side:'before'},'tr').connections,[{block:'ct',pin:'reset',source:'$rail',side:'before'}]);
});

// [kind, steps, expected alarm in English, in Turkish]
const alarmCases:[string,'water'|'mixer'|'roaster',[number,Record<string,boolean>][],string,string][]=[
 ['overflow','water',[[20000,{VALVE:true}]],'Overflow: close the fill valve.','Taşma: dolum valfini kapatın.'],
 ['dry run','water',[[2000,{PUMP:true}],[100,{PUMP:true}]],'Dry running: stop the pump.','Kuru çalışma: pompayı durdurun.'],
 ['fill and drain','water',[[1000,{VALVE:true,PUMP:true}]],'Fill and drain are open at the same time.','Dolum ve boşaltma aynı anda açık.'],
 ['mixer overflow','mixer',[[10000,{DOSE_A:true}]],'The mixing tank is overflowing.','Karışım tankı taşıyor.'],
 ['mixer low level','mixer',[[100,{MIXER:true}]],'Product level is too low for the mixer.','Karıştırıcı için ürün seviyesi düşük.'],
 ['drain early','mixer',[[1000,{DOSE_A:true}],[100,{DRAIN:true}]],'Draining before mixing is complete.','Karışım tamamlanmadan boşaltılıyor.'],
 ['heater without drum','roaster',[[1000,{HEATER:true}]],'The heater is on while the drum is not turning.','Isıtıcı açıkken tambur dönmüyor.'],
 ['high temperature','roaster',[[60000,{HEATER:true,DRUM:true}]],'High temperature: 140 °C exceeded.','Yüksek sıcaklık: 140 °C aşıldı.'],
 ['discharge hot','roaster',[[60000,{HEATER:true,DRUM:true}],[10,{DISCHARGE:true}]],'Discharging before the product has cooled.','Ürün soğumadan boşaltılıyor.']
];
test('Plant alarms are localized and the physics are identical in both languages',()=>{
 for(const [name,kind,steps,en,tr] of alarmCases){
  const a=new IndustrialPlant(kind),b=new IndustrialPlant(kind,'tr'),c=new IndustrialPlant(kind,'en');
  for(const [ms,outputs] of steps){a.step(ms,outputs);b.step(ms,outputs);c.step(ms,outputs);}
  assert.ok(a.alarms.includes(en),`${name}: ${JSON.stringify(a.alarms)}`);
  assert.ok(b.alarms.includes(tr),`${name}: ${JSON.stringify(b.alarms)}`);
  assert.deepEqual(c.alarms,a.alarms);
  assert.deepEqual({...a.snapshot(),alarms:[]},{...b.snapshot(),alarms:[]},`${name}: same physics`);
  assert.equal(a.alarms.length,b.alarms.length);
  // Switching language re-renders the active alarms without stepping the plant.
  const frozen=JSON.stringify({...a.snapshot(),alarms:[]});
  a.lang='tr';assert.deepEqual(a.alarms,b.alarms);assert.equal(JSON.stringify({...a.snapshot(),alarms:[]}),frozen);
  a.lang='en';assert.deepEqual(a.alarms,c.alarms);
 }
});
test('Plant (conveyor wrapper) forwards the language',()=>{
 const plant=new Plant('water','tr');assert.equal(plant.lang,'tr');assert.equal(plant.industrial.lang,'tr');
 plant.step(1000,{VALVE:true,PUMP:true});assert.deepEqual(plant.industrial.alarms,['Dolum ve boşaltma aynı anda açık.']);
 plant.lang='en';assert.deepEqual(plant.snapshot().industrial.alarms,['Fill and drain are open at the same time.']);
 assert.equal(new Plant().lang,'en');
});

// The Web Worker owns the Runtime and the plant; drive it with its real message protocol (shared harness: the worker is a singleton).
test('Worker: lang in load, {action:"lang"} switches subsequent snapshots without resetting',async()=>{
 const w=await startWorker();
 w.send({action:'load',program:traced(),plant:'water',lang:'tr'});
 w.send({action:'input',tag:'START',value:true});w.send({action:'run'});
 for(let i=0;i<4;i++)w.tick();
 const before=w.last();
 assert.equal(before.mode,'RUN');assert.equal(before.error,undefined);
 assert.deepEqual(before.plant.industrial.alarms,['Dolum ve boşaltma aynı anda açık.']);
 assert.match(before.snapshot?.trace.cin.detail??'',/^Network bağlantısı = (true|false)$/);
 const scans=before.snapshot!.scans,time=before.snapshot!.time,level=before.plant.level;
 assert.ok(scans>0);

 w.send({action:'lang',lang:'en'});
 const after=w.last();
 assert.equal(after.mode,'RUN','language switch does not stop or reset the CPU');
 assert.equal(after.snapshot?.scans,scans);assert.equal(after.snapshot?.time,time);assert.equal(after.plant.level,level);
 assert.deepEqual(after.plant.industrial.alarms,['Fill and drain are open at the same time.']);
 assert.match(after.snapshot?.trace.cin.detail??'',/^Network connection = (true|false)$/);
 assert.match(after.snapshot?.trace.crs.detail??'',/^Branch connection = (true|false)$/);
 assert.equal(after.snapshot?.outputs.VALVE,true,'outputs survive the switch');

 w.tick();
 assert.ok(w.last().snapshot!.scans>scans,'simulation keeps running');
 assert.match(w.last().snapshot?.trace.cin.detail??'',/^Network connection = /);
 assert.deepEqual(w.last().plant.industrial.alarms,['Fill and drain are open at the same time.']);

 // Errors raised inside the worker use the active language too.
 w.send({action:'input',tag:'VALVE',value:true});
 assert.equal(w.last().mode,'RUN','a rejected input is reported but does not stop the CPU');assert.ok((w.last().error??'').includes('Only inputs can be changed'),w.last().error);
 w.send({action:'lang',lang:'tr'});w.send({action:'load',program:traced(),plant:'water'});
 assert.equal(w.last().mode,'STOP');assert.equal(w.last().error,undefined);
 w.send({action:'input',tag:'VALVE',value:true});
 assert.ok((w.last().error??'').includes('Yalnızca girişler değiştirilebilir'),w.last().error);
 w.send({action:'load',program:{version:2},plant:'water',lang:'en'});
 assert.ok((w.last().error??'').includes('Invalid program format'),w.last().error);
 w.send({action:'load',program:{version:2},plant:'water',lang:'tr'});
 assert.ok((w.last().error??'').includes('Program formatı geçersiz'),w.last().error);
});
