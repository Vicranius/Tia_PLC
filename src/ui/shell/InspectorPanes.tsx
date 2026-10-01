'use client';
import {useState} from 'react';
import {CircleCheck,CircleX,FlaskConical,Lightbulb,TriangleAlert} from 'lucide-react';
import type {Block,Diagnostic,Program} from '../../plc/model';
import type {Snapshot} from '../../plc/runtime';
import type {Evaluation} from '../../challenges/evaluator';
import type {Challenge} from '../../challenges/catalog';
import type {Solution} from '../useLab';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';
import {find} from '../../ladder/editing';
import {walk} from '../../plc/model';
import {blockName,blockNumber} from '../../plc/blocks';
import {blocksDict} from '../../i18n/dict/blocks';

export interface LogEntry {time:string;text:string;kind:'ok'|'warning'|'error'}
const scoreKeys={logic:'tests.s.logic',safety:'tests.s.safety',structure:'tests.s.structure',conventions:'tests.s.conventions',efficiency:'tests.s.efficiency',debugging:'tests.s.debugging'} as const;

// Properties › General for a block, laid out like the TIA block properties (left navigation + form).
export function BlockProperties({block,name,onRename,locked=false}:{block:Block;name?:string;onRename?:(name:string)=>void;locked?:boolean}){
 const shown=name??blockName(block);
 const t=useT(shellDict),tb=useT(blocksDict),[section,setSection]=useState('general');
 const nav=(['general','information','timeStamps','compilation','protection','attributes'] as const);
 return <div className="tia-props"><nav className="tia-props-nav">{nav.map(k=><button key={k} className={section===k?'active':''} disabled={k!=='general'} onClick={()=>setSection(k)}>{t(`props.${k}`)}</button>)}</nav><div className="tia-props-form"><h4>{t('props.general')}</h4>
  <label><span>{t('props.name')}:</span><input aria-label={t('props.name')} readOnly={!onRename||locked} defaultValue={shown} key={block.id+shown} onBlur={e=>{if(onRename&&e.target.value.trim()!==shown)onRename(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter')(e.target as HTMLInputElement).blur();}}/></label><label><span>{t('props.type')}:</span><input readOnly value={`${block.kind} · ${tb(`kind.${block.kind}`)}`}/></label>{block.kind!=='DB'&&<label><span>{t('props.language')}:</span><input readOnly value="LAD"/></label>}<label><span>{t('props.number')}:</span><input readOnly value={blockNumber(block)}/></label>{block.kind!=='DB'&&<label><span>{t('props.networks')}:</span><input readOnly value={block.networks.length}/></label>}
 </div></div>;
}
export function MessageLog({log}:{log:LogEntry[]}){
 const t=useT(shellDict);
 return log.length?<table className="tia-grid tia-log"><thead><tr><th/><th>{t('info.time')}</th><th>{t('info.message')}</th></tr></thead><tbody>{[...log].reverse().map((m,i)=><tr key={i}><td>{m.kind==='ok'?<CircleCheck size={13} color="#2e9b48"/>:m.kind==='warning'?<TriangleAlert size={13} color="#d58a00"/>:<CircleX size={13} color="#c0392b"/>}</td><td>{m.time}</td><td>{m.text}</td></tr>)}</tbody></table>:<p className="tia-muted">{t('info.empty')}</p>;
}
export function CompileList({diagnostics,onFocus}:{diagnostics:Diagnostic[];onFocus:(network?:string)=>void}){
 const t=useT(shellDict),errors=diagnostics.filter(d=>d.severity==='error').length;
 return <div className="tia-compile"><p className={errors?'error':'ok'}>{errors?<CircleX size={14}/>:<CircleCheck size={14}/>}{t('info.compileSummary',{e:errors,w:diagnostics.length-errors})}</p>{diagnostics.map((d,i)=><button key={i} className={`diagnostic ${d.severity}`} onClick={()=>onFocus(d.network)}><code>{d.code}</code>{d.message}</button>)}</div>;
}
export function TestResults({result,busy,onCheck,onNext}:{result?:Evaluation;busy:boolean;onCheck:()=>void;onNext:()=>void}){
 const t=useT(shellDict);
 if(!result)return <div className="panel-empty"><FlaskConical size={24}/><b>{t('tests.emptyTitle')}</b><p>{t('tests.emptyText')}</p><button disabled={busy} className="primary" onClick={onCheck}>{busy?t('tests.busy'):t('tests.check')}</button></div>;
 return <div className="test-layout"><div className={`score-box ${result.passed?'passed':''}`}><small>{t('tests.result')}</small><strong>{result.score}<span>/100</span></strong><p>{result.passed?t('tests.passed'):t('tests.failed')}</p>{Object.entries(result.scores).map(([k,v])=><div key={k}><span>{k in scoreKeys?t(scoreKeys[k as keyof typeof scoreKeys]):k}</span><b>{v}</b></div>)}</div>
  <div className="test-results">{result.results.map((r,i)=><div key={i} className={`test-row ${r.pass?'pass':'fail'}`}><span>{r.pass?'✓':'×'}</span><div><b>{r.title??r.name}</b>{!r.pass&&<p>{r.message}<br/><code>{r.at} ms · {r.tag}: {t('tests.expected')} {String(r.expected)} / {t('tests.actual')} {String(r.actual)}</code></p>}</div><strong>{r.pass?t('tests.pass'):t('tests.fail')}</strong></div>)}{result.passed&&<button onClick={onNext}>{t('tests.next')}</button>}<small>{t('tests.note')}</small></div></div>;
}
export function Instructor({c,result,hints,solution,busy,locked,onCheck,onHint,onNext,onSolution}:{c:Challenge;result?:Evaluation;hints:number;solution?:Solution;busy:boolean;locked:boolean;onCheck:()=>void;onHint:()=>void;onNext:()=>void;onSolution:()=>void}){
 const t=useT(shellDict),[answer,setAnswer]=useState(''),[reply,setReply]=useState('');
 return <div className="instructor"><div className="instructor-title"><Lightbulb size={22}/><div><b>{t('instructor.title')}</b><small>{t('instructor.sub')}</small></div></div>
  <div className="instructor-buttons"><button disabled={busy} onClick={onCheck}>{t('tests.check')}</button><button onClick={onHint}>{t('instructor.hint')}</button><button onClick={()=>setReply(result?.feedback.what??t('instructor.testFirst'))}>{t('instructor.explain')}</button><button disabled={locked} onClick={onNext}>{t('instructor.next')}</button><button disabled={locked} onClick={onSolution}>{t('instructor.solution')}</button></div>
  {hints>0&&<div className="hint-box">{c.hints[Math.min(2,hints-1)]}</div>}
  {result&&<div className="feedback-grid"><p><b>{t('instructor.what')}</b>{result.feedback.what}</p><p><b>{t('instructor.why')}</b>{result.feedback.why}</p><p><b>{t('instructor.impact')}</b>{result.feedback.impact}</p></div>}
  <p>{result?.feedback.question??c.hints[0]}</p>
  <div className="socratic-input"><input aria-label={t('instructor.answer')} placeholder={t('instructor.placeholder')} value={answer} onChange={e=>setAnswer(e.target.value)}/><button onClick={()=>setReply(answer.trim().length<8?t('instructor.short'):c.concepts.includes('Seal-in')?t('instructor.sealIn'):t('instructor.edge'))}>{t('instructor.reply')}</button></div>
  {reply&&<div className="note">{reply}</div>}
  {solution&&<details open><summary>{t('instructor.explanation')}</summary>{solution.explanations.map(x=><p key={x}>{x}</p>)}<p><b>{t('instructor.scanCycle')}</b> {solution.scan}</p><p><b>{t('instructor.whyCorrect')}</b> {solution.why}</p><p><b>{t('instructor.common')}</b> {solution.common}</p></details>}
 </div>;
}
// "Why" explains one element of the last scan: operand, instruction rule, and the trace of everything feeding it.
export function ScanWhy({program,snapshot,why,cycle,busy,onStep}:{program:Program;snapshot?:Snapshot;why:string;cycle:number;busy:boolean;onStep:()=>void}){
 const t=useT(shellDict),lines:string[]=[];
 if(why&&snapshot)for(const b of program.blocks)for(const n of b.networks){const expr=find(n.logic,why);if(expr&&'tag'in expr){const tag=program.tags.find(x=>x.name===expr.tag);lines.push(t('scan.operand',{tag:expr.tag,address:tag?.address??'???',type:expr.type}));lines.push(expr.type==='NO'?t('scan.no'):expr.type==='NC'?t('scan.nc'):t(expr.type==='P'?'scan.rising':'scan.falling',{type:expr.type}));}if(expr)walk(expr,e=>{if(snapshot.trace[e.id])lines.push(snapshot.trace[e.id].detail);});if(n.id===why){lines.push(t('scan.output',{tag:n.output.tag,address:program.tags.find(x=>x.name===n.output.tag)?.address??'???',value:String(snapshot.values[n.output.tag]).toUpperCase()}));lines.push(snapshot.trace[n.id]?.value?t('scan.pathTrue'):n.output.type==='SET'||n.output.type==='RESET'?t('scan.pathHold'):t('scan.pathFalse'));lines.push(snapshot.trace[n.id]?.detail??t('scan.notRun'));walk(n.logic,e=>{if(snapshot.trace[e.id])lines.push(snapshot.trace[e.id].detail);});}}
 return <div className="scan-debug"><div><h3>{t('scan.title',{n:snapshot?.scans??0})}</h3><p>{t('scan.time',{ms:snapshot?.time??0})}</p><p>{t('scan.step',{ms:cycle.toFixed(3)})}</p><button disabled={busy} onClick={onStep}>{t('scan.single')}</button></div><div><h3>{t('scan.why')}</h3>{lines.length?lines.map((x,i)=><code key={i}>{x}</code>):<p>{t('scan.whyEmpty')}</p>}</div><details><summary>{t('scan.memory')}</summary><pre>{JSON.stringify({before:snapshot?.before,after:snapshot?.values,timers:snapshot?.timers,counters:snapshot?.counters},null,2)}</pre></details></div>;
}
export function DeviceInformation({mode,snapshot,cycle,diagnostics,onFocus}:{mode:string;snapshot?:Snapshot;cycle:number;diagnostics:Diagnostic[];onFocus:(network?:string)=>void}){
 const t=useT(shellDict);
 return <div className="diagnostics-view"><h2>{t('diag.title')}</h2><div className="diagnostic-stats"><div>{t('diag.mode')}<b>{mode}</b></div><div>{t('diag.scans')}<b>{snapshot?.scans??0}</b></div><div>{t('diag.timers')}<b>{Object.values(snapshot?.timers??{}).filter(x=>x.start!==null).length}</b></div><div>{t('diag.counters')}<b>{Object.keys(snapshot?.counters??{}).length}</b></div><div>{t('diag.forces')}<b>{Object.keys(snapshot?.forces??{}).length}</b></div></div><p>{t('diag.cycle',{ms:cycle.toFixed(3)})}</p>{diagnostics.map((d,i)=><button className={`diagnostic ${d.severity}`} key={i} onClick={()=>onFocus(d.network)}><code>{d.code}</code>{d.message}</button>)}{!diagnostics.length&&<div className="success-note">{t('diag.clean')}</div>}</div>;
}
