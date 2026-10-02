import {Memory,validScalar} from './memory';
import {blockName,dbMembers,isCycle,isStartup,localVar,vars,blockNumber} from './blocks';
import {compile} from './compiler';
import type {Block,BranchConnection,DataType,Output,Program,Expr,Scalar,Trace,TimerState,CounterState,Value} from './model';
import {type Lang,type Params,langOf} from '../i18n/core';
import {plcTranslator,type PlcKey} from '../i18n/dict/plc';
export interface RuntimeOptions {lang?:Lang}
// Call frame of an FC/FB: FB members (not temp/constant) live in the instance DB `prefix`; FC locals live in `temps`.
interface Frame {block:Block;prefix:string|null;temps:Record<string,Scalar>}
const MAX_CALL_DEPTH=8,MAX_SCAN_NETWORKS=20000;
export class Runtime {
 connections:BranchConnection[]=[];
 /** Interface language of trace `detail` texts and thrown errors. Changing it never affects scan behavior or timing. */
 private language:Lang='en';private t=plcTranslator('en');
 // Localized trace texts are remembered as key+params so a language switch re-renders the current trace without scanning.
 private localized:Record<string,{key:PlcKey;params:Params}>={};
 get lang():Lang{return this.language;}
 set lang(value:Lang){this.language=langOf(value);this.t=plcTranslator(this.language);if(this.memory)this.memory.lang=this.language;for(const [id,{key,params}] of Object.entries(this.localized)){const entry=this.trace[id];if(entry)entry.detail=this.t(key,params);}}
 // Trace entries of FB networks are keyed per instance ("<instance DB>/<element id>"), so two instances never overwrite each other.
 key(id:string){return this.scope()+id;}
 private say(id:string,key:PlcKey,params:Params){this.localized[this.key(id)]={key,params};return this.t(key,params);}
 controlInput(owner:Expr,pin:"reset"|"load"|"down",expr:Expr):boolean{const c=this.connections.find(c=>c.block===owner.id&&c.pin===pin);if(!c)return this.evaluate(expr);const feed=c.source==="$rail"?true:!!this.trace[this.key(c.source)]?.[c.side==="before"?"incoming":"signal"];if("children"in expr&&expr.pin&&!expr.children.length){this.trace[this.key(expr.id)]={value:feed,incoming:feed,signal:feed,detail:this.say(expr.id,"trace.branch",{value:feed})};return feed;}return this.evaluate(expr,feed)&&feed;}
 frames:Frame[]=[];work=0;db:Record<string,Scalar>={};dbTypes:Record<string,DataType>={};
 memory:Memory;inputs:Record<string,Scalar>={};forces:Record<string,Scalar>={};outputs:Record<string,Scalar>={};timers:Record<string,TimerState>={};counters:Record<string,CounterState>={};edges:Record<string,boolean>={};trace:Record<string,Trace>={};time=0;scans=0;before:Record<string,Scalar>={};
 constructor(public program:Program,options:RuntimeOptions={}){this.language=langOf(options.lang);this.t=plcTranslator(this.language);const errors=compile(program,this.language).filter(d=>d.severity==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.memory=new Memory(program.tags,this.language);for(const block of program.blocks.filter(b=>b.kind==='DB'))for(const v of dbMembers(program,block)){const key=`${blockName(block)}.${v.name}`;this.db[key]=v.initial;this.dbTypes[key]=v.type;}for(const t of program.tags)if(t.address.startsWith('%I'))this.inputs[t.name]=t.initial;}
 private frame(){return this.frames[this.frames.length-1];}
 private scope(){const f=this.frame();return f?.prefix?`${f.prefix}/`:'';}
 private local(name:string){const f=this.frame(),v=localVar(f?.block,name);if(!f||!v)return undefined;return f.block.kind==='FB'&&f.prefix&&v.section!=='temp'&&v.section!=='constant'?{db:`${f.prefix}.${name}`,type:v.type}:{temp:name,type:v.type};}
 operand(name:string):Scalar{if(name.startsWith('#')){const l=this.local(name.slice(1));if(!l)throw Error(this.t('rt.local',{name}));return l.db?this.db[l.db]:this.frame()!.temps[l.temp!];}if(name in this.db)return this.db[name];const scoped=this.scope()+name;if(scoped!==name&&/^(.+)\.(Q|QU|QD|CV|ET)$/i.test(name)){const m=/^(.+)\.(Q|QU|QD|CV|ET)$/i.exec(scoped)!;const k=m[1].toLowerCase(),member=m[2].toLowerCase(),c=Object.keys(this.counters).find(x=>x.toLowerCase()===k),tm=Object.keys(this.timers).find(x=>x.toLowerCase()===k);if(c&&member in this.counters[c])return this.counters[c][member as 'q'|'qu'|'qd'|'cv'];if(tm&&(member==='q'||member==='et'))return this.timers[tm][member];}const match=/^(.+)\.(Q|QU|QD|CV|ET)$/i.exec(name);if(match){const member=match[2].toLowerCase(),counterKey=Object.keys(this.counters).find(k=>k.toLowerCase()===match[1].toLowerCase()),timerKey=Object.keys(this.timers).find(k=>k.toLowerCase()===match[1].toLowerCase());if(counterKey&&member in this.counters[counterKey])return this.counters[counterKey][member as 'q'|'qu'|'qd'|'cv'];if(timerKey&&(member==='q'||member==='et'))return this.timers[timerKey][member];return member==='cv'||member==='et'?0:false;}return this.memory.read(name);}
 // Writes go to the current frame (#local), a data block member ("Db.member") or a PLC tag.
 write(name:string,value:Scalar){if(name.startsWith('#')){const l=this.local(name.slice(1));if(!l)throw Error(this.t('rt.local',{name}));if(!validScalar(l.type,value))throw Error(this.t('rt.range',{name,type:l.type,value:String(value)}));if(l.db)this.db[l.db]=value;else this.frame()!.temps[l.temp!]=value;return;}if(name in this.db){const type=this.dbTypes[name];if(!validScalar(type,value))throw Error(this.t('rt.range',{name,type,value:String(value)}));this.db[name]=value;return;}this.memory.set(name,value);}
 // Data type of an operand; word logic and shift/rotate work on its bit width (BYTE 8, WORD/INT 16, else 32).
 typeOf(v:Value):DataType|undefined{return v.kind!=='tag'?undefined:v.tag.startsWith('#')?this.local(v.tag.slice(1))?.type:this.dbTypes[v.tag]??this.program.tags.find(t=>t.name===v.tag)?.type;}
 // `hint` is the destination type: a constant IN takes the width of the operand it is written to.
 value(v:Value,hint?:DataType):number{if(v.kind==='literal')return v.value;if(v.kind==='tag')return Number(this.operand(v.tag));const a=this.value(v.a,hint),b=this.value(v.b),c=v.c?this.value(v.c,hint):0,type=this.typeOf(v.a)??hint,w=type==='BYTE'?8:type==='WORD'||type==='INT'?16:32,mask=w===32?0xFFFFFFFF:(1<<w)-1,u=(x:number)=>(Math.trunc(x)&mask)>>>0,signed=(x:number)=>type==='INT'&&x>32767?x-65536:type==='DINT'?x|0:x;switch(v.op){case'ADD':return a+b;case'SUB':return a-b;case'MUL':return a*b;case'DIV':if(!b)throw Error(this.t('rt.divZero'));return a/b;case'MOD':if(!b)throw Error(this.t('rt.divZero'));return a%b;case'NEG':return -a;case'ABS':return Math.abs(a);case'MIN':return Math.min(a,b);case'MAX':return Math.max(a,b);case'LIMIT':return Math.min(Math.max(b,a),c);case'SQR':return a*a;case'SQRT':return Math.sqrt(a);
  case'INT_TO_REAL':return a;case'REAL_TO_INT':{const f=Math.floor(a),r=a-f;return r===.5?(f%2===0?f:f+1):Math.round(a);}case'WORD_TO_INT':{const w=((Math.trunc(a)%65536)+65536)%65536;return w>32767?w-65536:w;}case'NORM_X':if(c===a)throw Error(this.t('rt.normRange'));return(b-a)/(c-a);case'SCALE_X':return a+b*(c-a);
  case'AND':return signed((u(a)&u(b))>>>0);case'OR':return signed((u(a)|u(b))>>>0);case'XOR':return signed((u(a)^u(b))>>>0);case'INVERT':return signed(u(~u(a)));case'DECO':return (2**(Math.trunc(a)&31))>>>0;case'ENCO':{const x=u(a);return x?31-Math.clz32(x&-x):0;}case'SEL':return a?c:b;
  case'SHL':return b>=w?0:signed(u(u(a)*2**Math.max(0,Math.trunc(b))));case'SHR':return b>=w?0:signed(Math.floor(u(a)/2**Math.max(0,Math.trunc(b))));case'ROL':case'ROR':{const n=((Math.trunc(b)%w)+w)%w,x=u(a),k=v.op==='ROL'?n:(w-n)%w;return signed(k?(((x<<k)|(x>>>(w-k)))&mask)>>>0:x);}}}
 mainInput(e:Expr,incoming:boolean):boolean{if('children'in e&&e.pin&&e.children.length===0){this.trace[this.key(e.id)]={value:incoming,incoming,signal:incoming,detail:this.say(e.id,'trace.network',{value:incoming})};return incoming;}return this.evaluate(e,incoming)&&incoming;}
 evaluate(e:Expr,incoming=true):boolean{
 this.trace[this.key(e.id)]={value:false,incoming,signal:false,detail:''};
 let q=false,detail='';
 if(e.type==='NO'||e.type==='NC'){const v=Boolean(this.operand(e.tag));q=e.type==='NO'?v:!v;detail=`${e.tag} = ${v} → ${e.type} = ${q}`;}
 else if(e.type==='P'||e.type==='N'){const edge=this.scope()+e.id,v=Boolean(this.operand(e.tag)),previous=this.edges[edge]??false;q=e.type==='P'?v&&!previous:!v&&previous;this.edges[edge]=v;detail=`${e.tag}: ${previous} → ${v}, ${e.type} = ${q}`;}
 else if('children'in e){let feed=incoming,rlo=true;const states=e.children.map(x=>{const result=this.evaluate(x,e.type==='AND'?feed:incoming);if(e.type==='AND'){if(x.type==='NOT'){rlo=!rlo;feed=incoming&&rlo;}else{rlo=rlo&&result;feed=feed&&result;}}return result;});q=e.pin&&states.length===0?false:e.type==='AND'?rlo:states.some(Boolean);detail=`${states.join(` ${e.type} `)} = ${q}`;}
 else if(e.type==='NOT'){q=!incoming;detail=`NOT ${incoming} = ${q}`;}
 else if(e.type==='SR'||e.type==='RS'){const first=this.mainInput(e.input,incoming),second=this.controlInput(e,'reset',e.reset),tag=e.instance?.trim()??'';let v=Boolean(this.operand(tag));if(e.type==='SR'){if(first)v=true;if(second)v=false;}else{if(first)v=false;if(second)v=true;}this.write(tag,v);q=v;detail=e.type==='SR'?`S=${first} R1=${second} ${tag}=${v}`:`R=${first} S1=${second} ${tag}=${v}`;}
 else if(e.type==='COMPARE'){const a=this.value(e.a),b=this.value(e.b);q=({'==':a===b,'<>':a!==b,'>':a>b,'<':a<b,'>=':a>=b,'<=':a<=b})[e.op];detail=`${a} ${e.op} ${b} = ${q}`;}
 else if(e.type==='CTU'||e.type==='CTD'||e.type==='CTUD'){
  const key=this.scope()+(e.instance?.trim()||e.id),pv=Math.trunc(typeof e.pv==='number'?e.pv:this.value(e.pv)),up=this.mainInput(e.input,incoming);
  const s=this.counters[key]??{q:false,qu:false,qd:false,cv:0,previous:false,previousDown:false};
  if(e.type==='CTU'){
   const reset=this.controlInput(e,'reset',e.reset);if(reset)s.cv=0;else if(up&&!s.previous)s.cv=Math.min(2147483647,s.cv+1);s.previous=up;s.qu=s.cv>=pv;s.q=s.qu;s.qd=s.cv<=0;detail=`CU=${up} R=${reset} CV=${s.cv} PV=${pv} Q=${s.q}`;
  }else if(e.type==='CTD'){
   const load=this.controlInput(e,'load',e.load);if(load)s.cv=pv;else if(up&&!s.previous)s.cv=Math.max(-2147483648,s.cv-1);s.previous=up;s.qd=s.cv<=0;s.q=s.qd;s.qu=s.cv>=pv;detail=`CD=${up} LD=${load} CV=${s.cv} PV=${pv} Q=${s.q}`;
  }else{
   const down=this.controlInput(e,'down',e.down),reset=this.controlInput(e,'reset',e.reset),load=this.controlInput(e,'load',e.load),upEdge=up&&!s.previous,downEdge=down&&!s.previousDown;
   if(reset)s.cv=0;else if(load)s.cv=pv;else if(upEdge!==downEdge)s.cv=Math.max(-2147483648,Math.min(2147483647,s.cv+(upEdge?1:-1)));
   s.previous=up;s.previousDown=down;s.qu=s.cv>=pv;s.qd=s.cv<=0;s.q=s.qu;detail=`CU=${up} CD=${down} R=${reset} LD=${load} CV=${s.cv} PV=${pv} QU=${s.qu} QD=${s.qd}`;
  }
  this.counters[key]=s;if(e.cvTag)this.write(e.cvTag,s.cv);q=s.q;
 }
 else if(e.type==='R_TRIG'||e.type==='F_TRIG'){const edge=this.scope()+e.id,v=this.mainInput(e.input,incoming),prev=this.edges[edge]??false;q=e.type==='R_TRIG'?v&&!prev:!v&&prev;this.edges[edge]=v;detail=this.say(e.id,'trace.edge',{previous:prev,now:v,q});}
 else if('pt'in e){const input=this.mainInput(e.input,incoming),pt=Math.max(0,Math.trunc(typeof e.pt==='number'?e.pt:this.value(e.pt))),key=this.scope()+(e.instance?.trim()||e.id),s=this.timers[key]??{q:false,et:0,start:null,previous:false};
 if(e.type==='TON'){if(!input){s.start=null;s.et=0;s.q=false;}else{if(s.start===null)s.start=this.time;s.et=Math.min(pt,this.time-s.start);s.q=s.et>=pt;}}
 if(e.type==='TOF'){if(input){s.q=true;s.start=null;s.et=0;}else{if(s.previous)s.start=this.time;if(s.start!==null){s.et=Math.min(pt,this.time-s.start);s.q=s.et<pt;}else{s.q=false;s.et=0;}}}
 if(e.type==='TP'){if(input&&!s.previous&&s.start===null){s.start=this.time;}if(s.start!==null){s.et=Math.min(pt,this.time-s.start);s.q=s.et<pt;if(!s.q&&!input){s.start=null;s.et=0;}}else{s.q=false;s.et=0;}}
 s.previous=input;this.timers[key]=s;if(e.etTag)this.write(e.etTag,s.et);q=s.q;detail=`IN=${input} PT=T#${pt}ms ET=T#${s.et}ms Q=${q}`;
 }
 this.trace[this.key(e.id)]={value:q,incoming,signal:incoming&&q,detail};return q;
 }
 scan(deltaMs:number){if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000)throw Error(this.t('rt.scanDelta'));this.time+=deltaMs;this.trace={};this.localized={};for(const [k,v]of Object.entries(this.inputs))this.memory.set(k,v);for(const [k,v]of Object.entries(this.forces))this.memory.set(k,v);this.before=this.memory.snapshot();
 const obs=(pick:(b:Block)=>boolean)=>this.program.blocks.filter(pick).sort((a,b)=>blockNumber(a)-blockNumber(b));
 this.work=0;if(this.scans===0)for(const b of obs(isStartup))this.ob(b);for(const b of obs(isCycle))this.ob(b);for(const[k,v]of Object.entries(this.forces))this.memory.set(k,v);this.scans++;for(const t of this.program.tags)if(t.address.startsWith('%Q'))this.outputs[t.name]=this.memory.read(t.name);return this.snapshot();}
 // An OB runs in its own frame so its Temp/Constant locals resolve.
 ob(b:Block){const temps:Record<string,Scalar>={};for(const v of vars(b.iface,['temp','constant']))temps[v.name]=v.initial;this.frames.push({block:b,prefix:null,temps});try{this.run(b);}finally{this.frames.pop();}}
 // Networks run in order; JMP (RLO 1) / JMPN (RLO 0) continue at the network with the label, RET (RLO 1) leaves the block.
 run(block:Block){for(let i=0;i<block.networks.length;i++){const n=block.networks[i];if(++this.work>MAX_SCAN_NETWORKS)throw Error(this.t('rt.cycle'));this.connections=n.connections??[];const q=this.evaluate(n.logic);this.trace[this.key(n.id)]={value:q,detail:`${n.title}: ${q}; ${n.output.type} ${n.output.tag}`};const o=n.output;if(o.type==='COIL')this.write(o.tag,q);if(o.type==='SET'&&q)this.write(o.tag,true);if(o.type==='RESET'&&q)this.write(o.tag,false);if(o.type==='MOVE'&&q&&o.value)this.write(o.tag,this.value(o.value,this.typeOf({kind:'tag',tag:o.tag})));if(o.type==='CALL'&&q)this.call(o);if(o.type==='RET'&&q)return;if((o.type==='JMP'&&q)||(o.type==='JMPN'&&!q)){const to=block.networks.findIndex(x=>x.label?.trim()===o.tag.trim());if(to<0)throw Error(this.t('rt.label',{label:o.tag}));i=to-1;}}}
 // FC/FB call: actual parameters are evaluated in the caller, the block runs in its own frame, outputs are copied back.
 call(o:Output){if(this.frames.length>MAX_CALL_DEPTH)throw Error(this.t('rt.depth'));const callee=this.program.blocks.find(b=>b.id===o.tag);if(!callee||(callee.kind!=='FC'&&callee.kind!=='FB'))throw Error(this.t('rt.callee',{name:o.tag}));
  const actual=vars(callee.iface,['input','inout']).map(v=>{const p=o.params?.[v.name];if(!p)return [v,undefined] as const;const raw=p.kind==='tag'?this.operand(p.tag):this.value(p),value=v.type==='BOOL'?Boolean(raw):Number(raw);if(!validScalar(v.type,value))throw Error(this.t('rt.range',{name:`${blockName(callee)}.${v.name}`,type:v.type,value:String(value)}));return [v,value] as const;});
  const temps:Record<string,Scalar>={};for(const v of vars(callee.iface,['temp','constant']))temps[v.name]=v.initial;let prefix:string|null=null;
  if(callee.kind==='FB'){const db=this.program.blocks.find(b=>b.id===o.instance&&b.kind==='DB');if(!db)throw Error(this.t('rt.instance',{name:o.instance??'?'}));prefix=blockName(db);for(const [v,value] of actual)if(value!==undefined)this.db[`${prefix}.${v.name}`]=value;}
  else{for(const v of vars(callee.iface,['input','output','inout']))temps[v.name]=v.initial;for(const [v,value] of actual)if(value!==undefined)temps[v.name]=value;}
  this.frames.push({block:callee,prefix,temps});try{this.run(callee);}finally{this.frames.pop();}
  for(const v of vars(callee.iface,['output','inout'])){const p=o.params?.[v.name],dest=v.section==='output'?o.outs?.[v.name]:p?.kind==='tag'?p.tag:undefined;if(!dest)continue;this.write(dest,prefix?this.db[`${prefix}.${v.name}`]:temps[v.name]);}}
 stop(){for(const t of this.program.tags)if(t.address.startsWith('%Q')){this.memory.set(t.name,t.type==='BOOL'?false:0);this.outputs[t.name]=t.type==='BOOL'?false:0;}}
 snapshot(){return {values:{...this.memory.snapshot(),...this.db},inputs:{...this.inputs},outputs:{...this.outputs},before:this.before,trace:this.trace,timers:this.timers,counters:this.counters,time:this.time,scans:this.scans,forces:this.forces};}
}
export type Snapshot=ReturnType<Runtime['snapshot']>;
