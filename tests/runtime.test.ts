import {test} from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
import {execute,validated,evaluate} from '../src/challenges/evaluator';
import {Runtime} from '../src/plc/runtime';
import {Memory} from '../src/plc/memory';
import {parseProgram,compile} from '../src/plc/compiler';
import {Plant} from '../src/simulation/conveyor';
import {insert,replace,remove,moveNode} from '../src/ladder/editing';
import type {Expr} from '../src/plc/model';
for(let id=1;id<=20;id++)for(const seed of[0,1,2,3])test(`Reference ${id} / seed ${seed}`,()=>{const m=validated(id,seed);assert.ok(m.suites.every(s=>execute(m.reference,s).pass));assert.equal(evaluate(m.reference,id,seed).score,100);});
test('Seal-in missing is detected and explained',()=>{const m=material(3);const n=m.reference.blocks[0].networks[0];assert.equal(n.logic.type,'AND');if('children'in n.logic)n.logic.children[2]={id:'broken',type:'NO',tag:'START'};const r=evaluate(m.reference,3,0);assert.equal(r.passed,false);assert.ok(r.results.find(x=>x.name==='Seal-in'&&!x.pass));});
test('Wrong stop polarity fails stop and safety',()=>{const p=material(3).reference;const n=p.blocks[0].networks[0];if('children'in n.logic)n.logic.children[0]={id:'broken',type:'NO',tag:'STOP'};assert.equal(evaluate(p,3,0).passed,false);});
test('Identical input histories produce identical runtime states',()=>{const p=material(12).reference,a=new Runtime(p),b=new Runtime(p);for(let i=0;i<400;i++){a.inputs.START=b.inputs.START=i<3;a.inputs.SENSOR=b.inputs.SENSOR=i>=20;a.scan(10);b.scan(10);}assert.deepEqual(a.snapshot(),b.snapshot());});
test('Memory aliases, signed words, big endian and REAL',()=>{const mem=new Memory([{name:'W',type:'WORD',address:'%MW10',initial:0,comment:''},{name:'B',type:'BOOL',address:'%M10.0',initial:false,comment:''},{name:'I',type:'INT',address:'%MW10',initial:0,comment:''},{name:'R',type:'REAL',address:'%MD20',initial:0,comment:''}]);mem.set('W',256);assert.equal(mem.read('B'),true);mem.set('I',-1);assert.equal(mem.read('W'),65535);mem.set('R',3.25);assert.equal(mem.read('R'),3.25);assert.throws(()=>mem.set('I',40000));});
test('TON first trigger has ET=0; reset and exact boundary',()=>{const rt=new Runtime(material(7).reference);rt.inputs.START=true;rt.scan(10);assert.equal(Object.values(rt.timers)[0].et,0);for(let i=0;i<99;i++)rt.scan(10);assert.equal(rt.memory.read('MOTOR'),false);rt.scan(10);assert.equal(rt.memory.read('MOTOR'),true);rt.inputs.START=false;rt.scan(10);assert.equal(Object.values(rt.timers)[0].et,0);});
test('CTU samples once per edge and reset wins',()=>{const rt=new Runtime(material(10).reference);rt.inputs.SENSOR=true;for(let i=0;i<10;i++)rt.scan(10);assert.equal(Object.values(rt.counters)[0].cv,1);rt.inputs.RESET=true;rt.scan(10);assert.equal(Object.values(rt.counters)[0].cv,0);});
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
 const render=(long:boolean)=>{const n=structuredClone(network);if(long){n.logic.tag='A'.repeat(250);n.output.tag='Q'.repeat(250);}return renderToStaticMarkup(createElement(Rung,{network:n,tags:[{name:n.logic.tag,address:long?'%I'+'9'.repeat(200)+'.0':'%I0.0',type:'BOOL',initial:false,comment:''}],trace:{},monitor:false,locked:false,selected:'',onSelect:()=>{},onWhy:()=>{},onMove:()=>{},onTag:()=>{},onInsert:()=>{}}));};
 const conductors=(s:string)=>s.match(/<(?:line|path)\b[^>]*>/g);
 assert.deepEqual(conductors(render(false)),conductors(render(true)));
});
test('Blank exercise scaffold never displays or executes a preassigned coil',()=>{
 const n=blankNetwork();assert.equal(n.output.unassigned,true);
 const p=material(3).reference;p.blocks[0].networks=[n];assert.ok(compile(p).some(d=>d.code==='E015'));assert.throws(()=>new Runtime(p));
});
