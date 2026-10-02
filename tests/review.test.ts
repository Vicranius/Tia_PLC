import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Runtime} from '../src/plc/runtime';
import {compile} from '../src/plc/compiler';
import type {Block,Expr,Network,Output,Program,Tag,Value,Variable,DataType} from '../src/plc/model';

const lit=(value:number):Value=>({kind:'literal',value}),tg=(tag:string):Value=>({kind:'tag',tag});
const calc=(op:'ADD'|'SUB'|'MUL',a:Value,b:Value):Value=>({kind:'calc',op,a,b});
const tag=(name:string,type:DataType,address:string,initial:boolean|number=type==='BOOL'?false:0):Tag=>({name,type,address,initial,comment:''});
const v=(name:string,type:DataType='BOOL',initial:boolean|number=type==='BOOL'?false:0):Variable=>({name,type,initial,comment:''});
const no=(id:string,t:string):Expr=>({id,type:'NO',tag:t});
const and=(id:string,...children:Expr[]):Expr=>({id,type:'AND',children});
const net=(id:string,logic:Expr,output:Output):Network=>({id,title:id,logic,output});
const empty=(id:string)=>and(`root-${id}`);
const callNet=(id:string,callee:string,extra:Partial<Output>={}):Network=>net(id,empty(id),{type:'CALL',tag:callee,...extra});
const base=():Tag[]=>[tag('START','BOOL','%I0.0'),tag('IN2','BOOL','%I0.1'),tag('MOTOR','BOOL','%Q0.0'),tag('LAMP','BOOL','%Q0.1'),
 tag('I16','INT','%MW10'),tag('D32','DINT','%MD20'),tag('R32','REAL','%MD24'),tag('IW','INT','%IW64'),tag('B','BOOL','%M0.0'),tag('B16','INT','%MW40'),tag('DD','DINT','%MD50')];
const prog=(blocks:Block[]):Program=>({version:1,cpu:'CPU 1214C',tags:base(),blocks});
const ob1=(...networks:Network[]):Block=>({id:'OB1',kind:'OB',networks});
const fc=(id:string,name:string,iface:Block['iface'],...networks:Network[]):Block=>({id,kind:'FC',name,iface,networks});
const fb=(id:string,name:string,iface:Block['iface'],...networks:Network[]):Block=>({id,kind:'FB',name,iface,networks});
const inst=(id:string,name:string,of:string):Block=>({id,kind:'DB',name,instanceOf:of,networks:[]});
const gdb=(id:string,name:string,...data:Variable[]):Block=>({id,kind:'DB',name,data,networks:[]});
const errors=(p:Program)=>compile(p).filter(d=>d.severity==='error').map(d=>d.code);
const withIn=(type:DataType,val:Value,callee:'in'|'inout'='in')=>prog([ob1(callNet('c','FC1',{params:{P:val}})),fc('FC1','F',callee==='in'?{input:[v('P',type)]}:{inout:[v('P',type)]})]);

test('Call params: INT input literal out of range is E063',()=>{assert.deepEqual(errors(withIn('INT',lit(40000))),['E063']);assert.deepEqual(errors(withIn('INT',lit(100))),[]);});
test('Call params: REAL / DINT tag into INT input is E064',()=>{assert.deepEqual(errors(withIn('INT',tg('R32'))),['E064']);assert.deepEqual(errors(withIn('INT',tg('D32'))),['E064']);});
test('Call params: INT tag widens into DINT and REAL',()=>{assert.deepEqual(errors(withIn('DINT',tg('I16'))),[]);assert.deepEqual(errors(withIn('REAL',tg('I16'))),[]);});
test('Call params: BOOL input accepts 0/1 literals, rejects 2 (E063) and calc (E064)',()=>{
 assert.deepEqual(errors(withIn('BOOL',lit(0))),[]);assert.deepEqual(errors(withIn('BOOL',lit(1))),[]);
 assert.deepEqual(errors(withIn('BOOL',lit(2))),['E063']);assert.deepEqual(errors(withIn('BOOL',calc('ADD',lit(1),lit(0)))),['E064']);});
test('Call params: InOut rules (E009 %I, E065 literal, E057 constant, E064 type mismatch)',()=>{
 assert.ok(errors(withIn('INT',tg('IW'),'inout')).includes('E009'));
 assert.ok(errors(withIn('INT',lit(3),'inout')).includes('E065'));
 assert.ok(errors(withIn('INT',tg('D32'),'inout')).includes('E064'));
 assert.deepEqual(errors(withIn('INT',tg('I16'),'inout')),[]);
 const p=prog([{...ob1(callNet('c','FC1',{params:{P:tg('#K')}})),iface:{constant:[v('K','INT',1)]}},fc('FC1','F',{inout:[v('P','INT')]})]);
 assert.ok(errors(p).includes('E057'),errors(p).join());
});
test('Call params: output mapped to a smaller type is E064',()=>{
 const mk=(dest:string)=>prog([ob1(callNet('c','FC1',{outs:{R:dest}})),fc('FC1','F',{output:[v('R','DINT')]})]);
 assert.deepEqual(errors(mk('I16')),['E064']);assert.deepEqual(errors(mk('D32')),[]);
});
test('Runtime: out-of-range value from calc into INT input throws rt.range and does not write the instance DB',()=>{
 const p=prog([ob1(callNet('c','FB1',{instance:'DB1',params:{P:calc('MUL',lit(1000),lit(100))}})),fb('FB1','F',{input:[v('P','INT',7)]}),inst('DB1','F_DB','FB1')]);
 assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);assert.throws(()=>rt.scan(10),/range|100000|P/i);assert.equal(rt.snapshot().values['F_DB.P'],7);
});
test('Duplicate member names are E066 (across FB sections and inside a global DB)',()=>{
 const f=prog([ob1(),fb('FB1','F',{input:[v('X')],static:[v('x','INT')]})]);assert.ok(errors(f).includes('E066'));
 const g=prog([ob1(),gdb('DB1','G',v('A','INT'),v('A','INT'))]);assert.ok(errors(g).includes('E066'));
 assert.ok(!errors(prog([ob1(),gdb('DB1','G',v('A','INT'),v('B','INT'))])).includes('E066'));
});
test('Per-instance trace: keys are <DB name>/<element id> with distinct values per instance',()=>{
 const f=fb('FB1','F',{input:[v('Inp')],output:[v('Done')]},net('n1',{id:'ton1',type:'TON',pt:100,input:no('c1','#Inp')},{type:'COIL',tag:'#Done'}));
 const p=prog([ob1(callNet('a','FB1',{instance:'DB1',params:{Inp:tg('START')}}),callNet('b','FB1',{instance:'DB2',params:{Inp:tg('IN2')}})),f,inst('DB1','A_DB','FB1'),inst('DB2','B_DB','FB1')]);
 assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);rt.inputs.START=true;rt.inputs.IN2=false;for(let i=0;i<3;i++)rt.scan(10);
 const t=rt.snapshot().trace;
 for(const id of['c1','n1','ton1']){assert.ok(t[`A_DB/${id}`],`A_DB/${id}`);assert.ok(t[`B_DB/${id}`],`B_DB/${id}`);}
 assert.equal(t['A_DB/c1'].value,true);assert.equal(t['B_DB/c1'].value,false);
 assert.notEqual(t['A_DB/ton1'].detail,t['B_DB/ton1'].detail);
});
