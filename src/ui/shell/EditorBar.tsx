'use client';
import type {ReactNode} from 'react';
import {CircleCheck,LayoutList,TriangleAlert,CircleX} from 'lucide-react';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

export interface OpenEditor {id:string;label:string;icon:ReactNode}
// Editor bar at the bottom of the project view: Portal view switch, Overview, open editors, last status message.
export default function EditorBar({editors,active,status,onActivate,onPortal,onOverview}:{editors:OpenEditor[];active:string;status:{kind:'ok'|'warning'|'error';text:string};onActivate:(id:string)=>void;onPortal:()=>void;onOverview:()=>void}){
 const t=useT(shellDict),Icon=status.kind==='ok'?CircleCheck:status.kind==='warning'?TriangleAlert:CircleX;
 return <footer className="tia-editorbar">
  <button className="tia-portal-switch" onClick={onPortal}><span aria-hidden="true">◀</span>{t('editorbar.portal')}</button>
  <button className={`tia-editor-tab overview${active==='overview'?' active':''}`} onClick={onOverview}><LayoutList size={14}/>{t('editorbar.overview')}</button>
  <div className="tia-editor-tabs" role="tablist" aria-label={t('editorbar.open')}>{editors.filter(e=>e.id!=='overview').map(e=><button key={e.id} role="tab" aria-selected={active===e.id} className={`tia-editor-tab${active===e.id?' active':''}`} title={e.label} onClick={()=>onActivate(e.id)}>{e.icon}<span>{e.label}</span></button>)}</div>
  <div className={`tia-statusline ${status.kind}`} role="status" title={status.text}><Icon size={14}/><span>{status.text}</span></div>
 </footer>;
}
