import {Runtime} from '../plc/runtime';
import {compile} from '../plc/compiler';
import {walk,type Program} from '../plc/model';
import {material,type Suite,type PrivateChallenge} from './private';
export interface TestResult {name:string;category:string;pass:boolean;message:string;at?:number;tag?:string;expected?:boolean|number;actual?:boolean|number}
export function execute(program:Program,suite:Suite):TestResult {
 try {const rt=new Runtime(program);let index=0;const steps=[...suite.steps].sort((a,b)=>a.at-b.at);for(let time=0;time<=steps[steps.length-1].at;time+=10){const checks=[];while(index<steps.length&&steps[index].at===time){Object.assign(rt.inputs,steps[index].inputs);checks.push(steps[index++]);}rt.scan(10);for(const s of checks)for(const[tag,expected]of Object.entries(s.expect)){const actual=rt.memory.read(tag);const pass=typeof expected==='number'?typeof actual==='number'&&Math.abs(actual-expected)<.02:actual===expected;if(!pass)return {name:suite.name,category:suite.category,pass:false,message:s.reason,at:time,tag,expected,actual};}}return {name:suite.name,category:suite.category,pass:true,message:'Giriş sırası ve zaman sınırları doğrulandı.'};}catch(e){return {name:suite.name,category:suite.category,pass:false,message:String(e)};}
}
const valid=new Map<string,PrivateChallenge>();
export function validated(id:number,seed:number){const key=`${id}/${seed}`;if(valid.has(key))return valid.get(key)!;const m=material(id,seed);const bad=m.suites.map(s=>execute(m.reference,s)).filter(r=>!r.pass);if(bad.length)throw Error(`Reference validation failed: ${JSON.stringify(bad)}`);if(valid.size>100)valid.clear();valid.set(key,m);return m;}
export function evaluate(program:Program,id:number,seed:number,hints=0){
 const m=validated(id,seed),diagnostics=compile(program),results=m.suites.map(s=>execute(program,s));
 const logic=results.filter(r=>r.category==='logic'),safety=results.filter(r=>r.category==='safety'),ratio=(r:TestResult[])=>r.length?r.filter(x=>x.pass).length/r.length:results.filter(x=>x.pass).length/results.length;
 const warnings=diagnostics.filter(d=>d.severity==='warning');let count=0;for(const b of program.blocks)for(const n of b.networks)walk(n.logic,()=>count++);
 const passed=results.every(r=>r.pass)&&!diagnostics.some(d=>d.severity==='error');
 const scores={logic:Math.round(40*ratio(logic)),safety:Math.round(20*ratio(safety)),structure:Math.max(0,15-warnings.length*5),conventions:diagnostics.some(d=>d.severity==='error')?0:10,efficiency:count>200?2:5,debugging:passed?Math.max(0,10-Math.min(10,hints*2)):0};
 const score=Object.values(scores).reduce((a,b)=>a+b,0);const first=results.find(r=>!r.pass);
 return {passed,score,scores,results,diagnostics,feedback:first?{what:first.message,why:`${first.at??0} ms anında ${first.tag??'program'} beklenen=${String(first.expected)}, gerçekleşen=${String(first.actual)}.`,impact:first.category==='safety'?'Gerçek bir sistemde beklenmeyen hareket veya ekipman hasarı doğurabilir.':'İş sırası, ürün kalitesi veya çevrim süresi bozulabilir.',question:m.public.hints[0]}:{what:'Program tüm davranış ve arıza dizilerini geçti.',why:'Scan sırası ve zamana bağlı beklentiler sağlandı.',impact:'Aynı kavramı farklı bir endüstriyel probleme taşıyabilirsin.',question:'Bu kontrol mantığını bir pompa veya fan için nasıl uyarlarsın?'}};
}
export type Evaluation=ReturnType<typeof evaluate>;
