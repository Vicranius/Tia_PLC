import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectBranch} from '../src/plc/connections';
import {compile,parseProgram} from '../src/plc/compiler';
import {Runtime} from '../src/plc/runtime';
import {type Program,type Network} from '../src/plc/model';
import {replace} from '../src/ladder/editing';

const setup=():Program=>({version:1,cpu:'CPU 1214C',tags:[
 {name:'GATE',type:'BOOL',address:'%I0.0',initial:false,comment:''},
 {name:'RESET',type:'BOOL',address:'%I0.1',initial:true,comment:''},
 {name:'UP',type:'BOOL',address:'%I0.2',initial:false,comment:''},
 {name:'OUT',type:'BOOL',address:'%Q0.0',initial:false,comment:''}
],blocks:[{id:'OB1',kind:'OB',networks:[{id:'n',title:'Connected reset',logic:{id:'root',type:'AND',children:[
 {id:'gate',type:'NO',tag:'GATE'},
 {id:'ct',type:'CTU',instance:'Counter_1',pv:3,input:{id:'up',type:'NO',tag:'UP'},reset:{id:'reset',type:'NO',tag:'RESET'}}
]},output:{type:'COIL',tag:'OUT'}}]}]});
test('Connected R reads the branch signal, preserves contacts and follows source edits',()=>{
 const p=setup();let n=p.blocks[0].networks[0];n=connectBranch(n,{block:'ct',pin:'reset',source:'gate',side:'after'});p.blocks[0].networks[0]=n;
 const rt=new Runtime(p);rt.counters.Counter_1={cv:2,q:false,qu:false,qd:false,previous:false,previousDown:false};rt.scan(10);
 assert.equal(rt.counters.Counter_1.cv,2,'RESET contact alone cannot bypass the connected branch');
 rt.inputs.GATE=true;rt.scan(10);assert.equal(rt.counters.Counter_1.cv,0);
 assert.equal(n.logic.type,'AND');assert.equal(n.connections?.length,1);
 p.blocks[0].networks[0]={...n,logic:replace(n.logic,'gate',e=>({id:e.id,type:'NC',tag:'GATE'}))};
 const edited=new Runtime(p);edited.counters.Counter_1={cv:2,q:false,qu:false,qd:false,previous:false,previousDown:false};edited.scan(10);assert.equal(edited.counters.Counter_1.cv,0,'Source edits propagate without cloned contacts');
 assert.deepEqual(parseProgram(JSON.parse(JSON.stringify(p))),p);
});
test('Before/after branch terminals carry different signals; rail is explicitly supported',()=>{
 for(const [source,side,expected] of [['gate','before',0],['gate','after',2],['$rail','before',0]] as const){
 const p=setup();p.blocks[0].networks[0]=connectBranch(p.blocks[0].networks[0],{block:'ct',pin:'reset',source,side});
 const rt=new Runtime(p);rt.counters.Counter_1={cv:2,q:false,qu:false,qd:false,previous:false,previousDown:false};rt.scan(10);assert.equal(rt.counters.Counter_1.cv,expected);
 }
});
test('Connections reject feedback, deleted sources and malformed imports',()=>{
 const p=setup(),n=p.blocks[0].networks[0];
 for(const source of ['reset','ct','missing'])assert.throws(()=>connectBranch(n,{block:'ct',pin:'reset',source,side:'after'}));
 p.blocks[0].networks[0]={...n,connections:[{block:'ct',pin:'reset',source:'missing',side:'after'}]};assert.ok(compile(p).some(d=>d.code==='E041'));assert.throws(()=>new Runtime(p));
 const bad=JSON.parse(JSON.stringify(p));bad.blocks[0].networks[0].connections[0].pin='pv';assert.throws(()=>parseProgram(bad));
});
test('A connected empty R pin conducts its source and reconnect replaces its old source',()=>{
 const p=setup();let n:Network={...p.blocks[0].networks[0],logic:replace(p.blocks[0].networks[0].logic,'reset',()=>({id:'reset',type:'AND',pin:true,children:[]}))};
 n=connectBranch(n,{block:'ct',pin:'reset',source:'gate',side:'after'});n=connectBranch(n,{block:'ct',pin:'reset',source:'$rail',side:'before'});assert.equal(n.connections?.length,1);p.blocks[0].networks[0]=n;
 const rt=new Runtime(p);rt.counters.Counter_1={cv:2,q:false,qu:false,qd:false,previous:false,previousDown:false};rt.scan(10);assert.equal(rt.counters.Counter_1.cv,0);
});
