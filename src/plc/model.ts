export type DataType = 'BOOL'|'BYTE'|'WORD'|'DWORD'|'INT'|'DINT'|'REAL'|'TIME';
export type Scalar = boolean|number;
export interface Tag {inputMode?:'toggle'|'momentary';name:string;type:DataType;address:string;initial:Scalar;comment:string}
export type Value = {kind:'literal';value:number}|{kind:'tag';tag:string}|{kind:'calc';op:'ADD'|'SUB'|'MUL'|'DIV'|'INT_TO_REAL'|'REAL_TO_INT'|'WORD_TO_INT'|'NORM_X'|'SCALE_X';a:Value;b:Value;c?:Value};
export type CounterValue=number|Value;
export type TimerValue=number|Value;
export type TimerExpr={id:string;type:'TON'|'TOF'|'TP';instance?:string;pt:TimerValue;etTag?:string;input:Expr};
export type CounterExpr=
 |{id:string;type:'CTU';instance?:string;pv:CounterValue;cvTag?:string;input:Expr;reset:Expr}
 |{id:string;type:'CTD';instance?:string;pv:CounterValue;cvTag?:string;input:Expr;load:Expr}
 |{id:string;type:'CTUD';instance?:string;pv:CounterValue;cvTag?:string;input:Expr;down:Expr;reset:Expr;load:Expr};
export type Expr = {id:string;type:'NO'|'NC'|'P'|'N';tag:string}|{id:string;type:'AND'|'OR';children:Expr[];pin?:boolean}|TimerExpr|CounterExpr|{id:string;type:'R_TRIG'|'F_TRIG';input:Expr}|{id:string;type:'COMPARE';op:'=='|'<>'|'>'|'<'|'>='|'<=';a:Value;b:Value};
// CALL: `tag` is the called block id (FC/FB); `instance` the instance DB id for an FB; `params` feed inputs, `outs` map outputs to operands.
export interface Output {unassigned?:boolean;type:'COIL'|'SET'|'RESET'|'MOVE'|'CALL';tag:string;value?:Value;instance?:string;params?:Record<string,Value>;outs?:Record<string,string>}
export interface BranchConnection {block:string;pin:"reset"|"load"|"down";source:string;side:"before"|"after"}
export interface Network {connections?:BranchConnection[];id:string;title:string;comment?:string;logic:Expr;output:Output}
export interface Variable {name:string;type:DataType;initial:Scalar;comment:string}
export type Section='input'|'output'|'inout'|'static'|'temp'|'constant';
export type BlockInterface=Partial<Record<Section,Variable[]>>;
export type BlockKind='OB'|'FC'|'FB'|'DB';
// `id` is the TIA designation (OB1, FB1, FC2, DB3); `name` the symbolic name. DBs carry `data` (global) or `instanceOf` an FB.
export interface Block {id:string;kind:BlockKind;networks:Network[];name?:string;number?:number;title?:string;iface?:BlockInterface;data?:Variable[];instanceOf?:string;obType?:'cycle'|'startup'}
export interface Program {version:1;cpu:string;tags:Tag[];blocks:Block[]}
export interface Diagnostic {code:string;severity:'error'|'warning';message:string;network?:string}
export interface Trace {incoming?:boolean;signal?:boolean;value:boolean;detail:string}
export interface TimerState {q:boolean;et:number;start:number|null;previous:boolean}
export interface CounterState {q:boolean;qu:boolean;qd:boolean;cv:number;previous:boolean;previousDown:boolean}
export const uid=()=>globalThis.crypto.randomUUID();
export const blankNetwork=(tag='MOTOR'):Network=>({id:uid(),title:'',logic:{id:uid(),type:'AND',children:[]},output:{type:'COIL',tag,unassigned:true}});
export function walk(expr:Expr, visit:(e:Expr)=>void) {visit(expr);if('children'in expr)expr.children.forEach(e=>walk(e,visit));if('input'in expr)walk(expr.input,visit);if('down'in expr)walk(expr.down,visit);if('reset'in expr)walk(expr.reset,visit);if('load'in expr)walk(expr.load,visit);}
export const types:DataType[]=['BOOL','BYTE','WORD','DWORD','INT','DINT','REAL','TIME'];
