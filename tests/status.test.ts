import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Rung from '../src/ladder/Rung';
import LadSymbol from '../src/ladder/LadSymbol';
import {layoutRung,LAD_GRID_X} from '../src/ladder/geometry';
import {LAD_STATUS_COLOR,LAD_STATUS_DASH,flowStatus,statusDash,type FlowStatus} from '../src/ladder/status';
import {material} from '../src/challenges/private';
import {connectBranch} from '../src/plc/connections';
import {Runtime} from '../src/plc/runtime';
import type {Network,Program,Tag,Trace} from '../src/plc/model';

const network:Network={id:'n1',title:'Status',logic:{id:'and',type:'AND',children:[{id:'a',type:'NO',tag:'A'},{id:'b',type:'NO',tag:'B'}]},output:{type:'COIL',tag:'Q'}};
const tags=['A','B','Q'].map((name,i)=>({name,type:'BOOL' as const,address:i<2?`%I0.${i}`:'%Q0.0',initial:false,comment:''}));
const draw=(network:Network,tags:Tag[],trace:Record<string,Trace>,monitor=true)=>renderToStaticMarkup(createElement(Rung,{network,tags,trace,monitor,locked:false,selected:'',onSelect:()=>{},onWhy:()=>{},onMove:()=>{},onTag:()=>{},onOperand:()=>{},onInsert:()=>{}}));
const render=(trace:Record<string,Trace>,monitor=true)=>draw(network,tags,trace,monitor);

test('TIA program status maps to fulfilled, not fulfilled and unknown',()=>{
 assert.equal(flowStatus(false,true,true),'edit');
 assert.equal(flowStatus(true,false,true),'unknown');
 assert.equal(flowStatus(true,true,true),'fulfilled');
 assert.equal(flowStatus(true,true,false),'unfulfilled');
 assert.equal(statusDash('unfulfilled'),LAD_STATUS_DASH);
 assert.equal(statusDash('fulfilled'),undefined);
});

test('Monitored rung draws green solid power flow and blue dashed interruption',()=>{
 const html=render({n1:{value:false,detail:''},a:{value:true,incoming:true,signal:true,detail:''},b:{value:false,incoming:true,signal:false,detail:''}});
 assert.ok(html.includes(`stroke="${LAD_STATUS_COLOR.fulfilled}"`),'A is fulfilled and must be green');
 assert.ok(html.includes(`stroke="${LAD_STATUS_COLOR.unfulfilled}"`),'B blocks the path and must be blue');
 assert.ok(html.includes(`stroke-dasharray="${LAD_STATUS_DASH}"`),'not fulfilled lines are dashed');
});

test('Network missing from the last scan trace is shown as not executed',()=>{
 const html=render({other:{value:true,detail:''}});
 assert.ok(html.includes(`stroke="${LAD_STATUS_COLOR.unknown}"`));
 assert.ok(!html.includes(`stroke="${LAD_STATUS_COLOR.fulfilled}"`));
 assert.ok(!html.includes('stroke-dasharray'));
});

test('Offline editing view has no status colors or dashes',()=>{
 const html=render({n1:{value:true,detail:''},a:{value:true,detail:''},b:{value:true,detail:''}},false);
 assert.ok(html.includes(`stroke="${LAD_STATUS_COLOR.edit}"`));
 assert.ok(!html.includes(`stroke="${LAD_STATUS_COLOR.fulfilled}"`));
 assert.ok(!html.includes('stroke-dasharray'));
});

// Helpers that read the rendered SVG back as TIA status names; color and dash must always agree.
const attr=(tag:string,name:string)=>new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1];
const stat=(tag:string):FlowStatus=>{const stroke=attr(tag,'stroke'),s=(Object.keys(LAD_STATUS_COLOR) as FlowStatus[]).find(k=>LAD_STATUS_COLOR[k]===stroke);assert.ok(s,`unexpected stroke ${stroke}`);assert.equal(attr(tag,'stroke-dasharray'),statusDash(s),`dash must match ${s}`);return s;};
const symbol=(html:string,from:string)=>{const at=html.indexOf(from);assert.ok(at>=0,`missing ${from}`);const [l,r]=[...(/<g data-lad-symbol[^>]*>.*?<\/g>/.exec(html.slice(at))![0]).matchAll(/<line[^>]*>/g)].map(m=>stat(m[0]));return {in:l,out:r};};
const contact=(html:string,id:string)=>symbol(html,`data-expr-id="${id}"`),coil=(html:string)=>symbol(html,'<g data-lad-symbol="COIL"');
const wires=(html:string)=>[...html.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*>/g)].map(m=>({x1:+m[1],y1:+m[2],x2:+m[3],y2:+m[4],status:stat(m[0])}));
const wireAt=(html:string,x1:number,y1:number)=>{const w=wires(html).find(w=>w.x1===x1&&w.y1===y1);assert.ok(w,`no wire at ${x1},${y1}`);return w.status;};
const bars=(html:string,n:Network)=>{const L=layoutRung(n);return wires(html).filter(w=>w.x1===w.x2&&w.y2>w.y1&&w.x1>L.logicX&&w.x1<L.coilX).map(w=>w.status);};
const lowerRow=(html:string,n:Network)=>new Set(wires(html).filter(w=>w.y1===w.y2&&w.y1>layoutRung(n).terminalY).map(w=>w.status));
const first=(p:Program)=>p.blocks[0].networks[0],look=(rt:Runtime,n=first(rt.program))=>draw(n,rt.program.tags,rt.trace);
const scan=(rt:Runtime,inputs:Record<string,boolean>,count=1)=>{Object.assign(rt.inputs,inputs);for(let i=0;i<count;i++)rt.scan(10);return rt;};

test('Every online/executed/powered combination maps to exactly one status and only unfulfilled is dashed',()=>{
 assert.deepEqual(LAD_STATUS_COLOR,{edit:'#202A33',fulfilled:'#13a538',unfulfilled:'#1f5fd6',unknown:'#9a9ea6'});assert.equal(LAD_STATUS_DASH,'4 3');
 for(const executed of[false,true])for(const powered of[false,true])assert.equal(flowStatus(false,executed,powered),'edit');
 for(const powered of[false,true])assert.equal(flowStatus(true,false,powered),'unknown');
 for(const s of Object.keys(LAD_STATUS_COLOR) as FlowStatus[])assert.equal(statusDash(s),s==='unfulfilled'?'4 3':undefined);
});

test('Monitor on with an empty trace is still the offline black view',()=>{
 const html=render({},true);
 assert.ok(html.includes(`stroke="${LAD_STATUS_COLOR.edit}"`));
 for(const s of['fulfilled','unfulfilled','unknown'] as const)assert.ok(!html.includes(`stroke="${LAD_STATUS_COLOR[s]}"`));
 assert.ok(!html.includes('stroke-dasharray'));
});

test('LadSymbol dashes only the connector it is told to and never the symbol body',()=>{
 const html=(extra:object)=>renderToStaticMarkup(createElement(LadSymbol,{kind:'NO',x:0,y:0,incoming:'#13a538',outgoing:'#1f5fd6',...extra}));
 const none=html({}),both=html({incomingDash:'4 3',outgoingDash:'4 3'}),right=html({outgoingDash:'4 3'});
 assert.ok(!none.includes('stroke-dasharray'),'omitted dash props stay solid (backwards compatible)');
 assert.equal(both.match(/stroke-dasharray="4 3"/g)?.length,2);
 const [l,r]=[...right.matchAll(/<line[^>]*>/g)].map(m=>m[0]);assert.ok(!l.includes('stroke-dasharray'));assert.ok(r.includes('stroke-dasharray="4 3"'));
 assert.ok(![...both.matchAll(/<path[^>]*>/g)].some(m=>m[0].includes('stroke-dasharray')),'body paths are solid');
});

test('Real runtime motor seal-in: START path green, open seal-in branch blue dashed',()=>{
 const rt=scan(new Runtime(material(3).reference),{START:true}),n=first(rt.program),html=look(rt);
 assert.deepEqual(contact(html,'ref-3-1'),{in:'fulfilled',out:'fulfilled'},'STOP NC is closed');
 assert.deepEqual(contact(html,'ref-3-2'),{in:'fulfilled',out:'fulfilled'},'OVERLOAD NC is closed');
 assert.deepEqual(contact(html,'ref-3-3'),{in:'fulfilled',out:'fulfilled'},'START pressed');
 assert.deepEqual(contact(html,'ref-3-4'),{in:'fulfilled',out:'unfulfilled'},'seal-in MOTOR contact not yet closed: OR path A fulfilled, path B not');
 assert.deepEqual(bars(html,n),['fulfilled','fulfilled'],'both OR rails carry power through the START path');
 assert.deepEqual(lowerRow(html,n),new Set(['fulfilled','unfulfilled']),'power reaches the seal-in contact and stops there');
 assert.deepEqual(coil(html),{in:'fulfilled',out:'fulfilled'});
});

test('Real runtime motor seal-in: after START is released the seal-in contact carries the current',()=>{
 const rt=new Runtime(material(3).reference);scan(rt,{START:true});scan(rt,{START:false});const n=first(rt.program),html=look(rt);
 assert.equal(rt.memory.read('MOTOR'),true);
 assert.deepEqual(contact(html,'ref-3-3'),{in:'fulfilled',out:'unfulfilled'},'released START is now the open branch');
 assert.deepEqual(contact(html,'ref-3-4'),{in:'fulfilled',out:'fulfilled'},'seal-in holds');
 assert.deepEqual(bars(html,n),['fulfilled','fulfilled']);assert.deepEqual(lowerRow(html,n),new Set(['fulfilled']));
 assert.deepEqual(coil(html),{in:'fulfilled',out:'fulfilled'});
});

test('Real runtime motor seal-in: idle rung is blue dashed after the closed NC contacts, STOP breaks it again',()=>{
 const rt=scan(new Runtime(material(3).reference),{}),n=first(rt.program);let html=look(rt);
 assert.deepEqual(contact(html,'ref-3-1'),{in:'fulfilled',out:'fulfilled'});assert.deepEqual(contact(html,'ref-3-2'),{in:'fulfilled',out:'fulfilled'});
 assert.deepEqual(contact(html,'ref-3-3'),{in:'fulfilled',out:'unfulfilled'});assert.deepEqual(contact(html,'ref-3-4'),{in:'fulfilled',out:'unfulfilled'});
 assert.deepEqual(bars(html,n),['fulfilled','unfulfilled'],'power enters the OR but nothing leaves it');assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});
 scan(rt,{START:true});scan(rt,{START:false});scan(rt,{STOP:true});html=look(rt);
 assert.equal(rt.memory.read('MOTOR'),false);
 assert.deepEqual(contact(html,'ref-3-1'),{in:'fulfilled',out:'unfulfilled'},'pressed STOP opens its NC contact');
 assert.deepEqual(contact(html,'ref-3-2'),{in:'unfulfilled',out:'unfulfilled'});assert.deepEqual(contact(html,'ref-3-4'),{in:'unfulfilled',out:'unfulfilled'});
 assert.deepEqual(new Set(bars(html,n)),new Set(['unfulfilled']));assert.deepEqual(lowerRow(html,n),new Set(['unfulfilled']));assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});
});

test('Real runtime TON: IN wire is green while ET runs, output wire and coil turn green at ET=PT',()=>{
 const rt=scan(new Runtime(material(7).reference),{START:true}),n=first(rt.program),L=layoutRung(n),t=L.logic,c=t.children[0];
 const inWire=(h:string)=>wireAt(h,L.logicX+c.x+c.layout.width,L.logicY+c.y+c.layout.terminalY),outWire=(h:string)=>wireAt(h,L.logicX+t.width-16,L.logicY+t.terminalY);
 let html=look(rt);
 assert.deepEqual(contact(html,'ref-7-1'),{in:'fulfilled',out:'fulfilled'});assert.deepEqual(contact(html,'ref-7-2'),{in:'fulfilled',out:'fulfilled'});
 assert.equal(inWire(html),'fulfilled','TON IN has power');assert.equal(outWire(html),'unfulfilled','ET < PT so Q is not fulfilled');assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});
 assert.ok(html.includes('rung-block-state">ET=T#0ms'));
 scan(rt,{},100);html=look(rt);assert.equal(rt.memory.read('MOTOR'),true);
 assert.equal(inWire(html),'fulfilled');assert.equal(outWire(html),'fulfilled','ET reached PT');assert.deepEqual(coil(html),{in:'fulfilled',out:'fulfilled'});
 scan(rt,{START:false});html=look(rt);
 assert.equal(inWire(html),'unfulfilled','IN lost power');assert.equal(outWire(html),'unfulfilled');assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});
 assert.deepEqual(contact(html,'ref-7-1'),{in:'fulfilled',out:'unfulfilled'});
});

test('Real runtime CTU: CU and R pin wires follow their own signals and Q colors the coil',()=>{
 const rt=new Runtime(material(10).reference),n=first(rt.program),L=layoutRung(n),t=L.logic,pin=(port:string)=>{const c=t.children.find(c=>c.port===port)!;return (h:string)=>wireAt(h,L.logicX+c.x+c.layout.width,L.logicY+c.y+c.layout.terminalY);};
 const cu=pin('CU'),r=pin('R'),out=(h:string)=>wireAt(h,L.logicX+t.width-16,L.logicY+t.terminalY);
 let html=look(scan(rt,{SENSOR:true}));
 assert.equal(cu(html),'fulfilled','SENSOR drives CU');assert.equal(r(html),'unfulfilled','RESET not pressed');assert.equal(out(html),'unfulfilled','CV=1 < PV=3');
 assert.deepEqual(contact(html,'ref-10-3'),{in:'fulfilled',out:'unfulfilled'},'R contact is open');assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});assert.ok(html.includes('rung-block-state">CV=1'));
 for(let i=0;i<2;i++){scan(rt,{SENSOR:false});html=look(scan(rt,{SENSOR:true}));}
 assert.equal(rt.counters[Object.keys(rt.counters)[0]].cv,3);assert.equal(out(html),'fulfilled','CV reached PV');assert.deepEqual(coil(html),{in:'fulfilled',out:'fulfilled'});
 html=look(scan(rt,{RESET:true}));
 assert.equal(r(html),'fulfilled','RESET pressed');assert.deepEqual(contact(html,'ref-10-3'),{in:'fulfilled',out:'fulfilled'});assert.equal(out(html),'unfulfilled','reset clears Q');assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'});
});

test('Branch connection path to a counter pin follows its source signal',()=>{
 const base=():Program=>({version:1,cpu:'CPU 1214C',tags:[{name:'GATE',type:'BOOL',address:'%I0.0',initial:false,comment:''},{name:'RESET',type:'BOOL',address:'%I0.1',initial:true,comment:''},{name:'UP',type:'BOOL',address:'%I0.2',initial:false,comment:''},{name:'OUT',type:'BOOL',address:'%Q0.0',initial:false,comment:''}],blocks:[{id:'OB1',kind:'OB',networks:[{id:'n',title:'Connected reset',logic:{id:'root',type:'AND',children:[{id:'gate',type:'NO',tag:'GATE'},{id:'ct',type:'CTU',instance:'Counter_1',pv:3,input:{id:'up',type:'NO',tag:'UP'},reset:{id:'reset',type:'NO',tag:'RESET'}}]},output:{type:'COIL',tag:'OUT'}}]}]});
 const path=(html:string)=>{const m=/<path data-branch-connection="ct:reset"[^>]*>/.exec(html);assert.ok(m,'connection path rendered');return stat(m[0]);};
 const wired=(source:string,side:'before'|'after')=>{const p=base();p.blocks[0].networks[0]=connectBranch(first(p),{block:'ct',pin:'reset',source,side});return new Runtime(p);};
 const after=wired('gate','after');
 assert.equal(path(look(scan(after,{GATE:false}))),'unfulfilled','source contact open: blue dashed connection');
 assert.equal(path(look(scan(after,{GATE:true}))),'fulfilled','source contact closed: green connection');
 const rail=wired('$rail','before');assert.equal(path(look(scan(rail,{GATE:false}))),'fulfilled','left power rail feeds the pin even when GATE is open');
});

test('A network that ran at startup (OB100) turns gray once it is no longer executed',()=>{
 const p=material(3).reference;p.blocks[1].networks=[{id:'startup',title:'Init RUN',logic:{id:'init-nc',type:'NC',tag:'STOP'},output:{type:'SET',tag:'RUN'}}];
 const rt=new Runtime(p),init=p.blocks[1].networks[0],main=first(p);scan(rt,{});
 let html=draw(init,p.tags,rt.trace);assert.deepEqual(contact(html,'init-nc'),{in:'fulfilled',out:'fulfilled'},'executed on the first scan');
 scan(rt,{});html=draw(init,p.tags,rt.trace);
 assert.deepEqual(contact(html,'init-nc'),{in:'unknown',out:'unknown'},'OB100 is not executed on later scans');assert.ok(!html.includes('stroke-dasharray'));
 assert.ok(!wires(html).some(w=>w.status==='fulfilled'||w.status==='unfulfilled'));
 assert.ok(wires(draw(main,p.tags,rt.trace)).every(w=>w.status!=='unknown'),'OB1 network keeps its live colors');
});

// The left power rail is the power source: green whenever the network ran, regardless of the rung result.
const rail=(html:string,n:Network)=>{const v=wires(html).find(w=>w.x1===LAD_GRID_X&&w.x2===LAD_GRID_X&&w.y2>w.y1);assert.ok(v,'left rail line');return {rail:v.status,feed:wireAt(html,LAD_GRID_X,layoutRung(n).terminalY)};};

test('Left power rail stays green solid while the rung result is false',()=>{
 const rt=scan(new Runtime(material(3).reference),{}),n=first(rt.program),html=look(rt);
 assert.equal(rt.memory.read('MOTOR'),false);assert.deepEqual(coil(html),{in:'unfulfilled',out:'unfulfilled'},'rung result is false');
 assert.deepEqual(rail(html,n),{rail:'fulfilled',feed:'fulfilled'});
 scan(rt,{STOP:true});assert.deepEqual(rail(look(rt),n),{rail:'fulfilled',feed:'fulfilled'},'still green with STOP pressed');
 scan(rt,{STOP:false,START:true});assert.deepEqual(rail(look(rt),n),{rail:'fulfilled',feed:'fulfilled'},'and when the rung is true');
});

test('Left power rail is gray for a network that was not executed and black offline',()=>{
 const p=material(3).reference;p.blocks[1].networks=[{id:'startup',title:'Init RUN',logic:{id:'init-nc',type:'NC',tag:'STOP'},output:{type:'SET',tag:'RUN'}}];
 const rt=new Runtime(p),init=p.blocks[1].networks[0];scan(rt,{},2);
 assert.deepEqual(rail(draw(init,p.tags,rt.trace),init),{rail:'unknown',feed:'unknown'},'OB100 not executed on scan 2');
 const n=first(p);assert.deepEqual(rail(draw(n,p.tags,rt.trace,false),n),{rail:'edit',feed:'edit'},'monitor off');
 assert.deepEqual(rail(draw(n,p.tags,{},true),n),{rail:'edit',feed:'edit'},'no trace yet');
});
