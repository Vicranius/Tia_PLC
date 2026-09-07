import {test} from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
import {execute,validated,evaluate} from '../src/challenges/evaluator';
import {Runtime} from '../src/plc/runtime';
import {Memory} from '../src/plc/memory';
import {parseProgram,compile} from '../src/plc/compiler';
import {Plant} from '../src/simulation/conveyor';
import {find,insert,replace,remove,moveNode} from '../src/ladder/editing';
import type {Expr} from '../src/plc/model';
for(let id=1;id<=20;id++)for(const seed of[0,1,2,3])test(`Reference ${id} / seed ${seed}`,()=>{const m=validated(id,seed);assert.ok(m.suites.every(s=>execute(m.reference,s).pass));assert.equal(evaluate(m.reference,id,seed).score,100);});
test('Seal-in missing is detected and explained',()=>{const m=material(3);const n=m.reference.blocks[0].networks[0];assert.equal(n.logic.type,'AND');if('children'in n.logic)n.logic.children[2]={id:'broken',type:'NO',tag:'START'};const r=evaluate(m.reference,3,0);assert.equal(r.passed,false);assert.ok(r.results.find(x=>x.name==='Seal-in'&&!x.pass));});
test('Wrong stop polarity fails stop and safety',()=>{const p=material(3).reference;const n=p.blocks[0].networks[0];if('children'in n.logic)n.logic.children[0]={id:'broken',type:'NO',tag:'STOP'};assert.equal(evaluate(p,3,0).passed,false);});
test('Identical input histories produce identical runtime states',()=>{const p=material(12).reference,a=new Runtime(p),b=new Runtime(p);for(let i=0;i<400;i++){a.inputs.START=b.inputs.START=i<3;a.inputs.SENSOR=b.inputs.SENSOR=i>=20;a.scan(10);b.scan(10);}assert.deepEqual(a.snapshot(),b.snapshot());});
test('Memory aliases, signed words, big endian and REAL',()=>{const mem=new Memory([{name:'W',type:'WORD',address:'%MW10',initial:0,comment:''},{name:'B',type:'BOOL',address:'%M10.0',initial:false,comment:''},{name:'I',type:'INT',address:'%MW10',initial:0,comment:''},{name:'R',type:'REAL',address:'%MD20',initial:0,comment:''}]);mem.set('W',256);assert.equal(mem.read('B'),true);mem.set('I',-1);assert.equal(mem.read('W'),65535);mem.set('R',3.25);assert.equal(mem.read('R'),3.25);assert.throws(()=>mem.set('I',40000));});
test('TON first trigger has ET=0; reset and exact boundary',()=>{const rt=new Runtime(material(7).reference);rt.inputs.START=true;rt.scan(10);assert.equal(Object.values(rt.timers)[0].et,0);for(let i=0;i<99;i++)rt.scan(10);assert.equal(rt.memory.read('MOTOR'),false);rt.scan(10);assert.equal(rt.memory.read('MOTOR'),true);rt.inputs.START=false;rt.scan(10);assert.equal(Object.values(rt.timers)[0].et,0);});
test('CTU samples once per edge and reset wins',()=>{const rt=new Runtime(material(10).reference);rt.inputs.SENSOR=true;for(let i=0;i<10;i++)rt.scan(10);assert.equal(Object.values(rt.counters)[0].cv,1);rt.inputs.RESET=true;rt.scan(10);assert.equal(Object.values(rt.counters)[0].cv,0);});
test('Counter control ports support contact editing without changing the count path',()=>{
 const no=(id:string,tag:string):Expr=>({id,type:'NO',tag});
 const root:Expr={id:'counter',type:'CTUD',instance:'C1',pv:3,input:no('cu','CU'),down:no('cd','CD'),reset:no('r','RESET'),load:no('ld','LOAD')};
 const resetSeries=insert(root,'r',no('safety','SAFETY'));
 assert.ok(find(resetSeries,'safety'));assert.equal(find(resetSeries,'cu')?.id,'cu');assert.equal(find(resetSeries,'cd')?.id,'cd');assert.equal(find(resetSeries,'ld')?.id,'ld');
 const loadParallel=insert(resetSeries,'ld',no('load2','LOAD2'),true);
 assert.ok(find(loadParallel,'load2'));assert.equal(find(loadParallel,'safety')?.id,'safety');
 const renamed=replace(loadParallel,'cd',e=>({...e,tag:'DOWN_PULSE'} as Expr));
 assert.equal((find(renamed,'cd') as {tag:string}).tag,'DOWN_PULSE');
 const removed=remove(renamed,'load2');assert.equal(find(removed,'load2'),undefined);assert.ok(find(removed,'ld'));
});
test('Compiler rejects unknown tags and input writes',()=>{const p=material(3).reference;p.blocks[0].networks[0].output.tag='START';assert.ok(compile(p).some(d=>d.code==='E009'));p.blocks[0].networks[0].output.tag='MISSING';assert.ok(compile(p).some(d=>d.code==='E001'));});
test('Parser bounds malformed AST',()=>{assert.throws(()=>parseProgram({version:1,tags:[],blocks:[{id:'OB1',kind:'OB',networks:[{}]}],cpu:'1214'}));assert.throws(()=>parseProgram({...material(3).reference,tags:[{name:'A',address:'%I0.0',type:'BOOL',initial:1,comment:''}]}));});
test('Closed-loop conveyor reaches sensor and stops',()=>{const rt=new Runtime(material(11).reference),plant=new Plant();rt.inputs.START=true;for(let i=0;i<500;i++){rt.inputs.SENSOR=plant.sensor();rt.scan(10);plant.step(10,rt.outputs);}assert.equal(plant.sensor(),true);assert.equal(rt.outputs.CONVEYOR,false);});
test('STOP clears physical outputs',()=>{const rt=new Runtime(material(3).reference);rt.inputs.START=true;rt.scan(10);rt.stop();assert.equal(rt.outputs.MOTOR,false);});
test('Ribbon serial and parallel edits build a real seal-in circuit',()=>{const p=material(3).reference;let root:Expr={id:'root',type:'AND',children:[]};root=insert(root,undefined,{id:'stop',type:'NC',tag:'STOP'});root=insert(root,'stop',{id:'fault',type:'NC',tag:'OVERLOAD'});root=insert(root,'fault',{id:'start',type:'NO',tag:'START'});root=insert(root,'start',{id:'hold',type:'NO',tag:'MOTOR'},true);p.blocks[0].networks[0].logic=root;assert.equal(evaluate(p,3,0).passed,true);p.blocks[0].networks[0].logic=remove(root,'hold');assert.equal(evaluate(p,3,0).passed,false);});
test('Dragging nodes preserves a valid non-cyclic tree',()=>{const root:Expr={id:'root',type:'AND',children:[{id:'nested',type:'AND',children:[{id:'a',type:'NO',tag:'START'}]},{id:'b',type:'NC',tag:'STOP'}]};const moved=moveNode(root,'a','b');const p=material(3).reference;p.blocks[0].networks[0].logic=moved;assert.equal(compile(p).filter(d=>d.severity==='error').length,0);assert.deepEqual(moveNode(root,'nested','a'),root);});
test('OB100 executes only at startup, before OB1',()=>{const p=material(3).reference;p.blocks[1].networks=[{id:'startup',title:'Init RUN',logic:{id:'init-nc',type:'NC',tag:'STOP'},output:{type:'SET',tag:'RUN'}}];const rt=new Runtime(p);rt.scan(10);assert.equal(rt.memory.read('RUN'),true);rt.memory.set('RUN',false);rt.scan(10);assert.equal(rt.memory.read('RUN'),false);});
test('Force overrides output commit and can be released',()=>{const rt=new Runtime(material(3).reference);rt.inputs.START=true;rt.forces.MOTOR=false;rt.scan(10);assert.equal(rt.outputs.MOTOR,false);delete rt.forces.MOTOR;rt.scan(10);assert.equal(rt.outputs.MOTOR,true);});
import {layoutLogic,layoutRung} from '../src/ladder/geometry';
test('Serial layout keeps every terminal on the same axis through nested branches',()=>{const a:Expr={id:'a',type:'NO',tag:'START'},b:Expr={id:'b',type:'NC',tag:'STOP'};const tree:Expr={id:'serial',type:'AND',children:[{id:'parallel',type:'OR',children:[a,b]},{id:'timer',type:'TON',pt:1000,input:a}]};const l=layoutLogic(tree);for(const c of l.children)assert.equal(c.y+c.layout.terminalY,l.terminalY);for(let i=1;i<l.children.length;i++)assert.equal(l.children[i-1].x+l.children[i-1].layout.width,l.children[i].x);const r=layoutRung({id:'n',title:'',logic:tree,output:{type:'COIL',tag:'MOTOR'}});assert.equal(r.terminalY,r.logicY+l.terminalY);assert.ok(r.coilX>=r.logicX+l.width);});
test('Wire insertion before a selected contact preserves requested scan order',()=>{const a:Expr={id:'a',type:'NO',tag:'START'},b:Expr={id:'b',type:'NC',tag:'STOP'};const result=insert(a,a.id,b,false,true);assert.equal(result.type,'AND');if('children'in result)assert.deepEqual(result.children.map(c=>c.id),['b','a']);});
import {symbolGeometry,LAD_GRID_X,LAD_GRID_Y,type SymbolKind} from '../src/ladder/geometry';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import LadSymbol from '../src/ladder/LadSymbol';
import Rung from '../src/ladder/Rung';
import {blankNetwork} from '../src/plc/model';
import {formatTimeOperand,numericOperand,timeOperand} from '../src/ladder/inlineOperands';
const symbolKinds:SymbolKind[]=['NO','NC','P','N','COIL','SET','RESET'];
for(const kind of symbolKinds)test(`${kind}: exact cell center and equal 22px connectors at every grid position`,()=>{
 for(let col=0;col<12;col++)for(let row=0;row<8;row++){
  const x=col*LAD_GRID_X,y=row*LAD_GRID_Y,g=symbolGeometry(kind,x,y);
  assert.equal(g.cx,x+32);assert.equal(g.cy,y+24);assert.equal(g.leftWireLength,22);assert.equal(g.rightWireLength,22);
  assert.equal(g.bodyLeft+g.bodyRight,2*g.cx);
  const markup=renderToStaticMarkup(createElement(LadSymbol,{kind,x,y,incoming:'#000',outgoing:'#000'}));
  assert.match(markup,new RegExp(`data-connector="left" x1="${x}" y1="${g.cy}" x2="${g.bodyLeft}" y2="${g.cy}"`));
  assert.match(markup,new RegExp(`data-connector="right" x1="${g.bodyRight}" y1="${g.cy}" x2="${x+64}" y2="${g.cy}"`));
 }
});
test('All nested branch cell origins and bus boundaries snap to grid',()=>{
 const a:Expr={id:'a',type:'NO',tag:'A'};
 const expr:Expr={id:'o',type:'OR',children:[a,{id:'and',type:'AND',children:[{id:'edge',type:'R_TRIG',input:{...a,id:'b'}},{id:'timer',type:'TON',pt:1000,input:{...a,id:'c'}}]}]};
 const check=(l:ReturnType<typeof layoutLogic>)=>{assert.equal(l.width%64,0);assert.equal(l.height%48,0);assert.equal((l.terminalY-24)%48,0);for(const c of l.children){assert.equal(c.x%64,0);assert.equal(c.y%48,0);check(c.layout);}};check(layoutLogic(expr));
});
test('Long symbolic names and addresses cannot change any rendered electrical coordinate',()=>{
 const network={id:'n',title:'Test',logic:{id:'a',type:'NO' as const,tag:'A'},output:{type:'COIL' as const,tag:'Q'}};
 const render=(long:boolean)=>{const n=structuredClone(network);if(long){n.logic.tag='A'.repeat(250);n.output.tag='Q'.repeat(250);}return renderToStaticMarkup(createElement(Rung,{network:n,tags:[{name:n.logic.tag,address:long?'%I'+'9'.repeat(200)+'.0':'%I0.0',type:'BOOL',initial:false,comment:''}],trace:{},monitor:false,locked:false,selected:'',onSelect:()=>{},onWhy:()=>{},onMove:()=>{},onTag:()=>{},onOperand:()=>{},onInsert:()=>{}}));};
 const conductors=(s:string)=>s.match(/<(?:line|path)\b[^>]*>/g);
 assert.deepEqual(conductors(render(false)),conductors(render(true)));
});
test('Blank exercise scaffold never displays or executes a preassigned coil',()=>{
 const n=blankNetwork();assert.equal(n.output.unassigned,true);
 const p=material(3).reference;p.blocks[0].networks=[n];assert.ok(compile(p).some(d=>d.code==='E015'));assert.throws(()=>new Runtime(p));
});
import {challenge} from '../src/challenges/catalog';
test('Input behavior metadata preserves simulation semantics and round trips through parser',()=>{
 const source=material(3).reference,configured=structuredClone(source);configured.tags.forEach(t=>{if(t.address.startsWith('%I')&&t.type==='BOOL')t.inputMode='momentary';});
 const parsed=parseProgram(JSON.parse(JSON.stringify(configured)));assert.equal(parsed.tags[0].inputMode,'momentary');
 const a=new Runtime(source),b=new Runtime(parsed);for(const [tag,v] of [['START',true],['START',false],['STOP',true],['STOP',false]] as const){a.inputs[tag]=b.inputs[tag]=v;assert.deepEqual(a.scan(10).values,b.scan(10).values);}
 configured.tags[0].inputMode='invalid' as never;assert.throws(()=>parseProgram(configured));
});
test('Motor exercise starts with physical pushbuttons and staged conceptual hints',()=>{
 const c=challenge(3);assert.equal(c.tags.find(t=>t.name==='START')?.inputMode,'momentary');assert.equal(c.tags.find(t=>t.name==='OVERLOAD')?.inputMode,'toggle');
 assert.ok(!c.hints[1].includes('kendi NO kontağını'));assert.ok(c.hints[1].includes('Paralel'));
});
import {LAD_MIN_RUNG_CELLS} from '../src/ladder/geometry';
test('Empty and short rungs span nine grid cells without stretching instruction cells',()=>{
 const n=blankNetwork(),empty=layoutRung(n);assert.equal(empty.rightRailX-empty.logicX,576);assert.equal(empty.rightRailX-empty.logicX,LAD_MIN_RUNG_CELLS*LAD_GRID_X);
 n.logic={id:'contact',type:'NO',tag:'START'};n.output.unassigned=false;const occupied=layoutRung(n);assert.equal(occupied.rightRailX,empty.rightRailX);assert.equal(occupied.logic.width,64);assert.equal(occupied.coilWidth,64);assert.equal(occupied.coilX,occupied.logicX+64);
 n.logic={id:'long',type:'AND',children:Array.from({length:12},(_,i)=>({id:String(i),type:'NO',tag:'START'}))};const long=layoutRung(n);assert.equal(long.rightRailX,long.coilX+long.coilWidth);assert.equal(long.rightRailX%64,0);
});
import type {Program,Value} from '../src/plc/model';
import {booleanOutput,defaultOperationValue,logicInstruction,numericOutput} from '../src/ladder/instructionFactory';
test('New timers and counters have inert empty pins and expand only when wired',()=>{
 const tags=material(3).reference.tags;
 for(const kind of ['TON','TOF','TP','CTU','CTD','CTUD'] as const){
  const block=logicInstruction(kind,tags);assert.ok('input'in block);
  if(!('input'in block))return;
  assert.ok('children'in block.input&&block.input.children.length===0&&block.input.pin);
  const p=material(3).reference;p.blocks[0].networks[0].logic=block;
  assert.doesNotThrow(()=>parseProgram(JSON.parse(JSON.stringify(p))));
  const rt=new Runtime(p);rt.inputs.START=true;rt.scan(10);
  assert.equal(rt.trace[block.input.id].value,false);
  if('reset'in block){
   const before=layoutLogic(block);
   const wired=insert(block,block.reset.id,{id:'added-reset',type:'NO',tag:'STOP'});
   assert.ok(layoutLogic(wired).height>before.height);
   assert.equal(find(wired,'added-reset')?.id,'added-reset');
  }
 }
});
test('Every numeric operation in the Instructions pane executes with PLC operands',()=>{
 const tags:Program['tags']=[
  {name:'START',type:'BOOL',address:'%I0.0',initial:true,comment:''},
  {name:'MOTOR',type:'BOOL',address:'%Q0.0',initial:false,comment:''},
  {name:'RAW',type:'INT',address:'%IW64',initial:100,comment:''},
  {name:'WORD_IN',type:'WORD',address:'%IW66',initial:65535,comment:''},
  {name:'REAL_IN',type:'REAL',address:'%ID68',initial:2.5,comment:''},
  {name:'TEMP',type:'REAL',address:'%MD20',initial:0,comment:''},
  ...Array.from({length:8},(_,i)=>({name:`R${i}`,type:'REAL' as const,address:`%MD${100+i*4}`,initial:0,comment:''})),
  {name:'I0',type:'INT',address:'%MW200',initial:0,comment:''},
  {name:'I1',type:'INT',address:'%MW202',initial:0,comment:''},
 ];
 const lit=(value:number):Value=>({kind:'literal',value}),tag=(name:string):Value=>({kind:'tag',tag:name}),calc=(op:Extract<Value,{kind:'calc'}>['op'],a:Value,b:Value,c?:Value):Value=>({kind:'calc',op,a,b,...(c?{c}:{})});
 const values:[string,Value][]=[
  ['R0',tag('RAW')],['R1',calc('ADD',tag('RAW'),lit(5))],['R2',calc('SUB',tag('RAW'),lit(5))],['R3',calc('MUL',tag('RAW'),lit(2))],['R4',calc('DIV',tag('RAW'),lit(4))],['R5',calc('INT_TO_REAL',tag('RAW'),lit(0))],['I0',calc('REAL_TO_INT',tag('REAL_IN'),lit(0))],['I1',calc('WORD_TO_INT',tag('WORD_IN'),lit(0))],['R6',calc('NORM_X',lit(0),tag('RAW'),lit(200))],['R7',calc('SCALE_X',lit(0),lit(.5),lit(150))],
 ];
 const program:Program={version:1,cpu:'CPU 1214C',tags,blocks:[{id:'OB1',kind:'OB',networks:values.map(([target,value],i)=>({id:`n${i}`,title:`op${i}`,logic:{id:`e${i}`,type:'NO',tag:'START'},output:{type:'MOVE',tag:target,value}}))}]};
 assert.deepEqual(compile(program).filter(d=>d.severity==='error'),[]);const rt=new Runtime(program);rt.scan(10);
 assert.deepEqual(['R0','R1','R2','R3','R4','R5','I0','I1','R6','R7'].map(name=>rt.memory.read(name)),[100,105,95,200,25,100,2,-1,.5,75]);
});
test('Instruction factory creates usable TIA-style defaults for every catalog group',()=>{
 const tags=material(3).reference.tags,current={type:'MOVE' as const,tag:'TEMP',value:{kind:'tag' as const,tag:'RAW'}};
 for(const kind of ['MOVE','ADD','SUB','MUL','DIV','INT_TO_REAL','REAL_TO_INT','WORD_TO_INT','NORM_X','SCALE_X'] as const){const output=numericOutput(kind,tags,current);assert.equal(output.type,'MOVE');assert.equal(output.tag,'TEMP');assert.ok(output.value);}
 const scale=defaultOperationValue('SCALE_X',tags);assert.equal(scale.kind,'calc');if(scale.kind==='calc'){assert.equal(scale.op,'SCALE_X');assert.ok(scale.c);assert.equal(scale.b.kind,'calc');}
 for(const kind of ['COIL','SET','RESET'] as const)assert.equal(booleanOutput(kind,tags,current).tag,'MOTOR');
 for(const kind of ['NO','NC','R_TRIG','F_TRIG','TON','TOF','TP','CTU'] as const)assert.equal(logicInstruction(kind,tags).type,kind);
 for(const op of ['==','<>','>=','<=','>','<'] as const){const expr=logicInstruction('COMPARE',tags,op);assert.equal(expr.type,'COMPARE');if(expr.type==='COMPARE')assert.equal(expr.op,op);}
});
test('Compile catches invalid operation operands before RUN',()=>{
 const p=material(18).reference,n=p.blocks[0].networks[0];n.output.value={kind:'calc',op:'DIV',a:{kind:'tag',tag:'RAW'},b:{kind:'literal',value:0}};assert.ok(compile(p).some(d=>d.code==='E013'));
 n.output.value={kind:'calc',op:'NORM_X',a:{kind:'literal',value:0},b:{kind:'tag',tag:'RAW'}};assert.ok(compile(p).some(d=>d.code==='E012'));
});
test('CTU, CTD and CTUD expose instance outputs as real contact operands',()=>{
 const tags:Program['tags']=[
  {name:'CU',type:'BOOL',address:'%I0.0',initial:false,comment:''},{name:'CD',type:'BOOL',address:'%I0.1',initial:false,comment:''},{name:'R',type:'BOOL',address:'%I0.2',initial:false,comment:''},{name:'LD',type:'BOOL',address:'%I0.3',initial:false,comment:''},{name:'PV',type:'DINT',address:'%MD10',initial:3,comment:''},
  ...['UP_BLOCK','UP_Q','DOWN_BLOCK','DOWN_Q','BOTH_BLOCK','BOTH_QU','BOTH_QD'].map((name,i)=>({name,type:'BOOL' as const,address:`%Q0.${i}`,initial:false,comment:''})),
 ];
 const no=(id:string,tag:string):Expr=>({id,type:'NO',tag}),pv:Value={kind:'tag',tag:'PV'};
 const program:Program={version:1,cpu:'CPU 1214C',tags,blocks:[{id:'OB1',kind:'OB',networks:[
  {id:'up-block',title:'CTU',logic:{id:'up',type:'CTU',instance:'CountUp',pv,input:no('up-cu','CU'),reset:no('up-r','R')},output:{type:'COIL',tag:'UP_BLOCK'}},
  {id:'up-q',title:'CTU Q',logic:no('up-q-contact','CountUp.Q'),output:{type:'COIL',tag:'UP_Q'}},
  {id:'down-block',title:'CTD',logic:{id:'down',type:'CTD',instance:'CountDown',pv,input:no('down-cd','CD'),load:no('down-ld','LD')},output:{type:'COIL',tag:'DOWN_BLOCK'}},
  {id:'down-q',title:'CTD Q',logic:no('down-q-contact','CountDown.Q'),output:{type:'COIL',tag:'DOWN_Q'}},
  {id:'both-block',title:'CTUD',logic:{id:'both',type:'CTUD',instance:'CountBoth',pv,input:no('both-cu','CU'),down:no('both-cd','CD'),reset:no('both-r','R'),load:no('both-ld','LD')},output:{type:'COIL',tag:'BOTH_BLOCK'}},
  {id:'both-qu',title:'CTUD QU',logic:no('both-qu-contact','CountBoth.QU'),output:{type:'COIL',tag:'BOTH_QU'}},
  {id:'both-qd',title:'CTUD QD',logic:no('both-qd-contact','CountBoth.QD'),output:{type:'COIL',tag:'BOTH_QD'}},
 ]}]};
 assert.deepEqual(compile(program).filter(d=>d.severity==='error'),[]);const rt=new Runtime(program);
 rt.inputs.LD=true;rt.inputs.R=true;rt.scan(10);assert.equal(rt.counters.CountDown.cv,3);rt.inputs.LD=false;rt.inputs.R=false;
 for(let i=0;i<3;i++){rt.inputs.CU=true;rt.inputs.CD=true;rt.scan(10);rt.inputs.CU=false;rt.inputs.CD=false;rt.scan(10);}
 assert.equal(rt.outputs.UP_Q,true);assert.equal(rt.outputs.DOWN_Q,true);assert.equal(rt.outputs.BOTH_QU,false);assert.equal(rt.outputs.BOTH_QD,true);
 rt.inputs.R=true;rt.scan(10);rt.inputs.R=false;for(let i=0;i<3;i++){rt.inputs.CU=true;rt.scan(10);rt.inputs.CU=false;rt.scan(10);}assert.equal(rt.outputs.BOTH_QU,true);assert.equal(rt.outputs.BOTH_QD,false);
 rt.inputs.CD=true;rt.scan(10);rt.inputs.CD=false;rt.scan(10);assert.equal(rt.outputs.BOTH_QU,false);
});
test('Counter factory creates all IEC counter types with selectable PV operands',()=>{
 const tags=material(3).reference.tags;
 for(const kind of ['CTU','CTD','CTUD'] as const){const counter=logicInstruction(kind,tags);assert.equal(counter.type,kind);if('pv'in counter){assert.equal(typeof counter.instance,'string');assert.equal(typeof counter.pv,'object');}}
 const counter=logicInstruction('CTUD',tags);assert.ok('down'in counter&&'load'in counter&&'reset'in counter);
});
test('TON accepts a TIME tag for PT and exposes instance Q and ET operands',()=>{
 const tags:Program['tags']=[
  {name:'ENABLE',type:'BOOL',address:'%I0.0',initial:false,comment:''},{name:'DELAY',type:'TIME',address:'%MD0',initial:30,comment:''},{name:'TIMER_BLOCK',type:'BOOL',address:'%Q0.0',initial:false,comment:''},{name:'DONE',type:'BOOL',address:'%Q0.1',initial:false,comment:''},{name:'ELAPSED',type:'DINT',address:'%MD4',initial:0,comment:''},
 ];
 const program:Program={version:1,cpu:'CPU 1214C',tags,blocks:[{id:'OB1',kind:'OB',networks:[
  {id:'timer',title:'TON',logic:{id:'ton',type:'TON',instance:'DelayTimer',pt:{kind:'tag',tag:'DELAY'},input:{id:'enable',type:'NO',tag:'ENABLE'}},output:{type:'COIL',tag:'TIMER_BLOCK'}},
  {id:'q',title:'Q contact',logic:{id:'q-contact',type:'NO',tag:'DelayTimer.Q'},output:{type:'COIL',tag:'DONE'}},
  {id:'et',title:'ET move',logic:{id:'always',type:'NC',tag:'DONE'},output:{type:'MOVE',tag:'ELAPSED',value:{kind:'tag',tag:'DelayTimer.ET'}}},
 ]}]};
 assert.deepEqual(compile(program).filter(d=>d.severity==='error'),[]);assert.doesNotThrow(()=>parseProgram(JSON.parse(JSON.stringify(program))));const rt=new Runtime(program);rt.inputs.ENABLE=true;
 for(let i=0;i<4;i++)rt.scan(10);assert.equal(rt.outputs.DONE,true);assert.equal(rt.timers.DelayTimer.et,30);rt.inputs.ENABLE=false;rt.scan(10);assert.equal(rt.outputs.DONE,false);assert.equal(rt.timers.DelayTimer.et,0);
});
test('Timer factory assigns editable IEC instances and PT operand objects',()=>{
 const tags=material(3).reference.tags;for(const kind of ['TON','TOF','TP'] as const){const timer=logicInstruction(kind,tags);assert.equal(timer.type,kind);if('pt'in timer){assert.equal(typeof timer.instance,'string');assert.equal(typeof timer.pt,'object');}}
});
test('TIA-style inline operands parse TIME literals, numeric literals and tags',()=>{
 assert.deepEqual(timeOperand('T#1m_30s'),{kind:'literal',value:90000});
 assert.deepEqual(timeOperand('T#500ms'),{kind:'literal',value:500});
 assert.deepEqual(timeOperand('DELAY'),{kind:'tag',tag:'DELAY'});
 assert.deepEqual(numericOperand('12'),{kind:'literal',value:12});
 assert.deepEqual(numericOperand('COUNT_LIMIT'),{kind:'tag',tag:'COUNT_LIMIT'});
 assert.equal(formatTimeOperand(timeOperand('T#3s')), 'T#3000ms');
});
test('Timer ET and counter CV pins can write to assigned PLC tags',()=>{
 const tags:Program['tags']=[
  {name:'ENABLE',type:'BOOL',address:'%I0.0',initial:true,comment:''},
  {name:'CU',type:'BOOL',address:'%I0.1',initial:false,comment:''},
  {name:'R',type:'BOOL',address:'%I0.2',initial:false,comment:''},
  {name:'ET_VALUE',type:'TIME',address:'%MD0',initial:0,comment:''},
  {name:'CV_VALUE',type:'DINT',address:'%MD4',initial:0,comment:''},
  {name:'TQ',type:'BOOL',address:'%Q0.0',initial:false,comment:''},
  {name:'CQ',type:'BOOL',address:'%Q0.1',initial:false,comment:''},
 ];
 const program:Program={version:1,cpu:'CPU 1214C',tags,blocks:[{id:'OB1',kind:'OB',networks:[
  {id:'timer-map',title:'Timer',logic:{id:'tm',type:'TON',instance:'T1',pt:30,etTag:'ET_VALUE',input:{id:'en',type:'NO',tag:'ENABLE'}},output:{type:'COIL',tag:'TQ'}},
  {id:'counter-map',title:'Counter',logic:{id:'ct',type:'CTU',instance:'C1',pv:3,cvTag:'CV_VALUE',input:{id:'cu',type:'NO',tag:'CU'},reset:{id:'reset',type:'NO',tag:'R'}},output:{type:'COIL',tag:'CQ'}},
 ]}]};
 assert.deepEqual(compile(program).filter(d=>d.severity==='error'),[]);
 assert.doesNotThrow(()=>parseProgram(JSON.parse(JSON.stringify(program))));
 const rt=new Runtime(program);rt.inputs.ENABLE=true;rt.scan(10);rt.scan(10);assert.equal(rt.memory.read('ET_VALUE'),10);
 rt.inputs.CU=true;rt.scan(10);assert.equal(rt.memory.read('CV_VALUE'),1);
});
test('Timer and counter blocks expose double-click operand targets',()=>{
 const tags=material(3).reference.tags;
 const timer={id:'n',title:'Timer',logic:{id:'t',type:'TON' as const,instance:'T1',pt:1000,input:{id:'a',type:'NO' as const,tag:'START'}},output:{type:'COIL' as const,tag:'MOTOR'}};
 const markup=renderToStaticMarkup(createElement(Rung,{network:timer,tags,trace:{},monitor:false,locked:false,selected:'',onSelect:()=>{},onWhy:()=>{},onMove:()=>{},onTag:()=>{},onOperand:()=>{},onInsert:()=>{}}));
 assert.match(markup,/aria-label="PT operandını düzenle"/);assert.match(markup,/aria-label="ET çıkış tagini düzenle"/);
});
