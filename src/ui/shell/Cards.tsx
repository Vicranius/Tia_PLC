'use client';
import {useState,type ReactNode} from 'react';
import {Pause,ShieldAlert,StepForward} from 'lucide-react';
import type {Challenge} from '../../challenges/catalog';
import {catalogFor,conceptLabel} from '../../challenges/catalog';
import {Choice} from '../Choice';
import {useLang,useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';
import {CardSection,NotAvailable} from './TaskCards';

// Testing task card: CPU operator panel (LEDs + RUN/STOP/MRES), scan control and the process simulation.
export function TestingCard({mode,scans,time,forces,errors,busy,speed,onRun,onStop,onMres,onPause,onStep,onSpeed,process}:{mode:string;scans:number;time:number;forces:number;errors:number;busy:boolean;speed:string;onRun:()=>void;onStop:()=>void;onMres:()=>void;onPause:()=>void;onStep:()=>void;onSpeed:(speed:string)=>void;process:ReactNode}){
 const t=useT(shellDict),[open,setOpen]=useState<Set<string>>(()=>new Set(['cpu','scan','process']));
 const flip=(id:string)=>setOpen(s=>{const n=new Set(s);if(n.has(id))n.delete(id);else n.add(id);return n;});
 const running=mode==='RUN';
 return <div className="tia-testing">
  <CardSection title={t('testing.cpuPanel')} open={open.has('cpu')} onToggle={()=>flip('cpu')}><div className="tia-cpu-panel"><div className="tia-cpu-head"><b>PLC_1</b><span>{t('testing.mode')}: <strong className={running?'run':'stop'}>{mode}</strong></span></div>
   <div className="tia-cpu-body"><ul className="tia-leds" aria-label="LED"><li><i className={running?'led green':'led yellow'}/>RUN / STOP</li><li><i className={mode==='ERROR'||errors?'led red':'led off'}/>ERROR</li><li><i className={forces?'led yellow':'led off'}/>MAINT</li></ul>
   <div className="tia-cpu-buttons"><button className={running?'pressed':''} disabled={busy||running} onClick={onRun}>RUN</button><button className={!running?'pressed':''} disabled={!running} onClick={onStop}>STOP</button><button disabled={busy||running} onClick={onMres}>{t('testing.mres')}</button></div></div>
   <p className="tia-muted">{t('testing.note')}</p></div></CardSection>
  <CardSection title={t('testing.scanControl')} open={open.has('scan')} onToggle={()=>flip('scan')}><div className="tia-scan-control"><button title={t('testing.pause')} aria-label={t('testing.pause')} onClick={onPause}><Pause size={14}/>{t('testing.pause')}</button><button disabled={busy} onClick={onStep}><StepForward size={14}/>{t('testing.singleScan')}</button><Choice label={t('testing.speed')} value={speed} options={['0.25','0.5','1','2','5'].map(v=>({value:v,label:`${v}×`}))} onChange={onSpeed}/><span className="tia-muted">{t('testing.cycle',{n:scans,ms:time})}</span></div></CardSection>
  <CardSection title={t('testing.process')} open={open.has('process')} grow onToggle={()=>flip('process')}>{process}</CardSection>
 </div>;
}

// Tasks task card: the active industrial exercise, its I/O contract and the scored test.
export function TasksCard({c,locked,busy,onChoose,onVariant,onDebug,onCheck,onLearning,onInstructor,exercise}:{c:Challenge;locked:boolean;busy:boolean;onChoose:(id:number)=>void;onVariant:()=>void;onDebug:()=>void;onCheck:()=>void;onLearning:()=>void;onInstructor:()=>void;exercise:ReactNode}){
 const t=useT(shellDict),{lang}=useLang(),list=catalogFor(lang),[open,setOpen]=useState<Set<string>>(()=>new Set(['exercise','io']));
 const flip=(id:string)=>setOpen(s=>{const n=new Set(s);if(n.has(id))n.delete(id);else n.add(id);return n;});
 return <div className="tia-tasks">
  <div className="challenge-chooser"><span className="eyebrow">{t('tasks.exercise',{id:String(c.id).padStart(2,'0'),total:list.length})}</span><span className="level">{t('tasks.level',{n:c.level})}</span></div>
  <Choice label={t('tasks.choose')} value={String(c.id)} disabled={locked} options={list.map(x=>({value:String(x.id),label:`${String(x.id).padStart(2,'0')} · ${x.title}`}))} onChange={id=>onChoose(Number(id))}/>
  <div className="concept-chips">{c.concepts.map(x=><span key={x}>{conceptLabel(x,lang)}</span>)}</div>
  <CardSection title={t('tasks.requirements')} open={open.has('exercise')} onToggle={()=>flip('exercise')}>{exercise}</CardSection>
  <CardSection title={t('tasks.io')} open={open.has('io')} onToggle={()=>flip('io')}><div className="challenge-io">{c.tags.filter(x=>!x.address.startsWith('%M')&&(x.type==='BOOL'||[17,18,21,22,23,27].includes(c.id))).map(x=><div key={x.name}><code>{x.address}</code><span>{x.name}</span><small>{x.comment}</small></div>)}</div></CardSection>
  <div className="tia-task-actions"><button className="primary" disabled={busy} onClick={onCheck}>{t('tasks.check')}</button><button onClick={onInstructor}>{t('tasks.instructor')}</button><button disabled={locked} onClick={onVariant}>{t('tasks.newVariant')}</button><button disabled={locked} onClick={onDebug}>{t('tasks.debug')}</button><button onClick={onLearning}>{t('tasks.learning')}</button></div>
  <p className="seed">{t('tasks.variant',{seed:c.seed})}</p>
  <div className="safety-note"><ShieldAlert size={16}/><span>{t('tasks.safety')}</span></div>
 </div>;
}
export function LibrariesCard(){const t=useT(shellDict),[open,setOpen]=useState<Set<string>>(()=>new Set());const flip=(id:string)=>setOpen(s=>{const n=new Set(s);if(n.has(id))n.delete(id);else n.add(id);return n;});return <div>{(['card.projectLibrary','card.globalLibraries'] as const).map(k=><CardSection key={k} title={t(k)} open={open.has(k)} onToggle={()=>flip(k)}><NotAvailable text={t('card.notAvailable')}/></CardSection>)}</div>;}
