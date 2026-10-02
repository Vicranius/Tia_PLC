'use client';
import {useEffect,useRef,useState,useCallback} from 'react';
import simulationWorkerUrl from '../simulation/worker.ts?worker&url';
import {challenge,emptyProgram,type Challenge} from '../challenges/catalog';
import {blankNetwork,type Program,type Scalar,type Network} from '../plc/model';
import {compile,parseProgram} from '../plc/compiler';
import type {Snapshot} from '../plc/runtime';
import type {Evaluation} from '../challenges/evaluator';
import {Plant,type PlantState} from '../simulation/conveyor';
import {translator,type Lang} from '../i18n/core';
import {useLang} from '../i18n/react';
import {labDict} from '../i18n/dict/lab';
export interface Attempt {challenge:number;seed:number;score:number;passed:number;concepts:string;created:number}
export interface Solution {program?:Program;network?:Network|null;explanations:string[];scan:string;why:string;common:string}
export async function api<T>(body:Record<string,unknown>,lang:Lang='en'):Promise<T>{const r=await fetch('/api/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,lang})});const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error??translator(labDict,lang)('failed'));return data as T;}
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
export function useLab(){
 const {lang}=useLang(),t=translator(labDict,lang),langRef=useRef(lang);langRef.current=lang;
 const [c,setC]=useState<Challenge>(()=>challenge(3,0,lang));const [program,setProgram]=useState<Program>(()=>{const initial=challenge(3,0,lang);return {...emptyProgram(initial),blocks:[{id:'OB1',kind:'OB',networks:[{...blankNetwork(),id:'initial-network',logic:{id:'initial-path',type:'AND',children:[]}}]},{id:'OB100',kind:'OB',networks:[]}]};});
 const [snapshot,setSnapshot]=useState<Snapshot>();const [plant,setPlant]=useState<PlantState>(new Plant().snapshot());const [mode,setMode]=useState('STOP');const [cycle,setCycle]=useState(0);const [monitor,setMonitor]=useState(true);const [speed,setSpeed]=useState('1');const [status,setMessage]=useState(()=>translator(labDict,lang)('start'));const [busy,setBusy]=useState(false);const [result,setResult]=useState<Evaluation>();const [hints,setHints]=useState(0);const [solution,setSolution]=useState<Solution>();const [stepIndex,setStepIndex]=useState(0);const [attempts,setAttempts]=useState<Attempt[]>([]);const [history,setHistory]=useState<Program[]>([]);const [redo,setRedo]=useState<Program[]>([]);const [saved,setSaved]=useState(false);const [downloaded,setDownloaded]=useState<Program|null>(null);const worker=useRef<Worker|null>(null);
 const acks=useRef(new Map<number,(ok:boolean)=>void>()),nextAck=useRef(1);
 const send=useCallback((m:Record<string,unknown>)=>worker.current?.postMessage({lang:langRef.current,...m}),[]);
 const refresh=useCallback(async()=>{try{const r=await fetch(`/api/lab?action=profile&lang=${langRef.current}`);const d=await r.json() as {error?:string;attempts:Attempt[]};if(!r.ok)throw Error(d.error);setAttempts(d.attempts);}catch(e){setMessage(translator(labDict,langRef.current)('progress',{error:message(e)}));}},[]);
 useEffect(()=>{const tr=translator(labDict,langRef.current);let w:Worker;try{w=new Worker(new URL(simulationWorkerUrl,window.location.origin),{type:'module'});}catch(error){setMode('ERROR');setMessage(tr('simulation',{error:message(error)}));return;}worker.current=w;w.onmessage=(event:MessageEvent<{snapshot?:Snapshot;plant:PlantState;mode:string;cycle:number;error?:string;ack?:number}>)=>{if(event.data.ack!==undefined){acks.current.get(event.data.ack)?.(!event.data.error);acks.current.delete(event.data.ack);}setSnapshot(event.data.snapshot);setPlant(event.data.plant);setMode(event.data.mode);setCycle(event.data.cycle);if(event.data.error)setMessage(event.data.error);};w.onerror=e=>{setMode('ERROR');setMessage(tr('simulation',{error:e.message}));};w.postMessage({action:'lang',lang:langRef.current});let alive=true;
 void (async()=>{try{const lang=langRef.current;await fetch(`/api/lab?id=3&seed=0&lang=${lang}`);const r=await fetch(`/api/lab?action=restore&lang=${lang}`);const d=await r.json() as {error?:string;project?:{id:number;seed:number;program:unknown}};if(!r.ok)throw Error(d.error);if(alive&&d.project){const p=parseProgram(d.project.program,lang);setProgram(p);setC(challenge(d.project.id,d.project.seed,lang));setSaved(true);setMessage(tr('restored'));}if(alive)await refresh();}catch(e){if(alive)setMessage(tr('storage',{error:message(e)}));}})();return()=>{alive=false;w.terminate();worker.current=null;};},[refresh]);
 // A language switch re-localizes exercise text and the running simulation's trace/alarms without resetting it.
 // The last test result and solution are fetched again in the new language (the check is replayed, not recorded); answers that
 // arrive after another switch are dropped, so the screen never mixes languages.
 const epoch=useRef(0),lastCheck=useRef<{program:Program;hints:number}|null>(null),lastSolution=useRef<number|null>(null);
 useEffect(()=>{setC(prev=>challenge(prev.id,prev.seed,lang));worker.current?.postMessage({action:'lang',lang});const mine=++epoch.current;
  if(lastCheck.current&&result)void api<Evaluation>({action:'check',id:c.id,seed:c.seed,...lastCheck.current,replay:true},lang).then(r=>{if(mine===epoch.current)setResult(r);}).catch(()=>{});
  if(lastSolution.current!==null&&solution)void api<Solution>({action:'solution',id:c.id,seed:c.seed,index:lastSolution.current},lang).then(r=>{if(mine===epoch.current)setSolution(r);}).catch(()=>{});
 },[lang]);
 // As in TIA, the CPU keeps the last downloaded program; offline edits reach it only through download().
 useEffect(()=>{setSnapshot(undefined);setDownloaded(null);send({action:'clear',plant:c.plant});},[c.plant,c.id,send]);
 const commit=(p:Program)=>{setHistory(h=>[...h.slice(-29),program]);setRedo([]);setProgram(p);setResult(undefined);setSaved(false);};
 const undo=()=>{if(!history.length)return;setRedo(r=>[program,...r]);setProgram(history[history.length-1]);setHistory(history.slice(0,-1));setSaved(false);setResult(undefined);};
 const redoAction=()=>{if(!redo.length)return;setHistory(h=>[...h,program]);setProgram(redo[0]);setRedo(redo.slice(1));setSaved(false);setResult(undefined);};
 const guard=()=>{const ds=compile(program,lang);if(ds.some(d=>d.severity==='error')){setMessage(t('compileErrors',{n:ds.filter(d=>d.severity==='error').length}));return false;}return true;};
 // The CPU holds the program only after the worker confirms the load; a missing confirmation (3 s) counts as failure.
 const download=(start=false)=>new Promise<boolean>(resolve=>{if(!guard())return resolve(false);const id=nextAck.current++,loaded=program;let timer=0;
  acks.current.set(id,ok=>{window.clearTimeout(timer);if(ok){setDownloaded(loaded);if(start)send({action:'run'});}resolve(ok);});
  timer=window.setTimeout(()=>{if(acks.current.delete(id)){setMessage(t('loadTimeout'));resolve(false);}},3000);setSnapshot(undefined);send({action:'load',program:loaded,plant:c.plant,ack:id});});
 const run=(action='run')=>{if(!downloaded)return false;send({action});return true;};
 const unload=()=>{setSnapshot(undefined);setDownloaded(null);send({action:'clear',plant:c.plant});};
 const save=async()=>{try{await api({action:'save',id:c.id,seed:c.seed,program},lang);setSaved(true);setMessage(t('saved'));}catch(e){setMessage(message(e));}};
 const loadChallenge=async(id:number,seed=0,debug=false)=>{setBusy(true);try{await api({action:'save',id:c.id,seed:c.seed,program},lang);const r=await fetch(`/api/lab?id=${id}&seed=${seed}&lang=${lang}`);const d=await r.json() as {error?:string;challenge:Challenge};if(!r.ok)throw Error(d.error);const next=d.challenge;const p=emptyProgram(next);p.blocks[0].networks=[blankNetwork(next.tags.find(x=>x.address.startsWith('%Q'))?.name??'TEMP')];if(debug){const s=await api<Solution>({action:'solution',id,seed},lang);if(s.program){p.blocks=s.program.blocks;const net=p.blocks[0].networks[0];if(net.logic.type==='AND')net.logic.children=net.logic.children.filter(x=>!('tag'in x&&x.tag==='STOP'));}}setC(next);setProgram(p);setHistory([]);setRedo([]);setHints(0);setResult(undefined);setSolution(undefined);setStepIndex(0);setSaved(false);setMessage(debug?t('debug'):t('ready'));}catch(e){setMessage(message(e));}finally{setBusy(false);}};
 const check=async()=>{if(!guard())return;setBusy(true);const mine=epoch.current;try{const r=await api<Evaluation>({action:'check',id:c.id,seed:c.seed,program,hints},lang);lastCheck.current={program,hints};if(mine===epoch.current)setResult(r);else void api<Evaluation>({action:'check',id:c.id,seed:c.seed,program,hints,replay:true},langRef.current).then(setResult).catch(()=>{});setMessage(r.passed?t('passed'):t('failedTests'));await refresh();}catch(e){setMessage(message(e));}finally{setBusy(false);}};
 const reveal=async(next=false)=>{setBusy(true);try{const mine=epoch.current;const r=await api<Solution>({action:next?'next':'solution',id:c.id,seed:c.seed,index:stepIndex},lang);lastSolution.current=stepIndex;if(mine===epoch.current)setSolution(r);setHints(h=>Math.min(100,h+1));if(next&&r.network){const ns=[...program.blocks[0].networks];ns[stepIndex]=r.network;commit({...program,blocks:program.blocks.map((b,i)=>i===0?{...b,networks:ns}:b)});setStepIndex(i=>i+1);}else if(!next&&r.program)commit(r.program);setMessage(next?(r.network?t('nextStep'):t('allShown')):t('reference'));}catch(e){setMessage(message(e));}finally{setBusy(false);}};
 const resetExercise=()=>{const p=emptyProgram(c);p.blocks[0].networks=[blankNetwork(c.tags.find(x=>x.address.startsWith('%Q'))?.name??'TEMP')];commit(p);setHints(0);setSolution(undefined);setStepIndex(0);setMessage(t('reset'));};
 const input=(tag:string,value:Scalar)=>send({action:'input',tag,value});
 return {c,program,downloaded,download,unload,commit,snapshot,plant,mode,cycle,monitor,setMonitor,speed,setSpeed,message:status,setMessage,busy,result,hints,setHints,solution,attempts,saved,history,redo,undo,redoAction,send,run,save,loadChallenge,resetExercise,check,reveal,input};
}
