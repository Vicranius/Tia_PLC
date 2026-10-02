import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/i18n/react';
import type {Lang} from '../src/i18n/core';
import {blocksDict} from '../src/i18n/dict/blocks';
import {Runtime} from '../src/plc/runtime';
import {compile,parseProgram} from '../src/plc/compiler';
import {callInfo,dbOperands,nextNumber} from '../src/plc/blocks';
import {material} from '../src/challenges/private';
import {evaluate} from '../src/challenges/evaluator';
import type {Block,Expr,Network,Output,Program,Tag,Value,Variable,DataType} from '../src/plc/model';
import {AddBlockDialog,CallOptionsDialog} from '../src/ui/shell/BlockDialogs';
import {InterfaceEditor,DbEditor} from '../src/ui/shell/BlockEditors';
import Rung from '../src/ladder/Rung';

// ---- fixtures ----
const TURKISH=/[çğıöşüÇĞİÖŞÜ]/;
const noop=()=>{};
const lit=(value:number):Value=>({kind:'literal',value}),tg=(tag:string):Value=>({kind:'tag',tag});
const calc=(op:'ADD'|'SUB'|'MUL',a:Value,b:Value):Value=>({kind:'calc',op,a,b});
const tag=(name:string,type:DataType,address:string,initial:boolean|number=type==='BOOL'?false:0):Tag=>({name,type,address,initial,comment:''});
const v=(name:string,type:DataType='BOOL',initial:boolean|number=type==='BOOL'?false:0):Variable=>({name,type,initial,comment:''});
const no=(id:string,t:string):Expr=>({id,type:'NO',tag:t});
const and=(id:string,...children:Expr[]):Expr=>({id,type:'AND',children});
const net=(id:string,logic:Expr,output:Output):Network=>({id,title:id,logic,output});
const empty=(id:string)=>and(`root-${id}`);
const move=(id:string,target:string,value:Value):Network=>net(id,empty(id),{type:'MOVE',tag:target,value});
const callNet=(id:string,callee:string,extra:Partial<Output>={}):Network=>net(id,empty(id),{type:'CALL',tag:callee,...extra});
const tags=():Tag[]=>[tag('START','BOOL','%I0.0'),tag('IN2','BOOL','%I0.1'),tag('MOTOR','BOOL','%Q0.0'),tag('LAMP','BOOL','%Q0.1'),tag('RES','INT','%MW10'),tag('IN','INT','%MW12',1),tag('LOG','INT','%MW14'),tag('RES2','INT','%MW16'),tag('FLAG','BOOL','%M0.0')];
const prog=(blocks:Block[],extra:Tag[]=[]):Program=>({version:1,cpu:'CPU 1214C',tags:[...tags(),...extra],blocks});
const ob1=(...networks:Network[]):Block=>({id:'OB1',kind:'OB',networks});
const fc=(id:string,name:string,iface:Block['iface'],...networks:Network[]):Block=>({id,kind:'FC',name,iface,networks});
const fb=(id:string,name:string,iface:Block['iface'],...networks:Network[]):Block=>({id,kind:'FB',name,iface,networks});
const inst=(id:string,name:string,of:string):Block=>({id,kind:'DB',name,instanceOf:of,networks:[]});
const gdb=(id:string,name:string,...data:Variable[]):Block=>({id,kind:'DB',name,data,networks:[]});
const codes=(p:Program)=>compile(p).map(d=>d.code);
const errors=(p:Program)=>compile(p).filter(d=>d.severity==='error').map(d=>d.code);
const scans=(rt:Runtime,n:number)=>{for(let i=0;i<n;i++)rt.scan(10);};

// ---- runtime ----
test('FC: inputs, outputs and temp are per call; temp values are not kept between scans',()=>{
 const p=prog([ob1(callNet('c',"FC1",{params:{A:tg('IN')},outs:{R:'RES'}})),
  fc('FC1','Calc',{input:[v('A','INT')],output:[v('R','INT')],temp:[v('T','INT',5)]},move('m1','#T',calc('ADD',tg('#T'),tg('#A'))),move('m2','#R',tg('#T')))]);
 assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);for(let i=0;i<3;i++){rt.scan(10);assert.equal(rt.snapshot().values.RES,6,`scan ${i}`);}
 rt.memory.set('IN',4);rt.scan(10);assert.equal(rt.snapshot().values.RES,9);
});
test('FC: output without a destination is dropped, unset output starts at its default',()=>{
 const p=prog([ob1(callNet('c','FC1',{params:{A:lit(3)}})),fc('FC1','F',{input:[v('A','INT')],output:[v('R','INT',7)]},move('m','#R',calc('ADD',tg('#R'),tg('#A'))))]);
 assert.deepEqual(errors(p),[]);const rt=new Runtime(p);scans(rt,2);assert.equal(rt.snapshot().values.RES,0);
});
test('FB: static members are kept in the instance DB across scans',()=>{
 const p=prog([ob1(callNet('c','FB1',{instance:'DB1',params:{Inc:tg('START')},outs:{Out:'RES'}})),
  fb('FB1','Counter',{input:[v('Inc')],output:[v('Out','INT')],static:[v('Count','INT')]},net('n1',{id:'p1',type:'P',tag:'#Inc'},{type:'MOVE',tag:'#Count',value:calc('ADD',tg('#Count'),lit(1))}),move('n2','#Out',tg('#Count'))),
  inst('DB1','Counter_DB','FB1')]);
 assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);assert.equal(rt.snapshot().values['Counter_DB.Count'],0);
 for(const s of [false,true,true,false,true,true]){rt.inputs.START=s;rt.scan(10);}
 const values=rt.snapshot().values;assert.equal(values['Counter_DB.Count'],2);assert.equal(values.RES,2);assert.equal(values['Counter_DB.Inc'],true);
});
const motorFb=()=>fb('FB1','Timer_Pulse',{input:[v('Inp')],output:[v('Done')],static:[v('Pulses','INT')]},
 net('n1',{id:'ton1',type:'TON',pt:100,input:no('c1','#Inp')},{type:'COIL',tag:'#Done'}),
 net('n2',{id:'p1',type:'P',tag:'#Inp'},{type:'MOVE',tag:'#Pulses',value:calc('ADD',tg('#Pulses'),lit(1))}));
test('FB: two instances of one FB keep independent data, TON and P edge',()=>{
 const p=prog([ob1(callNet('a','FB1',{instance:'DB1',params:{Inp:tg('START')},outs:{Done:'MOTOR'}}),callNet('b','FB1',{instance:'DB2',params:{Inp:tg('IN2')},outs:{Done:'LAMP'}})),motorFb(),inst('DB1','A_DB','FB1'),inst('DB2','B_DB','FB1')]);
 assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);rt.inputs.START=true;scans(rt,5);
 let s=rt.snapshot();assert.equal(s.values.MOTOR,false,'50 ms < PT');assert.equal(s.values['A_DB.Pulses'],1);assert.equal(s.values['B_DB.Pulses'],0);
 scans(rt,8);s=rt.snapshot();assert.equal(s.values.MOTOR,true);assert.equal(s.values.LAMP,false);assert.equal(s.values['A_DB.Done'],true);assert.equal(s.values['B_DB.Done'],false);
 rt.inputs.IN2=true;scans(rt,1);s=rt.snapshot();assert.equal(s.values['B_DB.Pulses'],1,'B edge fires on its own');assert.equal(s.values['A_DB.Pulses'],1,'A did not see another edge');assert.equal(s.values.LAMP,false,'B timer starts only now');
 scans(rt,12);assert.equal(rt.snapshot().values.LAMP,true);
 const keys=Object.keys(rt.timers);assert.equal(keys.length,2);assert.notEqual(keys[0],keys[1]);
 rt.inputs.START=false;scans(rt,1);assert.equal(rt.snapshot().values.MOTOR,false);assert.equal(rt.snapshot().values.LAMP,true,'B untouched');
});
test('InOut parameters are written back to the actual operand',()=>{
 const p=prog([ob1(callNet('c','FC1',{params:{X:tg('LOG')}})),fc('FC1','Inc',{inout:[v('X','INT')]},move('m','#X',calc('ADD',tg('#X'),lit(1))))]);
 assert.deepEqual(errors(p),[]);const rt=new Runtime(p);scans(rt,4);assert.equal(rt.snapshot().values.LOG,4);
 const q=prog([ob1(callNet('c','FB1',{instance:'DB1',params:{X:tg('LOG')}})),fb('FB1','IncB',{inout:[v('X','INT')]},move('m','#X',calc('ADD',tg('#X'),lit(2)))),inst('DB1','IncB_DB','FB1')]);
 const r=new Runtime(q);scans(r,3);assert.equal(r.snapshot().values.LOG,6);assert.equal(r.snapshot().values['IncB_DB.X'],6);
});
test('global DB members are read and written as "Db.member"',()=>{
 const p=prog([ob1(net('n1',and('a',no('c','START')),{type:'MOVE',tag:'Data.Speed',value:lit(42)}),net('n2',and('b',no('c2','START')),{type:'COIL',tag:'Data.Flag'}),net('n3',and('d',no('c3','Data.Flag')),{type:'COIL',tag:'MOTOR'})),gdb('DB1','Data',v('Speed','INT',7),v('Flag'))]);
 assert.deepEqual(errors(p),[]);const rt=new Runtime(p);assert.equal(rt.snapshot().values['Data.Speed'],7);scans(rt,1);let s=rt.snapshot();assert.equal(s.values['Data.Speed'],7);assert.equal(s.values.MOTOR,false);
 rt.inputs.START=true;scans(rt,1);s=rt.snapshot();assert.equal(s.values['Data.Speed'],42);assert.equal(s.values['Data.Flag'],true);assert.equal(s.values.MOTOR,true,'DB bool read in the same scan');
 assert.ok('Data.Speed' in s.values&&'Data.Flag' in s.values&&'MOTOR' in s.values);
 assert.deepEqual([...dbOperands(p)],[['Data.Speed','INT'],['Data.Flag','BOOL']]);
});
test('BOOL parameters from tags, literal parameters and missing parameters (defaults)',()=>{
 const body=fc('FC1','Sel',{input:[v('Enable'),v('Preset','INT',3)],output:[v('Out','INT')]},net('n',and('a',no('c','#Enable')),{type:'MOVE',tag:'#Out',value:tg('#Preset')}));
 const run=(params:Output['params'],start:boolean)=>{const rt=new Runtime(prog([ob1(callNet('c','FC1',{params,outs:{Out:'RES'}})),body]));rt.inputs.START=start;scans(rt,1);return rt.snapshot().values.RES;};
 assert.equal(run({Enable:tg('START')},false),0,'Enable false: not moved');
 assert.equal(run({Enable:tg('START')},true),3,'Preset missing: default 3');
 assert.equal(run({Enable:tg('START'),Preset:lit(9)},true),9,'literal');
 assert.equal(run({Enable:lit(1),Preset:tg('IN')},false),1,'literal TRUE for BOOL, tag for INT');
 assert.equal(run({Preset:lit(9)},false),0,'Enable missing: default false');
});
test('FB input left unconnected keeps the value in the instance DB (start value at first)',()=>{
 const p=prog([ob1(callNet('c','FB1',{instance:'DB1',outs:{Out:'RES'}})),fb('FB1','Defaulted',{input:[v('Preset','INT',11)],output:[v('Out','INT')]},move('m','#Out',tg('#Preset'))),inst('DB1','D_DB','FB1')]);
 const rt=new Runtime(p);scans(rt,2);assert.equal(rt.snapshot().values.RES,11);
});
test('nested calls: OB -> FB -> FC',()=>{
 const p=prog([ob1(callNet('c','FB1',{instance:'DB1',params:{In:tg('IN')},outs:{Out:'RES'}})),
  fb('FB1','Outer',{input:[v('In','INT')],output:[v('Out','INT')]},callNet('inner','FC2',{params:{A:tg('#In')},outs:{R:'#Out'}})),
  fc('FC2','Twice',{input:[v('A','INT')],output:[v('R','INT')]},move('m','#R',calc('MUL',tg('#A'),lit(2)))),inst('DB1','Outer_DB','FB1')]);
 assert.deepEqual(errors(p),[]);const rt=new Runtime(p);rt.memory.set('IN',5);scans(rt,2);assert.equal(rt.snapshot().values.RES,10);assert.equal(rt.snapshot().values['Outer_DB.Out'],10);
});
const chain=(n:number)=>prog([ob1(callNet('c0','FC1')),...Array.from({length:n},(_,i)=>fc(`FC${i+1}`,`F${i+1}`,{},...(i+1<n?[callNet(`c${i+1}`,`FC${i+2}`)]:[move('leaf','LOG',lit(77))])))]);
test('call depth: 8 nested calls run, the 9th throws',()=>{
 const ok=chain(8);assert.deepEqual(errors(ok),[]);const rt=new Runtime(ok);scans(rt,1);assert.equal(rt.snapshot().values.LOG,77);
 const deep=chain(9);assert.deepEqual(errors(deep),[]);assert.throws(()=>new Runtime(deep).scan(10),/nesting depth exceeded/);
 assert.throws(()=>new Runtime(deep,{lang:'tr'}).scan(10),/derinliği aşıldı/);
});
const stamp=(id:string,n:number,over:Partial<Block>={}):Block=>({id,kind:'OB',networks:[move(`m${id}`,'LOG',calc('ADD',calc('MUL',tg('LOG'),lit(10)),lit(n)))],...over});
test('cycle OBs run in number order, not array order',()=>{
 const p=prog([stamp('OB10',10,{name:'Late',number:10}),stamp('OB1',1),stamp('OB5',5,{name:'Early',number:5})]);
 assert.deepEqual(errors(p),[]);const rt=new Runtime(p);scans(rt,1);assert.equal(rt.snapshot().values.LOG,160);
});
test('startup OB runs only in the first scan, before the cycle OBs',()=>{
 const p=prog([ob1(move('m','LOG',calc('MUL',tg('LOG'),lit(10)))),{id:'OB100',kind:'OB',name:'Startup',obType:'startup',number:100,networks:[move('s','LOG',calc('ADD',tg('LOG'),lit(3)))]}]);
 const rt=new Runtime(p);scans(rt,1);assert.equal(rt.snapshot().values.LOG,30);scans(rt,3);assert.equal(rt.snapshot().values.LOG,30000%32768);
 const q=prog([ob1(move('m','RES',calc('ADD',tg('RES'),lit(1)))),{id:'OB123',kind:'OB',name:'Boot',obType:'startup',number:123,networks:[move('s','LOG',calc('ADD',tg('LOG'),lit(1)))]}]);
 const r=new Runtime(q);scans(r,5);assert.equal(r.snapshot().values.LOG,1);assert.equal(r.snapshot().values.RES,5);
});
test('out-of-range writes to #local and DB members throw rt.range',()=>{
 const f=prog([ob1(callNet('c','FC1')),fc('FC1','Big',{temp:[v('T','INT')]},move('m','#T',lit(40000)))]);
 assert.throws(()=>new Runtime(f).scan(10),/#T: value \(40000\) is outside the INT range/);
 assert.throws(()=>new Runtime(f,{lang:'tr'}).scan(10),/#T: değer \(40000\) INT aralığının dışında/);
 const d=prog([ob1(move('m','Data.Speed',lit(40000))),gdb('DB1','Data',v('Speed','INT'))]);
 assert.throws(()=>new Runtime(d).scan(10),/Data\.Speed: value \(40000\) is outside the INT range/);
 const b=prog([ob1(callNet('c','FB1',{instance:'DB1'})),fb('FB1','B',{static:[v('S','INT')]},move('m','#S',lit(-40000))),inst('DB1','B_DB','FB1')]);
 assert.throws(()=>new Runtime(b).scan(10),/outside the INT range/);
});
test('#local in an OB with a Temp variable works at runtime',()=>{
 const p=prog([{...ob1(move('m1','#Tmp',lit(5)),move('m2','RES',tg('#Tmp'))),iface:{temp:[v('Tmp','INT')]}}]);
 assert.deepEqual(codes(p),[]);const rt=new Runtime(p);scans(rt,1);assert.equal(rt.snapshot().values.RES,5);
});
test('a CALL network with a false rail does not call the block',()=>{
 const p=prog([ob1(net('c',and('a',no('c1','START')),{type:'CALL',tag:'FC1'})),fc('FC1','F',{},move('m','LOG',lit(9)))]);
 const rt=new Runtime(p);scans(rt,1);assert.equal(rt.snapshot().values.LOG,0);rt.inputs.START=true;scans(rt,1);assert.equal(rt.snapshot().values.LOG,9);
});
test('runtime refuses programs with compile errors; frames are popped after a throw',()=>{
 assert.throws(()=>new Runtime(prog([ob1(callNet('c','FC9'))])),/does not exist or is not an FC\/FB/);
 const f=prog([ob1(callNet('c','FC1')),fc('FC1','Big',{temp:[v('T','INT')]},move('m','#T',lit(40000)))]);const rt=new Runtime(f);assert.throws(()=>rt.scan(10));assert.equal(rt.frames.length,0);
});

// ---- compiler ----
const callee=(extra:Block[]=[],o:Partial<Output>={},calleeId='FC1')=>prog([ob1(callNet('c',calleeId,o)),...extra]);
test('E050: unknown callee, calling a DB or an OB',()=>{
 assert.ok(errors(callee([],{},'FC9')).includes('E050'));
 assert.ok(errors(callee([gdb('DB1','Data')],{},'DB1')).includes('E050'));
 assert.ok(errors(callee([{id:'OB2',kind:'OB',name:'Other',networks:[]}],{},'OB2')).includes('E050'));
 assert.ok(!errors(callee([fc('FC1','F',{})])).includes('E050'));
});
test('E051: FB call without or with a wrong instance DB',()=>{
 const f=fb('FB1','A',{input:[v('X')]}),g=fb('FB2','B',{});
 const base=[f,g,inst('DB1','A_DB','FB1'),inst('DB2','B_DB','FB2'),gdb('DB3','Glob')];
 assert.ok(errors(callee(base,{},'FB1')).includes('E051'));
 assert.ok(errors(callee(base,{instance:'DB2'},'FB1')).includes('E051'),'instance of another FB');
 assert.ok(errors(callee(base,{instance:'DB3'},'FB1')).includes('E051'),'global DB');
 assert.ok(errors(callee(base,{instance:'DB9'},'FB1')).includes('E051'),'missing DB');
 assert.ok(errors(callee(base,{instance:'FB2'},'FB1')).includes('E051'),'not a DB');
 assert.deepEqual(errors(callee(base,{instance:'DB1'},'FB1')),[]);
 assert.ok(!errors(callee([fc('FC1','F',{})],{instance:'DB9'})).includes('E051'),'an FC needs no instance');
});
test('E052: unknown parameter (inputs, outputs, inouts) and wrong direction',()=>{
 const f=fc('FC1','F',{input:[v('A','INT')],output:[v('R','INT')],inout:[v('IO','INT')]});
 assert.deepEqual(errors(callee([f],{params:{A:lit(1),IO:tg('LOG')},outs:{R:'RES'}})),[]);
 assert.ok(errors(callee([f],{params:{Nope:lit(1)}})).includes('E052'));
 assert.ok(errors(callee([f],{outs:{Nope:'RES'}})).includes('E052'));
 assert.ok(errors(callee([f],{params:{R:tg('RES')}})).includes('E052'),'output used as input');
 assert.ok(errors(callee([f],{outs:{A:'RES'}})).includes('E052'),'input used as output');
 assert.match(compile(callee([f],{params:{Nope:lit(1)}}),'tr').find(d=>d.code==='E052')!.message,/F \[FC1\] içinde Nope parametresi yok/);
});
test('E053: direct and indirect recursion',()=>{
 assert.ok(errors(callee([fc('FC1','F',{},callNet('r','FC1'))])).includes('E053'));
 assert.ok(errors(callee([fc('FC1','F',{},callNet('r','FC2')),fc('FC2','G',{},callNet('r2','FC1'))])).includes('E053'));
 assert.ok(errors(callee([fc('FC1','F',{},callNet('r','FC2')),fc('FC2','G',{},callNet('r2','FC3')),fc('FC3','H',{},callNet('r3','FC1'))])).includes('E053'),'three-cycle');
 const fbRec=callee([fb('FB1','A',{},callNet('r','FB1',{instance:'DB1'})),inst('DB1','A_DB','FB1')],{instance:'DB1'},'FB1');assert.ok(errors(fbRec).includes('E053'));
 assert.ok(!errors(callee([fc('FC1','F',{},callNet('r','FC2'),callNet('r2','FC2')),fc('FC2','G',{})])).includes('E053'),'diamond/repeated call is no recursion');
});
test('E054: invalid block and member names',()=>{
 assert.ok(errors(callee([fc('FC1','1bad',{})])).includes('E054'));
 assert.ok(errors(callee([fc('FC1','has space',{})])).includes('E054'));
 assert.ok(errors(callee([fc('FC1','F',{input:[v('a b')]})])).includes('E054'));
 assert.ok(errors(callee([gdb('DB1','Data',v('x-y'))],{},'FC9')).includes('E054'));
 assert.ok(!errors(callee([fc('FC1','_ok1',{input:[v('_a1')]})])).includes('E054'));
});
test('E055: instance DB of a missing FB or of a non-FB',()=>{
 assert.ok(errors(prog([ob1(),inst('DB1','X_DB','FB9')])).includes('E055'));
 assert.ok(errors(prog([ob1(),fc('FC1','F',{}),inst('DB1','X_DB','FC1')])).includes('E055'));
 assert.ok(!errors(prog([ob1(),fb('FB1','A',{}),inst('DB1','X_DB','FB1')])).includes('E055'));
});
test('E056: duplicate block names (any case) and block-vs-tag name clash',()=>{
 assert.ok(errors(prog([ob1(),fc('FC1','Same',{}),fc('FC2','Same',{})])).includes('E056'));
 assert.ok(errors(prog([ob1(),fc('FC1','Same',{}),fb('FB1','SAME',{})])).includes('E056'));
 assert.ok(errors(prog([ob1(),fb('FB1','Pump',{}),gdb('DB1','Pump')])).includes('E056'));
 assert.ok(errors(prog([ob1(),fb('FB1','MOTOR',{})])).includes('E056'),'tag name');
 assert.ok(errors(prog([ob1(),gdb('DB1','Main')])).includes('E056'),'OB1 is called Main');
 assert.match(compile(prog([ob1(),fb('FB1','MOTOR',{})]),'tr').find(d=>d.code==='E056')!.message,/Blok adları benzersiz olmalı: MOTOR/);
 assert.ok(!errors(prog([ob1(),fb('FB1','Motor',{})])).includes('E056'),'tags are case-sensitive');
});
test('E057: constants cannot be written (coil, set, reset, MOVE, call output)',()=>{
 const f=(n:Network)=>prog([{...ob1(),iface:{constant:[v('K','INT',5),v('KB')]}},fc('FC1','F',{constant:[v('K','INT',5),v('KB')],output:[v('R','INT')]},n),ob1(callNet('c','FC1'))].slice(1).concat([{id:'OB2',kind:'OB',name:'Other',networks:[]}]));
 for(const out of [{type:'COIL',tag:'#KB'},{type:'SET',tag:'#KB'},{type:'RESET',tag:'#KB'}] as Output[])assert.ok(errors(f(net('n',no('c','START'),out))).includes('E057'),out.type);
 assert.ok(errors(f(move('m','#K',lit(1)))).includes('E057'));
 const r=prog([ob1(callNet('c','FC1',{outs:{R:'#K'}})),fc('FC1','F',{output:[v('R','INT')]})]);r.blocks[0].iface={constant:[v('K','INT')]};assert.ok(errors(r).includes('E057'),'call output into constant');
 assert.ok(!errors(f(move('m','#R',lit(1)))).includes('E057'));
 assert.ok(!errors(f(net('n',no('c','#K'),{type:'COIL',tag:'LAMP'}))).includes('E057'),'reading is fine');
});
test('E057: an InOut actual bound to a constant is rejected',()=>{
 const p=prog([{...ob1(callNet('c','FC1',{params:{X:tg('#K')}})),iface:{constant:[v('K','INT',5)]}},fc('FC1','F',{inout:[v('X','INT')]},move('m','#X',lit(1)))]);
 assert.ok(errors(p).includes('E057'));
});
test('W061: FC/FB that no OB reaches only warn, called ones and nested ones do not',()=>{
 const p=prog([ob1(callNet('c','FC1')),fc('FC1','Used',{},callNet('n','FC2')),fc('FC2','Nested',{}),fc('FC3','Lonely',{}),fb('FB1','LonelyFb',{})]);
 const ds=compile(p).filter(d=>d.code==='W061');assert.deepEqual(ds.map(d=>d.message),['Lonely [FC3] is not called from any OB','LonelyFb [FB1] is not called from any OB']);
 assert.ok(ds.every(d=>d.severity==='warning'));assert.deepEqual(errors(p),[]);
 assert.equal(new Runtime(p).program,p,'warnings do not block the runtime');
 assert.deepEqual(compile(p,'tr').filter(d=>d.code==='W061').map(d=>d.message),['Lonely [FC3] hiçbir OB’den çağrılmıyor','LonelyFb [FB1] hiçbir OB’den çağrılmıyor']);
 const viaSecondOb=prog([ob1(),{id:'OB2',kind:'OB',name:'Second',networks:[callNet('c','FC1')]},fc('FC1','F',{})]);assert.ok(!codes(viaSecondOb).includes('W061'));
});
test('#local operands: unknown name is E001; #Temp in an OB compiles',()=>{
 const p=callee([fc('FC1','F',{input:[v('A')]},net('n',no('c','#Nope'),{type:'COIL',tag:'#A'}))]);assert.ok(errors(p).includes('E001'));
 assert.ok(errors(prog([ob1(net('n',no('c','#X'),{type:'COIL',tag:'LAMP'}))])).includes('E001'),'OB without that local');
 assert.ok(errors(callee([fc('FC1','F',{},move('m','RES',tg('#Nope')))])).includes('E001'));
 assert.deepEqual(codes(prog([{...ob1(move('m1','#Tmp',lit(5)),net('n',no('c','#B'),{type:'COIL',tag:'LAMP'}),move('m2','RES',tg('#Tmp'))),iface:{temp:[v('Tmp','INT'),v('B')]}}])),[]);
 assert.ok(errors(prog([ob1(net('n',no('c','#Tmp'),{type:'COIL',tag:'LAMP'})),fc('FC1','F',{temp:[v('Tmp')]})])).includes('E001'),'local of another block is not visible');
 assert.ok(errors(prog([{...ob1(net('n',no('c','#Tmp'),{type:'COIL',tag:'LAMP'})),iface:{temp:[v('Tmp','INT')]}}])).includes('E006'),'INT local as contact');
});
test('empty root path is only allowed for CALL and MOVE',()=>{
 for(const type of ['COIL','SET','RESET'] as const)assert.ok(errors(prog([ob1(net('n',empty('n'),{type,tag:'LAMP'}))])).includes('E014'),type);
 assert.ok(!errors(prog([ob1(move('m','RES',lit(1)))])).includes('E014'));
 assert.ok(!errors(callee([fc('FC1','F',{})])).includes('E014'));
 assert.ok(errors(prog([ob1(net('n',and('a',and('inner')),{type:'MOVE',tag:'RES',value:lit(1)}))])).includes('E014'),'nested empty branch still an error');
});
test('a BOOL tag for an INT input is rejected',()=>{
 assert.ok(errors(callee([fc('FC1','F',{input:[v('N','INT')]})],{params:{N:tg('START')}})).includes('E006'));
});
test('data type and name checks on parameters and DB members',()=>{
 const f=fc('FC1','F',{input:[v('B'),v('N','INT')],output:[v('RB'),v('RN','INT')]});
 assert.ok(errors(callee([f],{params:{B:tg('IN')}})).includes('E006'),'INT tag for BOOL input');
 assert.ok(errors(callee([f],{params:{B:tg('MISSING')}})).includes('E001'));
 assert.ok(errors(callee([f],{outs:{RB:'RES'}})).includes('E006'));
 assert.ok(errors(callee([f],{outs:{RN:'START'}})).includes('E009'),'cannot write a %I tag');
 assert.ok(errors(prog([ob1(move('m','Data.Nope',lit(1))),gdb('DB1','Data',v('Speed','INT'))])).includes('E001'));
 assert.ok(errors(prog([ob1(),gdb('DB1','Data',v('S','INT',true as unknown as number))])).includes('E004'));
});

// ---- parseProgram ----
const valid=()=>prog([ob1(callNet('c','FB1',{instance:'DB1',params:{In:tg('START'),N:lit(2)},outs:{Out:'MOTOR'}})),{...fb('FB1','A',{input:[v('In'),v('N','INT')],output:[v('Out')],static:[v('S','INT')],temp:[],constant:[v('K','INT',3)]}),number:1},inst('DB1','A_DB','FB1'),gdb('DB2','Data',v('X','REAL',1.5)),{id:'OB100',kind:'OB',name:'Boot',obType:'startup',number:100,networks:[]}]);
const clone=():Record<string,any>=>JSON.parse(JSON.stringify(valid()));
test('parseProgram accepts valid block programs and keeps the data',()=>{
 const p=valid();assert.deepEqual(errors(p),[]);assert.deepEqual(parseProgram(JSON.parse(JSON.stringify(p))),p);
 const q=clone();q.blocks[0].networks.push({id:'n2',title:'',logic:{id:'x',type:'AND',children:[]},output:{type:'CALL',tag:'FC1'}});assert.ok(parseProgram(q));
 const many=clone();many.blocks=Array.from({length:60},(_,i)=>({id:`FC${i+1}`,kind:'FC',networks:[]}));assert.equal(parseProgram(many).blocks.length,60);
});
test('parseProgram rejects malformed block data',()=>{
 const bad:Record<string,(p:Record<string,any>)=>void>={
  'unknown kind':p=>{p.blocks[1].kind='XX';},'61 blocks':p=>{p.blocks=Array.from({length:61},(_,i)=>({id:`FC${i+1}`,kind:'FC',networks:[]}));},
  'duplicate block id':p=>{p.blocks[2].id='FB1';},'number 0':p=>{p.blocks[1].number=0;},'number too big':p=>{p.blocks[1].number=70000;},'number fraction':p=>{p.blocks[1].number=1.5;},
  'bad obType':p=>{p.blocks[4].obType='fast';},'instanceOf not text':p=>{p.blocks[2].instanceOf=5;},'name not text':p=>{p.blocks[1].name=7;},
  'iface unknown section':p=>{p.blocks[1].iface.bogus=[];},'iface section not array':p=>{p.blocks[1].iface.input={};},'iface bad type':p=>{p.blocks[1].iface.input[0].type='STRING';},
  'iface bad initial':p=>{p.blocks[1].iface.input[1].initial=true;},'iface missing name':p=>{delete p.blocks[1].iface.input[0].name;},'iface not object':p=>{p.blocks[1].iface=[];},
  'iface 129 vars':p=>{p.blocks[1].iface.static=Array.from({length:129},(_,i)=>({name:`V${i}`,type:'BOOL',initial:false,comment:''}));},
  'data not array':p=>{p.blocks[3].data={};},'data bad member':p=>{p.blocks[3].data[0].initial='x';},
  'call params not object':p=>{p.blocks[0].networks[0].output.params=[];},'call param operand malformed':p=>{p.blocks[0].networks[0].output.params.In={kind:'nope'};},
  'call outs value not text':p=>{p.blocks[0].networks[0].output.outs.Out=5;},'call outs not object':p=>{p.blocks[0].networks[0].output.outs='x';},'call instance not text':p=>{p.blocks[0].networks[0].output.instance=1;},
  'call 65 params':p=>{p.blocks[0].networks[0].output.params=Object.fromEntries(Array.from({length:65},(_,i)=>[`P${i}`,{kind:'literal',value:1}]));},
  'call 65 outs':p=>{p.blocks[0].networks[0].output.outs=Object.fromEntries(Array.from({length:65},(_,i)=>[`P${i}`,'X']));},
  'output type unknown':p=>{p.blocks[0].networks[0].output.type='JUMP';},
 };
 for(const [name,mutate] of Object.entries(bad)){const p=clone();mutate(p);assert.throws(()=>parseProgram(p),Error,name);}
 assert.throws(()=>parseProgram({...clone(),blocks:Array.from({length:61},(_,i)=>({id:`FC${i}`,kind:'FC',networks:[]}))},'tr'),/biçim|format|Program/i);
});
test('existing reference programs still pass with the block-aware evaluator',()=>{
 for(const level of [1,3,5,12]){const r=evaluate(material(level).reference,level,0);assert.equal(r.passed,true,`level ${level}`);}
});
test('blocks helpers: nextNumber and callInfo',()=>{
 const p=valid();assert.equal(nextNumber(p,'FB'),2);assert.equal(nextNumber(p,'DB'),1+2);assert.equal(nextNumber(p,'OB'),123);assert.equal(nextNumber(p,'FC'),1);
 const c=callInfo(p,p.blocks[0].networks[0].output)!;assert.equal(c.name,'A');assert.equal(c.instance,'A_DB');assert.equal(c.instanceId,'DB1');assert.deepEqual(c.inputs.map(x=>x.name),['In','N']);assert.deepEqual(c.outputs.map(x=>x.name),['Out']);
 assert.equal(callInfo(p,{type:'COIL',tag:'MOTOR'}),undefined);assert.equal(callInfo(p,{type:'CALL',tag:'DB1'}),undefined);assert.equal(callInfo(p,{type:'CALL',tag:'FC77'}),undefined);
});

// ---- SSR ----
const render=(lang:Lang,node:ReactNode)=>renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:node}));
const chrome=(html:string)=>html.replace(/ value="[^"]*"/g,'');
const fbBlock=():Block=>fb('FB1','Motor_Ctrl',{input:[v('Start')],output:[v('Run')],static:[v('Count','INT',3)]});
const sectionNames=(html:string)=>[...html.matchAll(/class="section"><td>▾<\/td><td[^>]*>([^<]*)</g)].map(m=>m[1]);
test('SSR AddBlockDialog in en and tr',()=>{
 const p=prog([ob1(),fbBlock()]);
 const raw=render('en',createElement(AddBlockDialog,{program:p,onCreate:noop,onCancel:noop})),en=chrome(raw);
 for(const s of ['Add new block','Organization block','Function block','>Function<','Data block','Name:','Number:','Automatic','Manual','Add new and open','Cancel','OK','role="radiogroup"','LAD'])assert.ok(en.includes(s),s);
 assert.ok(raw.includes('value="Block_1"'));assert.doesNotMatch(en,TURKISH);
 const tr=chrome(render('tr',createElement(AddBlockDialog,{program:p,onCreate:noop,onCancel:noop})));
 for(const s of ['Yeni blok ekle','Organizasyon bloğu','Fonksiyon bloğu','Veri bloğu','Ad:','Numara:','Otomatik','Manuel','Ekle ve aç','İptal','Tamam'])assert.ok(tr.includes(s),s);
 assert.ok(!tr.includes('Add new block')&&!tr.includes('Organization block')&&!tr.includes('Cancel'));
 assert.ok(en.includes('aria-checked="true"'));
});
test('SSR CallOptionsDialog proposes <FB>_DB with the next DB number, in en and tr',()=>{
 const p=prog([ob1(),fbBlock(),gdb('DB1','Other')]);const props={program:p,fb:p.blocks[1],onCreate:noop,onCancel:noop};
 const en=render('en',createElement(CallOptionsDialog,props));assert.ok(en.includes('value="Motor_Ctrl_DB"'));assert.ok(en.includes('value="2"'));assert.ok(en.includes('Call options')&&en.includes('Single instance'));
 const tr=render('tr',createElement(CallOptionsDialog,props));assert.ok(tr.includes('Çağrı seçenekleri')&&tr.includes('Tek instance')&&tr.includes('value="Motor_Ctrl_DB"'));
 const taken=prog([ob1(),fbBlock(),gdb('DB1','Motor_Ctrl_DB')]);assert.ok(render('en',createElement(CallOptionsDialog,{...props,program:taken,fb:taken.blocks[1]})).includes('value="Motor_Ctrl_DB_1"'));
});
test('SSR InterfaceEditor: sections per block kind and OB system inputs, in en and tr',()=>{
 const show=(lang:Lang,block:Block,locked=false)=>render(lang,createElement(InterfaceEditor,{block,locked,onChange:noop}));
 const full=(b:Block)=>b.iface;void full;
 const f=fbBlock(),c=fc('FC1','F',{input:[v('A')]}),o=ob1(),o100:Block={id:'OB100',kind:'OB',name:'Startup',obType:'startup',networks:[]};
 assert.deepEqual(sectionNames(show('en',f)),['Input','Output','InOut','Static','Temp','Constant']);
 assert.deepEqual(sectionNames(show('en',c)),['Input','Output','InOut','Temp','Constant']);
 assert.deepEqual(sectionNames(show('en',o)),['Input','Temp','Constant']);
 const cyc=show('en',o);assert.ok(cyc.includes('Initial_Call')&&cyc.includes('Remanence')&&cyc.includes('Initial call of this OB'));assert.ok(!cyc.includes('LostRetentive'));
 const st=show('en',o100);assert.ok(st.includes('LostRetentive')&&st.includes('LostRTC'));assert.ok(!st.includes('Initial_Call'));
 assert.equal((cyc.match(/&lt;Add new&gt;/g)??[]).length,2,'OB: no add row under system inputs');
 const fh=show('en',f);assert.equal((fh.match(/&lt;Add new&gt;/g)??[]).length,6);assert.ok(fh.includes('value="Start"')&&fh.includes('value="Count"')&&fh.includes('<option value="INT" selected="">Int</option>'));assert.doesNotMatch(fh,/disabled/);
 assert.ok(show('en',f,true).includes('disabled'));
 const tr=show('tr',o);assert.ok(tr.includes('Bu OB’nin ilk çağrısı')&&tr.includes('&lt;Yeni ekle&gt;')&&tr.includes('Veri tipi')&&tr.includes('Varsayılan değer'));assert.ok(!tr.includes('Initial call'));
 assert.ok(show('tr',o100).includes('=True, kalıcı veriler kaybolduysa'));
});
test('SSR DbEditor: global DB is editable, instance DB is read-only from its FB',()=>{
 const p=prog([ob1(),fbBlock(),inst('DB1','Motor_DB','FB1'),gdb('DB2','Data',v('Speed','INT',7),v('Flag'))]);
 const show=(lang:Lang,block:Block,monitoring=false,values:Record<string,boolean|number>={})=>render(lang,createElement(DbEditor,{program:p,block,values,monitoring,locked:false,onChange:noop}));
 const g=show('en',p.blocks[3]);assert.ok(g.includes('value="Speed"')&&g.includes('value="Flag"')&&g.includes('&lt;Add new&gt;'));assert.ok(!g.includes('Instance DB of'));assert.ok(g.includes('Start value')&&g.includes('Monitor value')&&g.includes('Retain'));
 const i=show('en',p.blocks[2]);assert.ok(i.includes('Instance DB of Motor_Ctrl [FB1]'));assert.ok(!i.includes('&lt;Add new&gt;'));assert.ok(!i.includes('aria-label="Name"'),'names are plain text');
 for(const m of ['Start','Run','Count'])assert.ok(i.includes(`<td>${m}</td>`),m);
 const mon=show('en',p.blocks[2],true,{'Motor_DB.Run':true,'Motor_DB.Count':5});assert.ok(mon.includes('<td>TRUE</td>')&&mon.includes('<td>5</td>'));
 assert.ok(!show('en',p.blocks[2],false,{'Motor_DB.Run':true}).includes('<td>TRUE</td>'));
 const emptyFb=prog([ob1(),fb('FB1','Empty',{}),inst('DB1','E_DB','FB1')]);assert.ok(render('en',createElement(DbEditor,{program:emptyFb,block:emptyFb.blocks[2],values:{},monitoring:false,locked:false,onChange:noop})).includes('No members.'));
 const t=show('tr',p.blocks[2]);assert.ok(t.includes('Motor_Ctrl [FB1] instance DB’si')&&t.includes('İzleme değeri')&&t.includes('Başlangıç değeri'));assert.ok(show('tr',p.blocks[3]).includes('&lt;Yeni ekle&gt;'));
});
test('SSR Rung draws a call box: instance DB label, pins and … placeholders; "???" for a missing callee',()=>{
 const p=prog([ob1(),{...fbBlock(),iface:{input:[v('Start'),v('Preset','INT')],output:[v('Run'),v('Done')],static:[]}},inst('DB1','Motor_DB','FB1')]);
 const network=net('n',and('a',no('c','START')),{type:'CALL',tag:'FB1',instance:'DB1',params:{Start:tg('START')},outs:{Run:'MOTOR'}});
 const props={network,call:callInfo(p,network.output),tags:tags(),trace:{},monitor:false,locked:false,selected:'',onSelect:noop,onWhy:noop,onMove:noop,onTag:noop,onOperand:noop,onInsert:noop};
 for(const lang of ['en','tr'] as const){const html=render(lang,createElement(Rung,props));
  for(const s of ['%DB1','Motor_Ctrl','Motor_DB','>EN<','>ENO<','>Start<','>Preset<','>Run<','>Done<','>START<','>MOTOR<'])assert.ok(html.includes(s),`${lang} ${s}`);
  assert.equal((html.match(/>…</g)??[]).length,2,`${lang}: Preset input and Done output are unconnected`);}
 const missing=render('en',createElement(Rung,{...props,call:undefined,network:net('n',and('a'),{type:'CALL',tag:'FB9'})}));assert.ok(missing.includes('??? FB9'));assert.ok(!missing.includes('%DB'));
 const fcCall=net('n',and('a'),{type:'CALL',tag:'FC1',params:{A:lit(7)}});const q=prog([ob1(),fc('FC1','Calc',{input:[v('A','INT')],output:[v('R','INT')]})]);
 const f=render('en',createElement(Rung,{...props,network:fcCall,call:callInfo(q,fcCall.output)}));assert.ok(f.includes('Calc')&&f.includes('>7<')&&!f.includes('%DB'));
});
test('blocksDict: English and Turkish have the same keys and placeholders; Turkish differs from English apart from mnemonics',()=>{
 const en=blocksDict.en as Record<string,string>,tr=blocksDict.tr as Record<string,string>;
 assert.deepEqual(Object.keys(en).sort(),Object.keys(tr).sort());
 const ph=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
 for(const k of Object.keys(en)){assert.ok(en[k].trim()&&tr[k].trim(),`${k} not empty`);assert.equal(ph(en[k]),ph(tr[k]),`${k} placeholders`);assert.doesNotMatch(en[k],TURKISH,k);}
 const same=Object.keys(en).filter(k=>en[k]===tr[k]);
 assert.deepEqual(same,['iface.input','iface.output','iface.inout','iface.static','iface.temp','iface.constant'],'only TIA section names stay English');
});
