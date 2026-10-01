import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PortalView,{type ProjectTarget} from '../src/ui/PortalView';
import {catalog,challenge} from '../src/challenges/catalog';
import {material} from '../src/challenges/private';

type Props=Parameters<typeof PortalView>[0];
type El=ReactElement<Record<string,unknown>>;
const make=(over:Partial<Props>={}):Props=>({projectName:'PLC_Lab_Project',cpu:'CPU 1214C DC/DC/DC',blocks:material(7).reference.blocks,challenge:challenge(7),mode:'STOP',locked:false,saved:true,onOpen:()=>{},onCreate:()=>{},onCpu:()=>{},onStart:()=>{},onStop:()=>{},...over});
const markup=(p:Props)=>renderToStaticMarkup(createElement(PortalView,p));
// Minimal hook-driven renderer: PortalView only uses useState, so the element tree can be produced without a DOM and clicked by invoking its handlers.
const internals=(React as unknown as {__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:{H:unknown}}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function mount(p:Props){
 const store:unknown[]=[];let tree:ReactNode;
 const draw=()=>{let i=0;const prev=internals.H;internals.H={useState:(init:unknown)=>{const k=i++;if(!(k in store))store[k]=init;return[store[k],(v:unknown)=>{store[k]=typeof v==='function'?(v as (s:unknown)=>unknown)(store[k]):v;}];}};try{tree=PortalView(p) as ReactNode;}finally{internals.H=prev;}};
 draw();
 const walk=(node:ReactNode,out:El[]):El[]=>{if(Array.isArray(node))node.forEach(n=>walk(n,out));else if(isValidElement(node)){out.push(node as El);walk((node.props as {children?:ReactNode}).children,out);}return out;},all=()=>walk(tree,[]);
 const text=(node:ReactNode):string=>Array.isArray(node)?node.map(text).join(''):isValidElement(node)?text((node.props as {children?:ReactNode}).children):typeof node==='string'||typeof node==='number'?String(node):'';
 const find=(type:string,label:string|RegExp,within?:string)=>{const el=all().find(e=>e.type===type&&(label instanceof RegExp?label.test(text(e)):text(e)===label)&&(!within||e.props.className===within));assert.ok(el,`${type} "${label}" not found`);return el;};
 const fire=(el:El,handler:string,arg:unknown={})=>{const fn=el.props[handler] as ((e:unknown)=>void)|undefined;assert.ok(fn,`no ${handler}`);fn(arg);draw();};
 return {click:(type:string,label:string|RegExp)=>fire(find(type,label),'onClick'),find,fire,all,text,html:()=>renderToStaticMarkup(tree)};
}
const portalLabels=['Start','Devices & networks','PLC programming','Visualization','Online & Diagnostics'];

test('Portal view default render: five task portals, First steps, footer project and exercise',()=>{
 const html=markup(make());
 assert.match(html,/aria-label="Portal view"/);
 const nav=html.match(/<nav class="portal-tasks"[\s\S]*?<\/nav>/)?.[0]??'';
 assert.equal((nav.match(/<button/g)??[]).length,5);
 for(const label of portalLabels)assert.ok(nav.includes(`</span>${label.replace('&','&amp;')}</button>`),label);
 assert.match(nav,/class="active" aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Start<\/button>/);
 assert.match(html,/<section class="portal-content" aria-label="First steps"><h2>First steps<\/h2>/);
 assert.match(html,/Project “PLC_Lab_Project” was opened successfully/);
 assert.equal((html.match(/class="portal-step[ "]/g)??[]).length,5);
 for(const s of['Configure a device','Write PLC program','Configure an HMI screen','Simulate and monitor the CPU','Open the project view'])assert.ok(html.includes(s),s);
 assert.match(html,/<button class="portal-switch"[^>]*>(?:(?!<\/button>)[\s\S])*Project view<\/button>/);
 assert.match(html,/Opened project: PLC_Lab_Project · 07 TON motor delay<\/span>/);
 assert.match(html,/<nav class="portal-actions" aria-label="Start actions">/);
 for(const a of['Open existing project','Create new project','First steps','Installed software','Help'])assert.ok(html.includes(`${a}</button>`),a);
});
test('Portal view footer follows the current project name and exercise',()=>{
 assert.match(markup(make({projectName:'Line_9',challenge:challenge(27)})),new RegExp(`Opened project: Line_9 · 27 ${challenge(27).title.replace(/[()]/g,'\\$&')}`));
});
test('Create new project lists all 27 industrial exercises',()=>{
 assert.equal(catalog.length,27);
 const v=mount(make());v.click('button','Create new project');
 const html=v.html();
 assert.match(html,/<h2>Create new project<\/h2>/);
 const rows=html.match(/<tr class="[^"]*"><td>\d\d<\/td>/g)??[];assert.equal(rows.length,27);
 for(const x of catalog){const cells=`<td>${String(x.id).padStart(2,'0')}</td><td>${x.title.replace(/&/g,'&amp;')}</td><td>L${x.level}</td><td>${x.concepts.join(', ')}</td>`;assert.ok(html.includes(cells),`exercise ${x.id}`);}
 assert.match(html,/<tr class="selected"><td>07<\/td>/,'current exercise preselected');
 assert.match(html,/Creates a new “PLC_Lab_Project” with an empty Main \[OB1\]/);
 assert.doesNotMatch(html,/<button class="portal-primary" disabled="">Create/);
});
test('Create new project: click selects, Create and double-click load the exercise, locked CPU blocks both',()=>{
 const created:number[]=[];let v=mount(make({onCreate:id=>created.push(id)}));v.click('button','Create new project');
 const row=(n:string)=>v.all().find(e=>e.type==='tr'&&v.text(e).startsWith(n))!;
 v.fire(row('12'),'onClick');assert.match(v.html(),/<tr class="selected"><td>12<\/td>/);assert.doesNotMatch(v.html(),/<tr class="selected"><td>07<\/td>/);
 v.click('button','Create');assert.deepEqual(created,[12]);
 v.fire(row('21'),'onDoubleClick');assert.deepEqual(created,[12,21]);
 v=mount(make({locked:true,onCreate:id=>created.push(id)}));v.click('button','Create new project');
 assert.match(v.html(),/<button class="portal-primary" disabled="">Create<\/button>/);assert.match(v.html(),/Stop the CPU before creating a new project\./);
 v.fire(v.all().find(e=>e.type==='tr'&&v.text(e).startsWith('05'))!,'onDoubleClick');assert.deepEqual(created,[12,21]);
});
test('First steps cards jump to the matching portal and action; Project view opens the project',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({onOpen:t=>opened.push(t)}));
 for(const [card,heading] of[['Devices & networks','Show all devices'],['PLC programming','Show all objects'],['Visualization','Show all screens'],['Online & Diagnostics','Accessible devices']]){
  v.fire(v.find('button',new RegExp(`^${card}`),'portal-step'),'onClick');
  assert.match(v.html(),new RegExp(`<section class="portal-content" aria-label="${heading}"><h2>${heading}</h2>`),card);
  assert.match(v.html(),new RegExp(`class="active" aria-pressed="true"[^>]*>(?:(?!</button>)[\\s\\S])*${heading}</button>`));
  v.click('button','Start');v.click('button','First steps');
 }
 v.fire(v.find('button',/Open the project view/,'portal-step project'),'onClick');assert.deepEqual(opened,[undefined]);
 v.fire(v.find('button',/Project view/,'portal-switch'),'onClick');assert.deepEqual(opened,[undefined,undefined]);
});
test('Open existing project: recent project row, status and Open button',()=>{
 const opened:(ProjectTarget|undefined)[]=[];let v=mount(make({onOpen:t=>opened.push(t)}));v.click('button','Open existing project');
 assert.match(v.html(),/<td>PLC_Lab_Project<\/td>|PLC_Lab_Project<\/td><td>Browser session/);assert.match(v.html(),/07 · TON motor delay<\/td><td>Saved<\/td>/);
 v.click('button','Open');assert.deepEqual(opened,[undefined]);
 v=mount(make({saved:false}));v.click('button','Open existing project');assert.match(v.html(),/<td>Modified<\/td>/);
});
test('Installed software and Help actions render their content',()=>{
 const v=mount(make());v.click('button','Installed software');assert.match(v.html(),/Virtual CPU/);assert.match(v.html(),/10 ms deterministic scan/);
 v.click('button','Help');assert.match(v.html(),/<ol class="portal-help"><li>/);
});
test('Devices & networks: device rows open the device view or process screen',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({mode:'RUN',onOpen:t=>opened.push(t)}));v.click('button','Devices & networks');
 assert.match(v.html(),/<h2>Show all devices<\/h2>/);assert.match(v.html(),/PLC_1<\/td><td>CPU 1214C DC\/DC\/DC<\/td><td>Virtual \(browser\)<\/td><td>RUN<\/td>/);assert.match(v.html(),/HMI_1<\/td>/);
 v.click('button','Open the device view');
 const rows=v.all().filter(e=>e.type==='tr'&&e.props.onDoubleClick);v.fire(rows[0],'onDoubleClick');v.fire(rows[1],'onDoubleClick');
 assert.deepEqual(opened,[{view:'device'},{view:'device'},{view:'process'}]);
});
test('Change device: commits the chosen CPU, disabled when unchanged or locked',()=>{
 const cpus:string[]=[];let v=mount(make({onCpu:c=>cpus.push(c)}));v.click('button','Devices & networks');v.click('button','Change device');
 const radios=()=>v.all().filter(e=>e.type==='input');assert.equal(radios().length,5);
 for(const c of['1211C','1212C','1214C','1215C','1217C'])assert.ok(v.html().includes(`CPU ${c} DC/DC/DC</label>`),c);
 assert.match(v.html(),/<input type="radio" name="portal-cpu" checked=""[^>]*\/><svg[^>]*>.*?<\/svg>CPU 1214C DC\/DC\/DC/);
 assert.match(v.html(),/<button class="portal-primary" disabled="">Change<\/button>/);
 v.fire(radios()[3],'onChange');assert.doesNotMatch(v.html(),/disabled="">Change/);
 v.click('button','Change');assert.deepEqual(cpus,['CPU 1215C DC/DC/DC']);
 v=mount(make({locked:true,onCpu:c=>cpus.push(c)}));v.click('button','Devices & networks');v.click('button','Change device');
 v.fire(v.all().filter(e=>e.type==='input')[0],'onChange');assert.match(v.html(),/disabled="">Change/);assert.match(v.html(),/Stop the CPU before changing the device\./);
});
test('PLC programming lists OB1 and OB100 with network counts and opens blocks',()=>{
 const blocks=material(7).reference.blocks;assert.deepEqual(blocks.map(b=>b.id),['OB1','OB100']);
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({blocks,onOpen:t=>opened.push(t)}));v.click('button','PLC programming');
 assert.match(v.html(),/<h2>Show all objects<\/h2>/);
 for(const b of blocks)assert.ok(v.html().includes(`${b.id==='OB1'?'Main':'Startup'}</td><td>${b.id.replace(/\D/g,'')}</td><td>Organization block</td><td>LAD</td><td>${b.networks.length}</td>`),b.id);
 const rows=v.all().filter(e=>e.type==='tr'&&e.props.onDoubleClick);v.fire(rows[1],'onDoubleClick');v.click('button','Open Main [OB1]');
 assert.deepEqual(opened,[{view:'ladder',block:'OB100'},{view:'ladder',block:'OB1'}]);
});
test('Visualization opens the HMI process screen',()=>{
 const opened:(ProjectTarget|undefined)[]=[];const v=mount(make({onOpen:t=>opened.push(t)}));v.click('button','Visualization');
 assert.match(v.html(),/<h2>Show all screens<\/h2>/);assert.match(v.html(),new RegExp(`HMI_1</td><td>${challenge(7).title}</td>`));
 v.click('button','Open screen');assert.deepEqual(opened,[{view:'process'}]);
});
test('Online & Diagnostics: operating mode, Start/Stop enablement and Go online',()=>{
 const calls:string[]=[];const opened:(ProjectTarget|undefined)[]=[];
 const stop=mount(make({mode:'STOP',onStart:()=>calls.push('start'),onStop:()=>calls.push('stop'),onOpen:t=>opened.push(t)}));stop.click('button','Online & Diagnostics');
 assert.match(stop.html(),/<td class="portal-stop">● STOP<\/td>/);assert.match(stop.html(),/<button disabled="">Stop CPU<\/button>/);assert.doesNotMatch(stop.html(),/disabled="">Start CPU/);
 stop.click('button','Start CPU');stop.click('button','Go online · monitor OB1');assert.deepEqual(calls,['start']);assert.deepEqual(opened,[{view:'ladder',block:'OB1',monitor:true}]);
 const run=mount(make({mode:'RUN',onStart:()=>calls.push('start'),onStop:()=>calls.push('stop')}));run.click('button','Online & Diagnostics');
 assert.match(run.html(),/<td class="portal-run">● RUN<\/td>/);assert.match(run.html(),/<button disabled="">Start CPU<\/button>/);assert.doesNotMatch(run.html(),/disabled="">Stop CPU/);
 run.click('button','Stop CPU');assert.deepEqual(calls,['start','stop']);
});
