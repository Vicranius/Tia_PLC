'use client';
import type {ReactNode} from 'react';
import {Info,Stethoscope,Wrench} from 'lucide-react';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

export type InspectorTab='properties'|'info'|'diagnostics';
export interface InspectorSub {id:string;label:string;content:ReactNode;keepMounted?:boolean}
const tabs:{id:InspectorTab;key:'inspector.properties'|'inspector.info'|'inspector.diagnostics';icon:typeof Info}[]=[{id:'properties',key:'inspector.properties',icon:Wrench},{id:'info',key:'inspector.info',icon:Info},{id:'diagnostics',key:'inspector.diagnostics',icon:Stethoscope}];

// Inspector window: object title on the left, Properties / Info / Diagnostics on the right, then the secondary tabs.
export default function Inspector({title,tab,sub,open,badge,subs,onTab,onSub,onToggle}:{title:string;tab:InspectorTab;sub:string;open:boolean;badge?:number;subs:Record<InspectorTab,InspectorSub[]>;onTab:(tab:InspectorTab)=>void;onSub:(sub:string)=>void;onToggle:()=>void}){
 const t=useT(shellDict),list=subs[tab],current=list.find(s=>s.id===sub)??list[0];
 return <section className={`tia-inspector${open?'':' collapsed'}`} aria-label={t('inspector.label')}>
  <div className="tia-pane-title tia-inspector-head"><span className="tia-inspector-title">{title}</span><div className="tia-inspector-tabs" role="tablist">{tabs.map(x=><button key={x.id} role="tab" aria-selected={open&&tab===x.id} className={open&&tab===x.id?'active':''} onClick={()=>onTab(x.id)}><x.icon size={14}/>{t(x.key)}{x.id==='info'&&!!badge&&<i className="tia-badge">{badge}</i>}</button>)}</div><button className="tia-pane-btn" aria-label={open?t('pane.collapse'):t('pane.expand')} title={open?t('pane.collapse'):t('pane.expand')} onClick={onToggle}>{open?'▾':'▴'}</button></div>
  {open&&<><div className="tia-subtabs" role="tablist">{list.map(s=><button key={s.id} role="tab" aria-selected={current.id===s.id} className={current.id===s.id?'active':''} onClick={()=>onSub(s.id)}>{s.label}</button>)}</div>
  <div className="tia-inspector-body">{Object.entries(subs).flatMap(([group,list])=>list.map(s=>({group,s}))).filter(({s})=>s.keepMounted||s===current).map(({group,s})=><div key={`${group}-${s.id}`} className="tia-inspector-pane" hidden={s!==current}>{s.content}</div>)}</div></>}
 </section>;
}
