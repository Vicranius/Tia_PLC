'use client';
import {useState} from 'react';
import {Activity,ChevronRight,CircleHelp,Cpu,FileCode2,FilePlus2,FolderOpen,Footprints,Languages,MonitorSmartphone,Network,PackageCheck,Play,Stethoscope} from 'lucide-react';
import type {Block} from '../plc/model';
import type {Challenge} from '../challenges/catalog';
import {catalogFor,conceptLabel} from '../challenges/catalog';
import {LANGS,LANG_NAMES} from '../i18n/core';
import {useLang,useT} from '../i18n/react';
import {portalDict} from '../i18n/dict/portal';

// TIA Portal view: task portals on the left, portal actions in the middle, the selected action on the right.
export type ProjectTarget={view:string;block?:string;monitor?:boolean};
type PortalId='start'|'devices'|'plc'|'hmi'|'online';
type Key=keyof typeof portalDict.en;
type Action={id:string;label:Key;icon:typeof Play};
const portals:{id:PortalId;label:Key;icon:typeof Play}[]=[{id:'start',label:'portal.start',icon:Play},{id:'devices',label:'portal.devices',icon:Network},{id:'plc',label:'portal.plc',icon:FileCode2},{id:'hmi',label:'portal.hmi',icon:MonitorSmartphone},{id:'online',label:'portal.online',icon:Stethoscope}];
const actions:Record<PortalId,Action[][]>={
 start:[[{id:'open',label:'action.open',icon:FolderOpen},{id:'create',label:'action.create',icon:FilePlus2}],[{id:'first',label:'action.first',icon:Footprints}],[{id:'software',label:'action.software',icon:PackageCheck},{id:'help',label:'action.help',icon:CircleHelp},{id:'language',label:'action.language',icon:Languages}]],
 devices:[[{id:'devices',label:'action.devices',icon:Cpu},{id:'add-device',label:'action.addDevice',icon:FilePlus2}]],
 plc:[[{id:'blocks',label:'action.blocks',icon:FileCode2}]],
 hmi:[[{id:'screens',label:'action.screens',icon:MonitorSmartphone}]],
 online:[[{id:'accessible',label:'action.accessible',icon:Activity}]],
};
const cpus=['1211C','1212C','1214C','1215C','1217C'].map(v=>`CPU ${v} DC/DC/DC`);
const blockName=(b:Block)=>b.id==='OB1'?'Main':b.id==='OB100'?'Startup':b.id;
const no=(id:number)=>String(id).padStart(2,'0');

interface Props {visible?:boolean;projectName:string;cpu:string;blocks:Block[];challenge:Challenge;mode:string;locked:boolean;saved:boolean;dirty?:boolean;message?:string;onOpen:(target?:ProjectTarget)=>void;onCreate:(id:number)=>void;onCpu:(cpu:string)=>void;onStart:()=>void;onStop:()=>void}

export default function PortalView({visible=true,projectName,cpu,blocks,challenge,mode,locked,saved,dirty=false,message='',onOpen,onCreate,onCpu,onStart,onStop}:Props){
 const t=useT(portalDict),{lang,setLang}=useLang(),exercises=catalogFor(lang),exerciseTitle=exercises.find(x=>x.id===challenge.id)?.title??challenge.title;
 const [portal,setPortal]=useState<PortalId>('start'),[last,setLast]=useState<Record<PortalId,string>>({start:'first',devices:'devices',plc:'blocks',hmi:'screens',online:'accessible'}),[template,setTemplate]=useState(challenge.id),[device,setDevice]=useState(cpu),[confirm,setConfirm]=useState<number|null>(null);
 const action=last[portal];
 // Each portal remembers its last action, as TIA does; forms start from the current project state.
 const setAction=(id:string,p:PortalId=portal)=>{setLast(l=>({...l,[p]:id}));setConfirm(null);if(id==='create')setTemplate(challenge.id);if(id==='add-device')setDevice(cpu);};
 const choose=(id:PortalId)=>{setPortal(id);setConfirm(null);};
 const create=(id:number)=>{if(locked)return;if(dirty)setConfirm(id);else onCreate(id);};
 const actionLabel=actions[portal].flat().find(a=>a.id===action)?.label,title=actionLabel?t(actionLabel):'';
 const content=()=>{switch(action){
  case 'first':return <><p className="portal-lead">{t('first.lead',{project:projectName})}</p><div className="portal-steps">
   {[{p:'devices' as const,a:'devices',label:'portal.devices' as const,text:'first.devices' as const,icon:Network},{p:'plc' as const,a:'blocks',label:'portal.plc' as const,text:'first.plc' as const,icon:FileCode2},{p:'hmi' as const,a:'screens',label:'portal.hmi' as const,text:'first.hmi' as const,icon:MonitorSmartphone},{p:'online' as const,a:'accessible',label:'portal.online' as const,text:'first.online' as const,icon:Stethoscope}].map(s=><button key={s.p} className="portal-step" onClick={()=>{setPortal(s.p);setAction(s.a,s.p);}}><s.icon size={30} strokeWidth={1.4}/><span><b>{t(s.label)}</b>{t(s.text)}</span><ChevronRight size={18}/></button>)}
   <button className="portal-step project" onClick={()=>onOpen()}><FolderOpen size={30} strokeWidth={1.4}/><span><b>{t('common.projectView')}</b>{t('first.project')}</span><ChevronRight size={18}/></button></div></>;
  case 'open':return <><h3>{t('open.recent')}</h3><table className="portal-table"><thead><tr><th>{t('open.project')}</th><th>{t('open.path')}</th><th>{t('open.exercise')}</th><th>{t('common.status')}</th></tr></thead><tbody><tr className="selected" onDoubleClick={()=>onOpen()}><td><FolderOpen size={14}/> {projectName}</td><td>{t('open.session')}</td><td>{no(challenge.id)} · {exerciseTitle}</td><td>{saved?t('open.saved'):t('open.modified')}</td></tr></tbody></table><div className="portal-buttons"><button className="portal-primary" onClick={()=>onOpen()}>{t('common.open')}</button></div></>;
  case 'create':return <><p className="portal-lead">{t('create.lead')}</p><div className="portal-scroll"><table className="portal-table"><thead><tr><th>{t('create.no')}</th><th>{t('create.exercise')}</th><th>{t('create.level')}</th><th>{t('create.concepts')}</th></tr></thead><tbody>{exercises.map(x=><tr key={x.id} className={template===x.id?'selected':''} onClick={()=>{setTemplate(x.id);setConfirm(null);}} onDoubleClick={()=>create(x.id)}><td>{no(x.id)}</td><td>{x.title}</td><td>L{x.level}</td><td>{x.concepts.map(k=>conceptLabel(k,lang)).join(', ')}</td></tr>)}</tbody></table></div>{confirm!==null?<div key="confirm" className="portal-buttons portal-confirm" role="alertdialog" aria-label={t('aria.confirm')} ref={el=>{if(el&&!el.dataset.shown){el.dataset.shown='1';el.scrollIntoView({block:'nearest'});}}}><span>{t('create.confirm',{id:no(confirm)})}</span><button onClick={()=>setConfirm(null)}>{t('common.cancel')}</button><button className="portal-primary" onClick={()=>{setConfirm(null);onCreate(confirm);}}>{t('create.anyway')}</button></div>:<div key="create" className="portal-buttons"><span>{locked?t('create.locked'):t('create.hint',{project:projectName})}</span><button className="portal-primary" disabled={locked} onClick={()=>create(template)}>{t('create.button')}</button></div>}</>;
  case 'software':return <table className="portal-table"><thead><tr><th>{t('software.software')}</th><th>{t('software.version')}</th><th>{t('software.scope')}</th></tr></thead><tbody><tr><td>PLC Lab Web</td><td>0.1.0</td><td>{t('software.app')}</td></tr><tr><td>{t('software.lad')}</td><td>0.1.0</td><td>{t('software.ladScope')}</td></tr><tr><td>{t('software.cpu')}</td><td>0.1.0</td><td>{t('software.cpuScope')}</td></tr><tr><td>{t('software.process')}</td><td>0.1.0</td><td>{t('software.processScope')}</td></tr></tbody></table>;
  case 'help':return <ol className="portal-help">{(['help.1','help.2','help.3','help.4','help.5'] as const).map(k=><li key={k}>{t(k)}</li>)}</ol>;
  case 'language':return <><p className="portal-lead">{t('language.lead')}</p><div className="portal-device-list" role="radiogroup" aria-label={t('action.language')}>{LANGS.map(l=><label key={l} lang={l} className={lang===l?'selected':''}><input type="radio" name="portal-lang" checked={lang===l} onChange={()=>setLang(l)}/><Languages size={16}/>{LANG_NAMES[l]}</label>)}</div></>;
  case 'devices':return <><table className="portal-table"><thead><tr><th>{t('common.device')}</th><th>{t('common.type')}</th><th>{t('common.interface')}</th><th>{t('common.status')}</th></tr></thead><tbody><tr className="selected" onDoubleClick={()=>onOpen({view:'device'})}><td><Cpu size={14}/> PLC_1</td><td>{cpu}</td><td>{t('devices.virtual')}</td><td>{mode}</td></tr><tr onDoubleClick={()=>onOpen({view:'process'})}><td><MonitorSmartphone size={14}/> HMI_1</td><td>{t('common.processScreens')}</td><td>{t('devices.internal')}</td><td>—</td></tr></tbody></table><div className="portal-buttons"><button className="portal-primary" onClick={()=>onOpen({view:'device'})}>{t('devices.openDeviceView')}</button></div></>;
  case 'add-device':return <><p className="portal-lead">{t('addDevice.lead')}</p><div className="portal-device-list">{cpus.map(v=><label key={v} className={device===v?'selected':''}><input type="radio" name="portal-cpu" checked={device===v} onChange={()=>setDevice(v)}/><Cpu size={16}/>{v}</label>)}</div><div className="portal-buttons"><span>{locked?t('addDevice.locked'):''}</span><button className="portal-primary" disabled={locked||device===cpu} onClick={()=>onCpu(device)}>{t('addDevice.change')}</button></div></>;
  case 'blocks':return <><table className="portal-table"><thead><tr><th>{t('common.name')}</th><th>{t('blocks.number')}</th><th>{t('common.type')}</th><th>{t('common.language')}</th><th>{t('blocks.networks')}</th></tr></thead><tbody>{blocks.map(b=><tr key={b.id} onDoubleClick={()=>onOpen({view:'ladder',block:b.id})}><td><FileCode2 size={14}/> {blockName(b)}</td><td>{b.id.replace(/\D/g,'')}</td><td>{t('blocks.ob')}</td><td>LAD</td><td>{b.networks.length}</td></tr>)}</tbody></table><div className="portal-buttons"><span>{t('blocks.hint')}</span><button className="portal-primary" onClick={()=>onOpen({view:'ladder',block:'OB1'})}>{t('blocks.openMain')}</button></div></>;
  case 'screens':return <><table className="portal-table"><thead><tr><th>{t('screens.screen')}</th><th>{t('common.device')}</th><th>{t('screens.process')}</th></tr></thead><tbody><tr className="selected" onDoubleClick={()=>onOpen({view:'process'})}><td><MonitorSmartphone size={14}/> {t('common.processScreens')}</td><td>HMI_1</td><td>{exerciseTitle}</td></tr></tbody></table><div className="portal-buttons"><button className="portal-primary" onClick={()=>onOpen({view:'process'})}>{t('screens.open')}</button></div></>;
  case 'accessible':return <><table className="portal-table"><thead><tr><th>{t('common.device')}</th><th>{t('accessible.deviceType')}</th><th>{t('common.interface')}</th><th>{t('accessible.mode')}</th></tr></thead><tbody><tr className="selected"><td><Cpu size={14}/> PLC_1</td><td>{cpu}</td><td>{t('accessible.virtualCpu')}</td><td className={mode==='RUN'?'portal-run':'portal-stop'}>● {mode}</td></tr></tbody></table><div className="portal-buttons"><button disabled={mode==='RUN'} onClick={onStart}>{t('accessible.start')}</button><button disabled={mode!=='RUN'} onClick={onStop}>{t('accessible.stop')}</button><button className="portal-primary" onClick={()=>onOpen({view:'ladder',block:'OB1',monitor:true})}>{t('accessible.online')}</button></div>{message&&<p className="portal-note" role="status">{message}</p>}</>;
  default:return null;}};
 const portalLabel=t(portals.find(p=>p.id===portal)!.label);
 return <div className="portal" hidden={!visible} role="application" aria-label={t('aria.portal')}>
  <header className="portal-head"><div className="portal-brand"><span>PLC Lab Web</span><b>{t('brand.sub')}</b></div></header>
  <div className="portal-body">
   <nav className="portal-tasks" aria-label={t('aria.portals')}>{portals.map(p=><button key={p.id} className={portal===p.id?'active':''} aria-pressed={portal===p.id} onClick={()=>choose(p.id)}><span className="portal-icon"><p.icon size={28} strokeWidth={1.5}/></span>{t(p.label)}</button>)}</nav>
   <nav className="portal-actions" aria-label={t('aria.actions',{portal:portalLabel})}>{actions[portal].map((group,i)=><div key={i} className="portal-action-group">{group.map(a=><button key={a.id} className={action===a.id?'active':''} aria-pressed={action===a.id} onClick={()=>setAction(a.id)}><a.icon size={16}/>{t(a.label)}</button>)}</div>)}</nav>
   <section className="portal-content" aria-label={title}><h2>{title}</h2>{content()}</section>
  </div>
  <footer className="portal-foot"><button className="portal-switch" onClick={()=>onOpen()}><ChevronRight size={16}/>{t('common.projectView')}</button><span>{t('foot.opened',{project:projectName,id:no(challenge.id),title:exerciseTitle})}</span></footer>
 </div>;
}
