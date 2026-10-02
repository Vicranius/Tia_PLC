'use client';
import {useEffect,useRef,useState} from 'react';
import {CircleCheck,CircleX,Cpu,TriangleAlert,X} from 'lucide-react';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

export type DownloadStep='connect'|'preview'|'results';
// TIA download sequence: Extended download (first time) → Load preview → Load results. Loading happens on "Load" in the
// preview; "Finish" starts the CPU when "Start all" is checked.
export default function DownloadDialog({first,simulation,cpu,running,errors,onLoad,onFinish,onCancel}:{first:boolean;simulation:boolean;cpu:string;running:boolean;errors:number;onLoad:()=>Promise<boolean>;onFinish:(start:boolean)=>void;onCancel:()=>void}){
 const t=useT(shellDict),[step,setStep]=useState<DownloadStep>(first?'connect':'preview'),[search,setSearch]=useState<'idle'|'busy'|'done'>('idle'),[stop,setStop]=useState(true),[start,setStart]=useState(true),[loading,setLoading]=useState(false);
 // Pending search/load timers die with the dialog: Cancel, X or unmount never lets a delayed load reach the CPU.
 const timers=useRef<number[]>([]),closed=useRef(false);
 useEffect(()=>()=>{closed.current=true;timers.current.forEach(window.clearTimeout);},[]);
 const later=(fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(()=>{if(!closed.current)fn();},ms));};
 const cancel=()=>{closed.current=true;timers.current.forEach(window.clearTimeout);onCancel();};
 const found=search==='done'&&simulation,blocked=errors>0||(running&&!stop)||!simulation;
 const title=step==='connect'?t('dl.title'):step==='preview'?t('dl.preview'):t('dl.results');
 const icon=(ok:boolean|'warn')=>ok==='warn'?<TriangleAlert size={14} color="#d58a00"/>:ok?<CircleCheck size={14} color="#2e9b48"/>:<CircleX size={14} color="#c0392b"/>;
 return <div className="tia-modal-backdrop"><div className="tia-dialog" role="dialog" aria-modal="true" aria-label={title}>
  <div className="tia-dialog-title"><span>{title}</span><button aria-label={t('dl.cancel')} onClick={cancel}><X size={14}/></button></div>
  {step==='connect'&&<div className="tia-dialog-body">
   <div className="tia-dl-device"><Cpu size={36} color="#4d5b67"/><div><b>PLC_1</b><span>{cpu}</span><span>PROFINET · 192.168.0.1</span></div></div>
   <div className="tia-form-grid"><label>{t('dl.interfaceType')}</label><select disabled><option>PN/IE</option></select><label>{t('dl.interface')}</label><select disabled><option>PLCSIM</option></select><label>{t('dl.connection')}</label><select disabled><option>{t('dl.slot')}</option></select></div>
   <h4>{t('dl.target')}</h4>
   <table className="tia-grid tia-dl-table"><thead><tr><th>{t('dl.device')}</th><th>{t('dl.deviceType')}</th><th>{t('dl.interfaceTypeCol')}</th><th>{t('dl.address')}</th></tr></thead><tbody>{found?<tr className="selected"><td>PLC_1</td><td>{cpu}</td><td>PN/IE</td><td>192.168.0.1</td></tr>:<tr><td colSpan={4}>&nbsp;</td></tr>}</tbody></table>
   <p className="tia-dl-status">{search==='busy'?t('dl.searching'):search==='done'?(simulation?<>{icon(true)}{t('dl.found')}</>:<>{icon(false)}{t('dl.none')}</>):''}</p>
   <div className="tia-dialog-buttons"><button disabled={search==='busy'} onClick={()=>{setSearch('busy');later(()=>setSearch('done'),500);}}>{t('dl.search')}</button><span className="tia-grow"/><button className="primary" disabled={!found} onClick={()=>setStep('preview')}>{t('dl.load')}</button><button onClick={cancel}>{t('dl.cancel')}</button></div>
  </div>}
  {step==='preview'&&<div className="tia-dialog-body">
   <p className="tia-dl-status">{!simulation?<>{icon(false)}{t('dl.none')}</>:blocked?<>{icon(false)}{t('dl.notReady')}</>:<>{icon(true)}{t('dl.ready')}</>}</p>
   <table className="tia-grid tia-dl-table"><thead><tr><th>{t('dl.status')}</th><th>{t('dl.col.target')}</th><th>{t('dl.message')}</th><th>{t('dl.action')}</th></tr></thead><tbody>
    <tr className="section"><td>{icon(blocked?false:true)}</td><td>PLC_1</td><td>{blocked?t('dl.notReady'):t('dl.ready')}</td><td/></tr>
    {running&&<tr><td>{icon(stop?'warn':false)}</td><td>&nbsp;&nbsp;{t('dl.stopModules')}</td><td>{t('dl.stopModulesMsg')}</td><td><select aria-label={t('dl.stopModules')} value={stop?'stop':'none'} onChange={e=>setStop(e.target.value==='stop')}><option value="stop">{t('dl.stopAll')}</option><option value="none">{t('dl.noAction')}</option></select></td></tr>}
    <tr><td>{icon(errors===0)}</td><td>&nbsp;&nbsp;{t('dl.software')}</td><td>{errors?t('dl.compileErrors',{n:errors}):t('dl.softwareMsg')}</td><td>{errors?'':t('dl.consistent')}</td></tr>
   </tbody></table>
   <div className="tia-dialog-buttons"><span className="tia-grow"/>{loading&&<span className="tia-dl-progress">{t('dl.loading')}</span>}<button className="primary" disabled={blocked||loading} onClick={()=>{setLoading(true);later(()=>{void onLoad().then(ok=>{if(closed.current)return;setLoading(false);if(ok)setStep('results');});},450);}}>{t('dl.load')}</button><button onClick={cancel}>{t('dl.cancel')}</button></div>
  </div>}
  {step==='results'&&<div className="tia-dialog-body">
   <p className="tia-dl-status">{icon(true)}{t('dl.done')}</p>
   <table className="tia-grid tia-dl-table"><thead><tr><th>{t('dl.status')}</th><th>{t('dl.col.target')}</th><th>{t('dl.message')}</th><th>{t('dl.action')}</th></tr></thead><tbody>
    <tr className="section"><td>{icon(true)}</td><td>PLC_1</td><td>{t('dl.done')}</td><td/></tr>
    <tr><td>{icon(true)}</td><td>&nbsp;&nbsp;{t('dl.startModules')}</td><td>{t('dl.startModulesMsg')}</td><td><label className="tia-check"><input type="checkbox" checked={start} onChange={e=>setStart(e.target.checked)}/>{t('dl.startAll')}</label></td></tr>
   </tbody></table>
   <div className="tia-dialog-buttons"><span className="tia-grow"/><button className="primary" onClick={()=>onFinish(start)}>{t('dl.finish')}</button></div>
  </div>}
 </div></div>;
}
