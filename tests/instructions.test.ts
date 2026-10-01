import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Runtime} from '../src/plc/runtime';
import {compile,parseProgram} from '../src/plc/compiler';
import type {Block,CalcOp,Expr,Network,Output,Program,Tag,Value,DataType} from '../src/plc/model';

const lit=(value:number):Value=>({kind:'literal',value}),tg=(tag:string):Value=>({kind:'tag',tag});
const op=(o:CalcOp,a:Value,b:Value=lit(0),c?:Value):Value=>c?{kind:'calc',op:o,a,b,c}:{kind:'calc',op:o,a,b};
const tag=(name:string,type:DataType,address:string,initial:boolean|number=type==='BOOL'?false:0):Tag=>({name,type,address,initial,comment:''});
const no=(id:string,t:string):Expr=>({id,type:'NO',tag:t});
const and=(id:string,...children:Expr[]):Expr=>({id,type:'AND',children});
const net=(id:string,logic:Expr,output:Output):Network=>({id,title:id,logic,output});
const base=():Tag[]=>[tag('A','BOOL','%I0.0'),tag('B','BOOL','%I0.1'),tag('Q','BOOL','%Q0.0'),tag('FF','BOOL','%M0.0'),
 tag('I','INT','%MW10'),tag('R','INT','%MW12'),tag('W','WORD','%MW20'),tag('RW','WORD','%MW22'),tag('BY','BYTE','%MB30'),tag('RB','BYTE','%MB32'),
 tag('D','DWORD','%MD40'),tag('RD','DWORD','%MD44'),tag('DI','DINT','%MD50'),tag('RDI','DINT','%MD54')];
const prog=(networks:Network[],extra:Tag[]=[]):Program=>({version:1,cpu:'CPU 1214C',tags:[...base(),...extra],blocks:[{id:'OB1',kind:'OB',networks}satisfies Block]});
const errors=(p:Program)=>compile(p).filter(d=>d.severity==='error').map(d=>d.code);
const mv=(target:string,v:Value):Network=>net('m'+target,and('r'+target),{type:'MOVE',tag:target,value:v});
// Run one MOVE once with initial values set via memory; return the target value.
const calc=(target:string,v:Value,init:Record<string,number>={}):number=>{
 const p=prog([mv(target,v)]);assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);for(const[k,x]of Object.entries(init))rt.memory.set(k,x);rt.scan(10);return rt.memory.read(target) as number;
};

test('math: MOD keeps the sign of the dividend, NEG, ABS, MIN, MAX, SQR, SQRT',()=>{
 assert.equal(calc('R',op('MOD',lit(7),lit(3))),1);
 assert.equal(calc('R',op('MOD',lit(-7),lit(3))),-1);
 assert.equal(calc('R',op('MOD',lit(7),lit(-3))),1);
 assert.equal(calc('R',op('NEG',tg('I')),{I:5}),-5);
 assert.equal(calc('R',op('NEG',tg('I')),{I:-5}),5);
 assert.equal(calc('R',op('ABS',tg('I')),{I:-9}),9);
 assert.equal(calc('R',op('MIN',lit(4),lit(-2))),-2);
 assert.equal(calc('R',op('MAX',lit(4),lit(-2))),4);
 assert.equal(calc('R',op('SQR',lit(12))),144);
 assert.equal(calc('R',op('SQRT',lit(144))),12);
});
test('math: LIMIT(MN,IN,MX) clamps both sides and passes values inside',()=>{
 assert.equal(calc('R',op('LIMIT',lit(10),tg('I'),lit(20)),{I:5}),10);
 assert.equal(calc('R',op('LIMIT',lit(10),tg('I'),lit(20)),{I:25}),20);
 assert.equal(calc('R',op('LIMIT',lit(10),tg('I'),lit(20)),{I:15}),15);
 assert.equal(calc('R',op('LIMIT',lit(-5),tg('I'),lit(5)),{I:-100}),-5);
});
test('word logic: AND/OR/XOR on WORD and BYTE',()=>{
 assert.equal(calc('RW',op('AND',tg('W'),lit(0x0FF0)),{W:0xFFFF}),0x0FF0);
 assert.equal(calc('RW',op('OR',tg('W'),lit(0x00FF)),{W:0xF000}),0xF0FF);
 assert.equal(calc('RW',op('XOR',tg('W'),lit(0xFFFF)),{W:0xAAAA}),0x5555);
 assert.equal(calc('RB',op('XOR',tg('BY'),lit(0xFF)),{BY:0x0F}),0xF0);
 assert.equal(calc('RD',op('OR',tg('D'),lit(0x0000FFFF)),{D:0xFFFF0000}),0xFFFFFFFF);
});
test('word logic: AND/XOR on DWORD with bit 31 set',()=>{
 assert.equal(calc('RD',op('AND',tg('D'),lit(0xFFFF0000)),{D:0xFFFFFFFF}),0xFFFF0000);
 assert.equal(calc('RD',op('XOR',tg('D'),lit(0xFFFFFFFF)),{D:0x0F0F0F0F}),0xF0F0F0F0);
});
test('word logic: INVERT on WORD, BYTE, INT and DWORD',()=>{
 assert.equal(calc('RW',op('INVERT',tg('W')),{W:0x00FF}),0xFF00);
 assert.equal(calc('RW',op('INVERT',tg('W')),{W:0}),0xFFFF);
 assert.equal(calc('RB',op('INVERT',tg('BY')),{BY:0x0F}),0xF0);
 assert.equal(calc('R',op('INVERT',tg('I')),{I:0}),-1);
 assert.equal(calc('R',op('INVERT',tg('I')),{I:5}),-6);
 assert.equal(calc('R',op('INVERT',tg('I')),{I:-1}),0);
 assert.equal(calc('RD',op('INVERT',tg('D')),{D:0}),0xFFFFFFFF);
});
test('word logic: DECO sets bit n, ENCO returns the lowest set bit',()=>{
 assert.equal(calc('RW',op('DECO',lit(0))),1);
 assert.equal(calc('RW',op('DECO',lit(4))),16);
 assert.equal(calc('RW',op('DECO',lit(15))),0x8000);
 assert.equal(calc('RD',op('DECO',lit(31))),0x80000000);
 assert.equal(calc('R',op('ENCO',tg('W')),{W:1}),0);
 assert.equal(calc('R',op('ENCO',tg('W')),{W:0x0010}),4);
 assert.equal(calc('R',op('ENCO',tg('W')),{W:0x8000}),15);
 assert.equal(calc('R',op('ENCO',tg('W')),{W:0b101000}),3);
 assert.equal(calc('R',op('ENCO',tg('W')),{W:0}),0);
});
test('word logic: SEL picks IN0 for G=0 and IN1 for G=1 (number and BOOL tag)',()=>{
 assert.equal(calc('R',op('SEL',lit(0),lit(11),lit(22))),11);
 assert.equal(calc('R',op('SEL',lit(1),lit(11),lit(22))),22);
 const p=prog([mv('R',op('SEL',tg('A'),lit(11),lit(22)))]);assert.deepEqual(errors(p),[]);
 const rt=new Runtime(p);rt.scan(10);assert.equal(rt.memory.read('R'),11);rt.inputs.A=true;rt.scan(10);assert.equal(rt.memory.read('R'),22);
});
test('shift: SHL/SHR on WORD, BYTE, INT, DWORD incl. beyond width',()=>{
 assert.equal(calc('RW',op('SHL',tg('W'),lit(4)),{W:0x00FF}),0x0FF0);
 assert.equal(calc('RW',op('SHL',tg('W'),lit(4)),{W:0xF00F}),0x00F0);
 assert.equal(calc('RW',op('SHL',tg('W'),lit(16)),{W:0xFFFF}),0);
 assert.equal(calc('RW',op('SHL',tg('W'),lit(20)),{W:0xFFFF}),0);
 assert.equal(calc('RW',op('SHL',tg('W'),lit(0)),{W:0x1234}),0x1234);
 assert.equal(calc('RB',op('SHL',tg('BY'),lit(1)),{BY:0x81}),0x02);
 assert.equal(calc('RB',op('SHL',tg('BY'),lit(8)),{BY:0xFF}),0);
 assert.equal(calc('RW',op('SHR',tg('W'),lit(4)),{W:0xFF00}),0x0FF0);
 assert.equal(calc('RW',op('SHR',tg('W'),lit(16)),{W:0xFFFF}),0);
 assert.equal(calc('RB',op('SHR',tg('BY'),lit(9)),{BY:0xFF}),0);
 assert.equal(calc('RD',op('SHL',tg('D'),lit(31)),{D:3}),0x80000000);
 assert.equal(calc('RD',op('SHL',tg('D'),lit(32)),{D:3}),0);
 assert.equal(calc('RD',op('SHR',tg('D'),lit(24)),{D:0xFF000000}),0xFF);
 assert.equal(calc('R',op('SHL',tg('I'),lit(1)),{I:0x4000}),-32768);
 assert.equal(calc('R',op('SHR',tg('I'),lit(1)),{I:-2}),0x7FFF);
});
test('rotate: ROL/ROR wrap on WORD and BYTE',()=>{
 assert.equal(calc('RW',op('ROL',tg('W'),lit(1)),{W:0x8001}),0x0003);
 assert.equal(calc('RW',op('ROR',tg('W'),lit(1)),{W:0x0001}),0x8000);
 assert.equal(calc('RW',op('ROL',tg('W'),lit(4)),{W:0x1234}),0x2341);
 assert.equal(calc('RW',op('ROR',tg('W'),lit(4)),{W:0x1234}),0x4123);
 assert.equal(calc('RW',op('ROL',tg('W'),lit(16)),{W:0x1234}),0x1234);
 assert.equal(calc('RW',op('ROL',tg('W'),lit(17)),{W:0x8001}),0x0003);
 assert.equal(calc('RB',op('ROL',tg('BY'),lit(1)),{BY:0x81}),0x03);
 assert.equal(calc('RB',op('ROR',tg('BY'),lit(1)),{BY:0x01}),0x80);
 assert.equal(calc('RB',op('ROL',tg('BY'),lit(8)),{BY:0x5A}),0x5A);
 assert.equal(calc('RB',op('ROR',tg('BY'),lit(3)),{BY:0b00000101}),0b10100000);
 assert.equal(calc('R',op('ROL',tg('I'),lit(1)),{I:-32768}),1);
});
test('rotate: ROL/ROR on DWORD',()=>{
 assert.equal(calc('RD',op('ROL',tg('D'),lit(4)),{D:0x12345678}),0x23456781);
 assert.equal(calc('RD',op('ROR',tg('D'),lit(4)),{D:0x12345678}),0x81234567);
 assert.equal(calc('RD',op('ROL',tg('D'),lit(1)),{D:0x80000001}),3);
 assert.equal(calc('RD',op('ROL',tg('D'),lit(24)),{D:0x12345678}),0x78123456,'large rotate must not lose low bits');
 assert.equal(calc('RD',op('ROR',tg('D'),lit(8)),{D:0x12345678}),0x78123456);
});

// ---- compiler ----
test('compiler: E012 when a 3-pin op has no third operand; E013 for DIV/MOD by literal 0',()=>{
 for(const o of ['LIMIT','SEL'] as const)assert.ok(errors(prog([mv('R',op(o,lit(1),lit(2)))])).includes('E012'),o);
 assert.ok(!errors(prog([mv('R',op('LIMIT',lit(1),lit(2),lit(3)))])).includes('E012'));
 assert.ok(errors(prog([mv('R',op('MOD',lit(5),lit(0)))])).includes('E013'));
 assert.ok(errors(prog([mv('R',op('DIV',lit(5),lit(0)))])).includes('E013'));
 assert.ok(!errors(prog([mv('R',op('MOD',lit(5),lit(2)))])).includes('E013'));
});
test('runtime: MOD by a zero tag raises the divide-by-zero error',()=>{
 const rt=new Runtime(prog([mv('R',op('MOD',lit(5),tg('I')))]));assert.throws(()=>rt.scan(10));
});
test('compiler: BOOL tag is rejected as a numeric operand but allowed as SEL G',()=>{
 assert.ok(errors(prog([mv('R',op('ABS',tg('A')))])).includes('E006'));
 assert.ok(!errors(prog([mv('R',op('SEL',tg('A'),lit(1),lit(2)))])).includes('E006'));
});

// ---- bit logic ----
const rung=(id:string,children:Expr[],tagOut='Q'):Network=>net(id,and('r'+id,...children),{type:'COIL',tag:tagOut});
const run=(p:Program,steps:Array<Record<string,boolean>>)=>{const rt=new Runtime(p),out:boolean[]=[];for(const s of steps){Object.assign(rt.inputs,s);rt.scan(10);out.push(rt.memory.read('Q') as boolean);}return out;};
test('NOT inverts the RLO in the middle of a series',()=>{
 const p=prog([rung('n',[no('a','A'),{id:'x',type:'NOT'},no('b','B')])]);assert.deepEqual(errors(p),[]);
 assert.deepEqual(run(p,[{A:false,B:true},{A:true,B:true},{A:true,B:false}]),[true,false,false]);
 const q=prog([rung('n',[no('a','A'),{id:'x',type:'NOT'}])]);
 assert.deepEqual(run(q,[{A:false},{A:true}]),[true,false]);
});
test('NOT at the start of a rung inverts the power flow (always TRUE rail)',()=>{
 const p=prog([rung('n',[{id:'x',type:'NOT'}])]);assert.deepEqual(errors(p),[]);
 assert.deepEqual(run(p,[{A:false}]),[false]);
 const q=prog([rung('n',[{id:'x',type:'NOT'},no('a','A')])]);
 assert.deepEqual(run(q,[{A:true},{A:false}]),[false,false]);
});
test('double NOT cancels out',()=>{
 const p=prog([rung('n',[no('a','A'),{id:'x',type:'NOT'},{id:'y',type:'NOT'}])]);
 assert.deepEqual(run(p,[{A:true},{A:false}]),[true,false]);
});
const ff=(type:'SR'|'RS',inst='FF'):Network=>net('f',and('rf',{id:'ff1',type,instance:inst,input:no('s','A'),reset:no('r','B')}),{type:'COIL',tag:'Q'});
test('SR: set on S, reset on R1, reset dominant, state is held',()=>{
 const p=prog([ff('SR')]);assert.deepEqual(errors(p),[]);
 assert.deepEqual(run(p,[{A:false,B:false},{A:true,B:false},{A:false,B:false},{A:true,B:true},{A:true,B:false},{A:false,B:true},{A:false,B:false}]),[false,true,true,false,true,false,false]);
});
test('RS: set dominant on both inputs, reset by R only',()=>{
 // RS: input=R, reset=S1. A=R, B=S1.
 const p=prog([ff('RS')]);assert.deepEqual(errors(p),[]);
 assert.deepEqual(run(p,[{A:false,B:true},{A:false,B:false},{A:true,B:false},{A:false,B:false},{A:true,B:true},{A:true,B:false}]),[true,true,false,false,true,false]);
});
test('SR/RS write the instance bit',()=>{
 const rt=new Runtime(prog([ff('SR')]));rt.inputs.A=true;rt.scan(10);assert.equal(rt.memory.read('FF'),true);
});
test('E058: SR/RS without an instance bit',()=>{
 for(const t of ['SR','RS'] as const)for(const inst of['','  '])assert.ok(errors(prog([ff(t,inst)])).includes('E058'),t+JSON.stringify(inst));
 assert.ok(!errors(prog([ff('SR')])).includes('E058'));
});
test('SR/RS instance must be a BOOL tag',()=>{assert.ok(errors(prog([ff('SR','I')])).includes('E006'));});

// ---- parseProgram ----
test('parseProgram accepts the new calc ops, NOT, SR and RS and round-trips them',()=>{
 const ops:CalcOp[]=['MOD','NEG','ABS','MIN','MAX','LIMIT','SQR','SQRT','AND','OR','XOR','INVERT','DECO','ENCO','SEL','SHR','SHL','ROR','ROL'];
 const nets=ops.map((o,i)=>mv('R',op(o,lit(1),lit(2),lit(3))) as Network).map((n,i)=>({...n,id:'n'+i}));
 nets.push(rung('nn',[no('a','A'),{id:'x',type:'NOT'}]),ff('SR'),{...ff('RS'),id:'f2',logic:and('rf2',{id:'ff2',type:'RS',instance:'FF',input:no('s2','A'),reset:no('r2','B')})});
 const p=prog(nets);
 const parsed=parseProgram(JSON.parse(JSON.stringify(p)));
 assert.deepEqual(parsed.blocks[0].networks.map(n=>n.logic),p.blocks[0].networks.map(n=>n.logic));
 assert.deepEqual(parsed.blocks[0].networks.map(n=>n.output),p.blocks[0].networks.map(n=>n.output));
});
