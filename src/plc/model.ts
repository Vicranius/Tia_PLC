export type DataType = 'BOOL'|'BYTE'|'WORD'|'DWORD'|'INT'|'DINT'|'REAL'|'TIME';
export type Scalar = boolean|number;
export interface Tag {inputMode?:'toggle'|'momentary';name:string;type:DataType;address:string;initial:Scalar;comment:string}
export type Value = {kind:'literal';value:number}|{kind:'tag';tag:string}|{kind:'calc';op:'ADD'|'SUB'|'MUL'|'DIV'|'INT_TO_REAL'|'REAL_TO_INT'|'WORD_TO_INT'|'NORM_X'|'SCALE_X';a:Value;b:Value;c?:Value};
export type Expr = {id:string;type:'NO'|'NC';tag:string}|{id:string;type:'AND'|'OR';children:Expr[]}|{id:string;type:'TON'|'TOF'|'TP';pt:number;input:Expr}|{id:string;type:'CTU';pv:number;input:Expr;reset:Expr}|{id:string;type:'R_TRIG'|'F_TRIG';input:Expr}|{id:string;type:'COMPARE';op:'=='|'<>'|'>'|'<'|'>='|'<=';a:Value;b:Value};
export interface Output {unassigned?:boolean;type:'COIL'|'SET'|'RESET'|'MOVE';tag:string;value?:Value}
export interface Network {id:string;title:string;comment?:string;logic:Expr;output:Output}
export interface Block {id:string;kind:'OB'|'FC'|'FB';networks:Network[]}
export interface Program {version:1;cpu:string;tags:Tag[];blocks:Block[]}
export interface Diagnostic {code:string;severity:'error'|'warning';message:string;network?:string}
export interface Trace {value:boolean;detail:string}
export interface TimerState {q:boolean;et:number;start:number|null;previous:boolean}
export interface CounterState {q:boolean;cv:number;previous:boolean}
export const uid=()=>globalThis.crypto.randomUUID();
export const blankNetwork=(tag='MOTOR'):Network=>({id:uid(),title:'Yeni network',logic:{id:uid(),type:'AND',children:[]},output:{type:'COIL',tag,unassigned:true}});
export function walk(expr:Expr, visit:(e:Expr)=>void) {visit(expr);if('children'in expr)expr.children.forEach(e=>walk(e,visit));if('input'in expr)walk(expr.input,visit);if('reset'in expr)walk(expr.reset,visit);}
export const types:DataType[]=['BOOL','BYTE','WORD','DWORD','INT','DINT','REAL','TIME'];
