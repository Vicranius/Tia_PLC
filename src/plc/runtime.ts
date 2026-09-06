import {Memory} from './memory';
import {compile} from './compiler';
import type {Program,Expr,Scalar,Trace,TimerState,CounterState,Value} from './model';
export class Runtime {
 memory:Memory;inputs:Record<string,Scalar>={};forces:Record<string,Scalar>={};outputs:Record<string,Scalar>={};timers:Record<string,TimerState>={};counters:Record<string,CounterState>={};edges:Record<string,boolean>={};trace:Record<string,Trace>={};time=0;scans=0;before:Record<string,Scalar>={};
 constructor(public program:Program){const errors=compile(program).filter(d=>d.severity==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('; '));this.memory=new Memory(program.tags);for(const t of program.tags)if(t.address.startsWith('%I'))this.inputs[t.name]=t.initial;}
 value(v:Value):number{if(v.kind==='literal')return v.value;if(v.kind==='tag')return Number(this.memory.read(v.tag));const a=this.value(v.a),b=this.value(v.b),c=v.c?this.value(v.c):0;switch(v.op){case'ADD':return a+b;case'SUB':return a-b;case'MUL':return a*b;case'DIV':if(!b)throw Error('DIV: sıfıra bölme');return a/b;case'INT_TO_REAL':return a;case'REAL_TO_INT':{const f=Math.floor(a),r=a-f;return r===.5?(f%2===0?f:f+1):Math.round(a);}case'WORD_TO_INT':{const w=((Math.trunc(a)%65536)+65536)%65536;return w>32767?w-65536:w;}case'NORM_X':if(c===a)throw Error('NORM_X: MIN = MAX');return(b-a)/(c-a);case'SCALE_X':return a+b*(c-a);}}
 evaluate(e:Expr):boolean{
 let q=false,detail='';
 if(e.type==='NO'||e.type==='NC'){const v=Boolean(this.memory.read(e.tag));q=e.type==='NO'?v:!v;detail=`${e.tag} = ${v} → ${e.type} = ${q}`;}
 else if('children'in e){const states=e.children.map(x=>this.evaluate(x));q=e.type==='AND'?states.every(Boolean):states.some(Boolean);detail=`${states.join(` ${e.type} `)} = ${q}`;}
 else if(e.type==='COMPARE'){const a=this.value(e.a),b=this.value(e.b);q=({'==':a===b,'<>':a!==b,'>':a>b,'<':a<b,'>=':a>=b,'<=':a<=b})[e.op];detail=`${a} ${e.op} ${b} = ${q}`;}
 else if(e.type==='CTU'){const input=this.evaluate(e.input),reset=this.evaluate(e.reset);const s=this.counters[e.id]??{q:false,cv:0,previous:false};if(reset)s.cv=0;else if(input&&!s.previous)s.cv=Math.min(32767,s.cv+1);s.previous=input;s.q=s.cv>=e.pv;this.counters[e.id]=s;q=s.q;detail=`CU=${input} R=${reset} CV=${s.cv} PV=${e.pv} Q=${q}`;}
 else if(e.type==='R_TRIG'||e.type==='F_TRIG'){const v=this.evaluate(e.input),prev=this.edges[e.id]??false;q=e.type==='R_TRIG'?v&&!prev:!v&&prev;this.edges[e.id]=v;detail=`önce=${prev}, şimdi=${v}, Q=${q}`;}
 else if('pt'in e){const input=this.evaluate(e.input);const s=this.timers[e.id]??{q:false,et:0,start:null,previous:false};
 if(e.type==='TON'){if(!input){s.start=null;s.et=0;s.q=false;}else{if(s.start===null)s.start=this.time;s.et=Math.min(e.pt,this.time-s.start);s.q=s.et>=e.pt;}}
 if(e.type==='TOF'){if(input){s.q=true;s.start=null;s.et=0;}else{if(s.previous)s.start=this.time;if(s.start!==null){s.et=Math.min(e.pt,this.time-s.start);s.q=s.et<e.pt;}else{s.q=false;s.et=0;}}}
 if(e.type==='TP'){if(input&&!s.previous&&s.start===null){s.start=this.time;}if(s.start!==null){s.et=Math.min(e.pt,this.time-s.start);s.q=s.et<e.pt;if(!s.q&&!input){s.start=null;s.et=0;}}else{s.q=false;s.et=0;}}
 s.previous=input;this.timers[e.id]=s;q=s.q;detail=`IN=${input} PT=T#${e.pt}ms ET=T#${s.et}ms Q=${q}`;
 }
 this.trace[e.id]={value:q,detail};return q;
 }
 scan(deltaMs:number){if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000)throw Error('Scan delta 0–1000 ms olmalı');this.time+=deltaMs;this.trace={};for(const [k,v]of Object.entries(this.inputs))this.memory.set(k,v);for(const [k,v]of Object.entries(this.forces))this.memory.set(k,v);this.before=this.memory.snapshot();
 const execute=(id:string)=>{for(const n of this.program.blocks.find(b=>b.id===id)?.networks??[]){const q=this.evaluate(n.logic);this.trace[n.id]={value:q,detail:`${n.title}: ${q}; ${n.output.type} ${n.output.tag}`};const o=n.output;if(o.type==='COIL')this.memory.set(o.tag,q);if(o.type==='SET'&&q)this.memory.set(o.tag,true);if(o.type==='RESET'&&q)this.memory.set(o.tag,false);if(o.type==='MOVE'&&q&&o.value)this.memory.set(o.tag,this.value(o.value));}};
 if(this.scans===0)execute('OB100');execute('OB1');for(const[k,v]of Object.entries(this.forces))this.memory.set(k,v);this.scans++;for(const t of this.program.tags)if(t.address.startsWith('%Q'))this.outputs[t.name]=this.memory.read(t.name);return this.snapshot();}
 stop(){for(const t of this.program.tags)if(t.address.startsWith('%Q')){this.memory.set(t.name,t.type==='BOOL'?false:0);this.outputs[t.name]=t.type==='BOOL'?false:0;}}
 snapshot(){return {values:this.memory.snapshot(),inputs:{...this.inputs},outputs:{...this.outputs},before:this.before,trace:this.trace,timers:this.timers,counters:this.counters,time:this.time,scans:this.scans,forces:this.forces};}
}
export type Snapshot=ReturnType<Runtime['snapshot']>;
