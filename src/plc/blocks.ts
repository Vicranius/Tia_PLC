import type {Block,BlockInterface,DataType,Program,Scalar,Section,Variable} from './model';

// Block helpers shared by compiler, runtime and editor so operand resolution is identical everywhere.
export const SECTIONS:Section[]=['input','output','inout','static','temp','constant'];
export const sectionsFor=(kind:Block['kind']):Section[]=>kind==='FB'?['input','output','inout','static','temp','constant']:kind==='FC'?['input','output','inout','temp','constant']:kind==='OB'?['input','temp','constant']:[];
export const defaultValue=(type:DataType):Scalar=>type==='BOOL'?false:0;
export const blockName=(b:Block)=>b.name??(b.id==='OB1'?'Main':b.id==='OB100'?'Startup':b.id);
export const blockNumber=(b:Block)=>b.number??Number(b.id.replace(/\D/g,''));
export const blockLabel=(b:Block)=>`${blockName(b)} [${b.id}]`;
export const isStartup=(b:Block)=>b.kind==='OB'&&(b.obType==='startup'||b.id==='OB100');
export const isCycle=(b:Block)=>b.kind==='OB'&&!isStartup(b);
export const vars=(iface:BlockInterface|undefined,sections:Section[]=SECTIONS)=>sections.flatMap(s=>(iface?.[s]??[]).map(v=>({...v,section:s})));
export const localVar=(block:Block|undefined,name:string)=>block?vars(block.iface).find(v=>v.name===name):undefined;
// Members stored in an FB instance DB (temp and constant are not).
export const instanceMembers=(fb:Block)=>vars(fb.iface,['input','output','inout','static']);
export const dbMembers=(p:Program,db:Block):(Variable&{section?:Section})[]=>{if(db.instanceOf){const fb=p.blocks.find(b=>b.id===db.instanceOf);return fb?instanceMembers(fb):[];}return db.data??[];};
// Fully qualified data block operands: "DbName.Member".
export function dbOperands(p:Program){const map=new Map<string,DataType>();for(const db of p.blocks.filter(b=>b.kind==='DB'))for(const v of dbMembers(p,db))map.set(`${blockName(db)}.${v.name}`,v.type);return map;}
export const nextNumber=(p:Program,kind:Block['kind'])=>{const used=new Set(p.blocks.filter(b=>b.kind===kind).map(blockNumber));let n=kind==='OB'?123:1;while(used.has(n))n++;return n;};
export const identifier=/^[A-Za-z_][A-Za-z0-9_]*$/;
// What the LAD editor needs to draw and edit an FC/FB call box.
export interface CallInfo {id:string;kind:'FB'|'FC';name:string;instanceId?:string;instance?:string;inputs:{name:string;type:DataType}[];outputs:{name:string;type:DataType}[]}
export function callInfo(p:Program,o:{type:string;tag:string;instance?:string}):CallInfo|undefined{
 if(o.type!=='CALL')return undefined;const b=p.blocks.find(x=>x.id===o.tag);if(!b||(b.kind!=='FB'&&b.kind!=='FC'))return undefined;const db=o.instance?p.blocks.find(x=>x.id===o.instance):undefined;
 return {id:b.id,kind:b.kind,name:blockName(b),instanceId:db?.id,instance:db?blockName(db):undefined,inputs:vars(b.iface,['input','inout']).map(v=>({name:v.name,type:v.type})),outputs:vars(b.iface,['output']).map(v=>({name:v.name,type:v.type}))};
}
export const callRows=(c?:CallInfo)=>c?Math.max(1,c.inputs.length,c.outputs.length):0;
