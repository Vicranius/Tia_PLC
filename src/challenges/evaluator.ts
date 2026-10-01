import {Runtime} from '../plc/runtime';
import {compile} from '../plc/compiler';
import {walk,type Program} from '../plc/model';
import {translator,type Lang} from '../i18n/core';
import {serverDict} from '../i18n/dict/server';
import {material,type Suite,type PrivateChallenge} from './private';
import {catalog} from './catalog';
// name = stable, language-independent test key (e.g. 'Seal-in'); title = localized display name; message = localized reason.
export interface TestResult {name:string;title:string;category:string;pass:boolean;message:string;at?:number;tag?:string;expected?:boolean|number;actual?:boolean|number}
export function execute(program:Program,suite:Suite,lang:Lang='en'):TestResult {
 const base={name:suite.name,title:suite.title,category:suite.category};
 try {const rt=new Runtime(program,{lang});let index=0;const steps=[...suite.steps].sort((a,b)=>a.at-b.at);for(let time=0;time<=steps[steps.length-1].at;time+=10){const checks=[];while(index<steps.length&&steps[index].at===time){Object.assign(rt.inputs,steps[index].inputs);checks.push(steps[index++]);}rt.scan(10);for(const s of checks)for(const[tag,expected]of Object.entries(s.expect)){const actual=rt.memory.read(tag);const pass=typeof expected==='number'?typeof actual==='number'&&Math.abs(actual-expected)<.02:actual===expected;if(!pass)return {...base,pass:false,message:s.reason,at:time,tag,expected,actual};}}return {...base,pass:true,message:translator(serverDict,lang)('passMessage')};}catch(e){return {...base,pass:false,message:e instanceof Error?e.message:String(e)};}
}
// The reference and its suites are built per language (titles and reasons are localized, the logic is identical).
const valid=new Map<string,PrivateChallenge>();
export function validated(id:number,seed:number,lang:Lang='en'){if(!Number.isInteger(id)||id<1||id>catalog.length||!Number.isInteger(seed)||seed<0||seed>999999)throw Error(translator(serverDict,lang)('errChallenge'));const key=`${id}/${seed}/${lang}`;if(valid.has(key))return valid.get(key)!;const m=material(id,seed,lang);const bad=m.suites.map(s=>execute(m.reference,s,lang)).filter(r=>!r.pass);if(bad.length)throw Error(`Reference validation failed: ${JSON.stringify(bad)}`);if(valid.size>200)valid.clear();valid.set(key,m);return m;}
// The I/O contract: a learner may not change the address, type or initial value of the challenge tags.
export function assertContract(program:Program,m:PrivateChallenge,lang:Lang='en'){for(const expected of m.public.tags){const actual=program.tags.find(t=>t.name===expected.name);if(!actual||actual.type!==expected.type||actual.address!==expected.address||actual.initial!==expected.initial)throw Error(translator(serverDict,lang)('errContract',{name:expected.name}));}}
// Everything the solution/next API answers besides the program or network itself.
export function solutionText(m:PrivateChallenge,lang:Lang='en'){const t=translator(serverDict,lang);return {explanations:m.reference.blocks[0].networks.map((n,i)=>t('solNetwork',{n:i+1,title:n.title})),scan:t('solScan'),why:t('solWhy'),common:m.public.hints[1]};}
export function evaluate(program:Program,id:number,seed:number,hints=0,lang:Lang='en'){
 const t=translator(serverDict,lang),m=validated(id,seed,lang),diagnostics=compile(program,lang),results=m.suites.map(s=>execute(program,s,lang));
 const logic=results.filter(r=>r.category==='logic'),safety=results.filter(r=>r.category==='safety'),ratio=(r:TestResult[])=>r.length?r.filter(x=>x.pass).length/r.length:results.filter(x=>x.pass).length/results.length;
 const warnings=diagnostics.filter(d=>d.severity==='warning');let count=0;for(const b of program.blocks)for(const n of b.networks)walk(n.logic,()=>count++);
 const passed=results.every(r=>r.pass)&&!diagnostics.some(d=>d.severity==='error');
 const scores={logic:Math.round(40*ratio(logic)),safety:Math.round(20*ratio(safety)),structure:Math.max(0,15-warnings.length*5),conventions:diagnostics.some(d=>d.severity==='error')?0:10,efficiency:count>200?2:5,debugging:passed?Math.max(0,10-Math.min(10,hints*2)):0};
 const score=Object.values(scores).reduce((a,b)=>a+b,0);const first=results.find(r=>!r.pass);
 return {passed,score,scores,results,diagnostics,feedback:first?{what:first.message,why:first.tag===undefined?t('whyError'):t('why',{at:first.at??0,tag:first.tag,expected:String(first.expected),actual:String(first.actual)}),impact:first.category==='safety'?t('impactSafety'):t('impactProcess'),question:m.public.hints[0]}:{what:t('okWhat'),why:t('okWhy'),impact:t('okImpact'),question:t('okQuestion')}};
}
export type Evaluation=ReturnType<typeof evaluate>;
