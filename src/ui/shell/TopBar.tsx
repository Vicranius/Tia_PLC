'use client';
import {useState,type ReactNode} from 'react';
import {ClipboardPaste,Columns2,Copy,Download,FileCog,FilePlus,FolderOpen,Laptop,Link2,Play,Plug,Printer,Redo2,Rows2,Save,ScanSearch,Scissors,Search,Square,Undo2,Unplug,Upload,X} from 'lucide-react';
import MenuBar,{type MenuAction} from '../MenuBar';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

export interface ToolbarActions {newProject:()=>void;openProject:()=>void;save:()=>void;undo:()=>void;redo:()=>void;canUndo:boolean;canRedo:boolean;compile:()=>void;download:()=>void;startSimulation:()=>void;goOnline:()=>void;goOffline:()=>void;accessible:()=>void;startCpu:()=>void;stopCpu:()=>void;search:(query:string)=>void;online:boolean;running:boolean;busy:boolean;locked:boolean}

function Tool({label,icon,onClick,disabled,text,className}:{label:string;icon:ReactNode;onClick?:()=>void;disabled?:boolean;text?:boolean;className?:string}){
 return <button className={`tia-tool${text?' with-text':''}${className?' '+className:''}`} title={label} aria-label={label} disabled={disabled||!onClick} onClick={onClick}>{icon}{text&&<span>{label}</span>}</button>;
}

// Menu bar and main toolbar of the project view; the wordmark sits top-right across both rows, as in TIA.
export default function TopBar({menus,a}:{menus:{name:string;items:MenuAction[]}[];a:ToolbarActions}){
 const t=useT(shellDict),[query,setQuery]=useState('');
 return <header className="tia-top">
  <div className="tia-top-rows">
   <MenuBar menus={menus}/>
   <div className="tia-toolbar" role="toolbar" aria-label={t('toolbar.label')}>
    <Tool label={t('toolbar.new')} icon={<FilePlus size={16} color="#3a78b5"/>} onClick={a.newProject} disabled={a.locked}/>
    <Tool label={t('toolbar.open')} icon={<FolderOpen size={16} color="#c98a00"/>} onClick={a.openProject}/>
    <Tool label={t('toolbar.save')} icon={<Save size={16} color="#4d5b67"/>} onClick={a.save} disabled={a.busy} text/>
    <i/><Tool label={t('toolbar.print')} icon={<Printer size={16}/>}/>
    <i/><Tool label={t('toolbar.cut')} icon={<Scissors size={16}/>}/><Tool label={t('toolbar.copy')} icon={<Copy size={16}/>}/><Tool label={t('toolbar.paste')} icon={<ClipboardPaste size={16}/>}/><Tool label={t('toolbar.delete')} icon={<X size={16} color="#c0392b"/>}/>
    <i/><Tool label={t('toolbar.undo')} icon={<Undo2 size={16} color="#3a78b5"/>} onClick={a.undo} disabled={a.locked||!a.canUndo}/><Tool label={t('toolbar.redo')} icon={<Redo2 size={16} color="#3a78b5"/>} onClick={a.redo} disabled={a.locked||!a.canRedo}/>
    <i/><Tool label={t('toolbar.split.h')} icon={<Rows2 size={16}/>}/><Tool label={t('toolbar.split.v')} icon={<Columns2 size={16}/>}/>
    <i/><Tool label={t('toolbar.compile')} icon={<FileCog size={16} color="#4d5b67"/>} onClick={a.compile} disabled={a.busy}/><Tool label={t('toolbar.download')} icon={<Download size={16} color="#2e7d32"/>} onClick={a.download} disabled={a.busy||a.running}/><Tool label={t('toolbar.upload')} icon={<Upload size={16}/>}/><Tool label={t('toolbar.simulation')} icon={<Laptop size={16} color="#2f6ea8"/>} onClick={a.startSimulation} disabled={a.busy}/>
    <i/><Tool className={a.online?'pressed':''} label={t('toolbar.goOnline')} icon={<Plug size={16} color="#e8730c"/>} onClick={a.goOnline} disabled={a.online} text/><Tool label={t('toolbar.goOffline')} icon={<Unplug size={16} color="#6b7680"/>} onClick={a.goOffline} disabled={!a.online} text/>
    <i/><Tool label={t('toolbar.accessible')} icon={<ScanSearch size={16} color="#2f6ea8"/>} onClick={a.accessible}/><Tool label={t('toolbar.startCpu')} icon={<Play size={16} color="#2e9b48" fill="#2e9b48"/>} onClick={a.startCpu} disabled={a.busy||a.running}/><Tool label={t('toolbar.stopCpu')} icon={<Square size={14} color="#c0392b" fill="#c0392b"/>} onClick={a.stopCpu} disabled={!a.running}/>
    <i/><Tool label={t('toolbar.crossRef')} icon={<Link2 size={16}/>}/>
    <form className="tia-search" role="search" onSubmit={e=>{e.preventDefault();if(query.trim())a.search(query.trim());}}><input aria-label={t('toolbar.search')} placeholder={`<${t('toolbar.search')}>`} value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" className="tia-tool" aria-label={t('toolbar.search')} title={t('toolbar.search')}><Search size={15} color="#2f6ea8"/></button></form>
   </div>
  </div>
  <div className="tia-wordmark" aria-hidden="true"><span>PLC Lab Web</span><b>TRAINER</b></div>
 </header>;
}
