'use client';
import {useState,type ReactNode} from 'react';
import type {Block,Tag} from '../plc/model';
import {useT} from '../i18n/react';
import {shellDict,type ShellKey} from '../i18n/dict/shell';
import {AddIcon,BlockIcon,CpuIcon,DbIcon,DeviceConfigIcon,DevicesNetworksIcon,ExerciseIcon,FolderIcon,HmiIcon,InfoIcon,OnlineDiagIcon,ProjectIcon,ScreenIcon,TagTableIcon,WatchTableIcon} from './shell/TiaIcons';

export type EditorId='ladder:OB1'|'ladder:OB100'|'tags'|'watch'|'process'|'device'|'diagnostics'|'learning'|'overview';
interface TreeNode {id:string;label:ShellKey|{text:string};icon:ReactNode;open?:EditorId;children?:TreeNode[];folder?:boolean;status?:boolean}
interface Props {projectName:string;cpuName:string;blocks:Block[];tags:Tag[];active:EditorId;online:boolean;differs?:Set<string>;onOpen:(id:EditorId)=>void;onCollapse:()=>void}

const blockLabel=(b:Block)=>`${b.id==='OB1'?'Main':b.id==='OB100'?'Startup':b.id} [${b.id}]`;
const folder=(id:string,label:ShellKey,children:TreeNode[]=[]):TreeNode=>({id,label,icon:<FolderIcon/>,children,folder:true});

export default function ProjectTree({projectName,cpuName,blocks,tags,active,online,differs,onOpen,onCollapse}:Props){
 const t=useT(shellDict);
 const [expanded,setExpanded]=useState<Set<string>>(()=>new Set(['project','plc','blocks','tags','watch','hmi','screens']));
 const [selected,setSelected]=useState('OB1'),[tab,setTab]=useState<'devices'|'plant'>('devices'),[details,setDetails]=useState(true);
 const tree:TreeNode={id:'project',label:{text:projectName},icon:<ProjectIcon/>,children:[
  {id:'add-device',label:'tree.addDevice',icon:<AddIcon/>,open:'device'},
  {id:'devices-networks',label:'tree.devicesNetworks',icon:<DevicesNetworksIcon/>,open:'device'},
  {id:'plc',label:{text:`PLC_1 [${cpuName}]`},icon:<CpuIcon/>,status:true,children:[
   {id:'device-config',label:'tree.deviceConfig',icon:<DeviceConfigIcon/>,open:'device'},
   {id:'online-diag',label:'tree.onlineDiag',icon:<OnlineDiagIcon/>,open:'diagnostics'},
   {...folder('blocks','tree.programBlocks',[{id:'add-block',label:'tree.addBlock',icon:<AddIcon/>},...blocks.map(b=>({id:b.id,label:{text:blockLabel(b)},icon:<BlockIcon kind="OB"/>,open:`ladder:${b.id}` as EditorId,status:true})),{...folder('system','tree.systemBlocks'),icon:<FolderIcon/>}]),status:true},
   folder('technology','tree.technology'),folder('external','tree.external'),
   folder('tags','tree.plcTags',[{id:'all-tags',label:'tree.showAllTags',icon:<TagTableIcon/>,open:'tags'},{id:'add-tag-table',label:'tree.addTagTable',icon:<AddIcon/>},{id:'default-tags',label:{text:`${t('tree.defaultTagTable')} [${tags.length}]`},icon:<TagTableIcon/>,open:'tags'}]),
   folder('types','tree.dataTypes'),
   folder('watch','tree.watchTables',[{id:'add-watch',label:'tree.addWatchTable',icon:<AddIcon/>},{id:'watch-1',label:{text:t('tree.watchTable1')},icon:<WatchTableIcon/>,open:'watch'}]),
   folder('backups','tree.backups'),folder('traces','tree.traces'),folder('opcua','tree.opcua'),folder('proxy','tree.proxy'),
   {id:'program-info',label:'tree.programInfo',icon:<InfoIcon/>,open:'overview'},
   {id:'alarm-texts',label:'tree.alarmTexts',icon:<DbIcon/>},
   folder('local','tree.localModules'),
  ]},
  {id:'hmi',label:{text:`HMI_1 [${t('tree.processScreens')}]`},icon:<HmiIcon/>,children:[folder('screens','tree.screens',[{id:'process-screen',label:'tree.processScreen',icon:<ScreenIcon/>,open:'process'}])]},
  {id:'exercises',label:'tree.exercises',icon:<ExerciseIcon/>,open:'learning'},
  folder('ungrouped','tree.ungrouped'),folder('security','tree.security'),folder('cross','tree.crossDevice'),folder('common','tree.commonData'),folder('docs','tree.documentation'),folder('languages','tree.languages'),folder('online-access','tree.onlineAccess'),folder('card','tree.cardReader'),
 ]};
 const text=(n:TreeNode)=>typeof n.label==='string'?t(n.label):n.label.text;
 const toggle=(id:string)=>setExpanded(s=>{const next=new Set(s);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const isActive=(n:TreeNode)=>!!n.open&&(n.open===active)&&(!n.open.startsWith('ladder:')||n.id===active.slice(7));
 const row=(n:TreeNode,depth:number):ReactNode=>{const open=expanded.has(n.id),expandable=!!n.children;return <li key={n.id} role="treeitem" aria-expanded={expandable?open:undefined} aria-selected={selected===n.id}>
  <div className={`tia-tree-row${selected===n.id?' selected':''}${isActive(n)?' active':''}`} style={{paddingLeft:4+depth*16}} tabIndex={selected===n.id?0:-1} title={n.open?t('tree.openHint'):undefined}
   onClick={()=>setSelected(n.id)} onDoubleClick={()=>{if(n.open)onOpen(n.open);else if(expandable)toggle(n.id);}}
   onKeyDown={e=>{if(e.key==='Enter'&&n.open)onOpen(n.open);if(e.key==='ArrowRight'&&expandable&&!open)toggle(n.id);if(e.key==='ArrowLeft'&&expandable&&open)toggle(n.id);}}>
   <span className="tia-tree-toggle" onClick={e=>{e.stopPropagation();if(expandable)toggle(n.id);}}>{expandable?(open?'▾':'▸'):''}</span>{n.icon}<span className="tia-tree-label">{text(n)}</span>{online&&n.status&&(()=>{const bad=differs?.has(n.id)||((n.id==='plc'||n.id==='blocks')&&!!differs?.size);return <span className={`tia-tree-status${bad?' differs':''}`} title={bad?t('tree.differs'):t('tree.consistent')}>{bad?'◐':'●'}</span>;})()}
  </div>
  {expandable&&open&&<ul role="group">{n.children!.length?n.children!.map(c=>row(c,depth+1)):<li className="tia-tree-empty" style={{paddingLeft:24+(depth+1)*16}}>{t('tree.notAvailable')}</li>}</ul>}
 </li>;};
 // Details view lists what the selected object contains, as in TIA.
 const detailRows:[string,string][]=['tags','all-tags','default-tags'].includes(selected)?tags.map(x=>[x.name,x.address]):selected==='blocks'?blocks.map(b=>[blockLabel(b),`OB${b.id.replace(/\D/g,'')}`]):blocks.some(b=>b.id===selected)?(blocks.find(b=>b.id===selected)!.networks.map((n,i)=>[n.title||`Network ${i+1}`,`Network ${i+1}`])):[];
 return <aside className="tia-pane tia-tree-pane" aria-label={t('pane.projectTree')}>
  <div className="tia-pane-title"><span>{t('pane.projectTree')}</span><button className="tia-pane-btn" aria-label={t('pane.collapse')} title={t('pane.collapse')} onClick={onCollapse}>◂</button></div>
  <div className="tia-tabs"><button className={tab==='devices'?'active':''} onClick={()=>setTab('devices')}>{t('tree.devices')}</button><button className={tab==='plant'?'active':''} onClick={()=>setTab('plant')}>{t('tree.plantObjects')}</button></div>
  <div className="tia-tree-tools"><button aria-label={t('tree.overview')} title={t('tree.overview')} onClick={()=>onOpen('overview')}><TagTableIcon/></button></div>
  {tab==='devices'?<ul className="tia-tree" role="tree" aria-label={t('tree.devices')}>{row(tree,0)}</ul>:<p className="tia-tree-placeholder">{t('tree.noPlantObjects')}</p>}
  <section className={`tia-details${details?' open':''}`}><button className="tia-details-head" aria-expanded={details} onClick={()=>setDetails(!details)}>{details?'▾':'▸'} {t('pane.details')}</button>{details&&<><div className="tia-details-tab">{(()=>{const find=(n:TreeNode):TreeNode|undefined=>n.id===selected?n:n.children?.map(find).find(Boolean);const s=find(tree);return s?text(s):'';})()}</div><table className="tia-grid"><thead><tr><th>{t('details.name')}</th><th>{t('details.address')}</th></tr></thead><tbody>{detailRows.map(([a,b],i)=><tr key={i}><td>{a}</td><td>{b}</td></tr>)}</tbody></table></>}</section>
 </aside>;
}
