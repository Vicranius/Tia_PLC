import {uid,type Expr,type Output,type Tag,type Value} from '../plc/model';

export type LogicInstruction='NO'|'NC'|'R_TRIG'|'F_TRIG'|'TON'|'TOF'|'TP'|'CTU'|'COMPARE';
export type NumericInstruction='MOVE'|'ADD'|'SUB'|'MUL'|'DIV'|'INT_TO_REAL'|'REAL_TO_INT'|'WORD_TO_INT'|'NORM_X'|'SCALE_X';

const literal=(value:number):Value=>({kind:'literal',value});
const tagValue=(name:string|undefined):Value=>name?{kind:'tag',tag:name}:literal(0);
const firstNumeric=(tags:Tag[],preferred?:string)=>tags.find(t=>t.name===preferred&&t.type!=='BOOL')??tags.find(t=>t.type!=='BOOL');

export function defaultOperationValue(kind:NumericInstruction,tags:Tag[]):Value{
 const raw=tagValue(firstNumeric(tags,'RAW')?.name);
 const real=tagValue(firstNumeric(tags,'TEMP')?.name??firstNumeric(tags)?.name);
 switch(kind){
  case'MOVE':return raw;
  case'ADD':case'SUB':case'MUL':case'DIV':return {kind:'calc',op:kind,a:raw,b:literal(1)};
  case'INT_TO_REAL':return {kind:'calc',op:kind,a:raw,b:literal(0)};
  case'REAL_TO_INT':return {kind:'calc',op:kind,a:real,b:literal(0)};
  case'WORD_TO_INT':return {kind:'calc',op:kind,a:raw,b:literal(0)};
  case'NORM_X':return {kind:'calc',op:kind,a:literal(0),b:raw,c:literal(27648)};
  case'SCALE_X':return {kind:'calc',op:kind,a:literal(0),b:{kind:'calc',op:'NORM_X',a:literal(0),b:raw,c:literal(27648)},c:literal(150)};
 }
}

export function numericOutput(kind:NumericInstruction,tags:Tag[],current:Output):Output{
 const writable=tags.filter(t=>t.type!=='BOOL'&&!t.address.startsWith('%I'));
 const target=writable.find(t=>t.name==='TEMP')??writable[0];
 return {type:'MOVE',tag:target?.name??current.tag,value:defaultOperationValue(kind,tags)};
}

export function booleanOutput(kind:'COIL'|'SET'|'RESET',tags:Tag[],current:Output):Output{
 const currentTag=tags.find(t=>t.name===current.tag&&t.type==='BOOL'&&!t.address.startsWith('%I'));
 const target=currentTag??tags.find(t=>t.type==='BOOL'&&t.address.startsWith('%Q'))??tags.find(t=>t.type==='BOOL'&&!t.address.startsWith('%I'));
 return {type:kind,tag:target?.name??current.tag};
}

export function logicInstruction(kind:LogicInstruction,tags:Tag[],compareOp:'=='|'<>'|'>'|'<'|'>='|'<='='>'):Expr{
 const bool=tags.find(t=>t.type==='BOOL'&&t.address.startsWith('%I'))?.name??tags.find(t=>t.type==='BOOL')?.name??'';
 const reset=tags.find(t=>t.name==='RESET')?.name??tags.find(t=>t.name==='STOP')?.name??bool;
 const numeric=firstNumeric(tags,'RAW')?.name;
 const input:Expr={id:uid(),type:'NO',tag:bool};
 if(kind==='NO'||kind==='NC')return {...input,type:kind};
 if(kind==='R_TRIG'||kind==='F_TRIG')return {id:uid(),type:kind,input};
 if(kind==='TON'||kind==='TOF'||kind==='TP')return {id:uid(),type:kind,pt:1000,input};
 if(kind==='CTU')return {id:uid(),type:kind,pv:3,input,reset:{id:uid(),type:'NO',tag:reset}};
 return {id:uid(),type:'COMPARE',op:compareOp,a:tagValue(numeric),b:literal(0)};
}
