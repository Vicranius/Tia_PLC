'use client';
import {useState,type ReactNode} from 'react';
import {Glasses,ListPlus,Rows3,Trash2,Zap,ZapOff} from 'lucide-react';
import {types,type DataType,type Scalar,type Tag} from '../../plc/model';
import {useT} from '../../i18n/react';
import {tablesDict} from '../../i18n/dict/tables';
import {TagTableIcon} from './TiaIcons';

export interface WatchRow {name:string;format:string;modify:string;modifyOn:boolean}
export interface ForceRow {name:string;format:string;force:string;forceOn:boolean}
type Msg=(text:string)=>void;

// Display formats and value conversion as in TIA watch/force tables.
const formatsFor=(type:DataType)=>type==='BOOL'?['Bool']:type==='REAL'?['Floating-point number']:type==='TIME'?['Time','DEC+/-']:type==='INT'||type==='DINT'?['DEC+/-','Hex','Bin']:['Hex','DEC','Bin'];
export const defaultFormat=(type:DataType)=>formatsFor(type)[0];
const width:Partial<Record<DataType,number>>={BYTE:8,WORD:16,INT:16,DWORD:32,DINT:32};
export function formatValue(value:Scalar|undefined,type:DataType,format:string){
 if(value===undefined)return '';if(typeof value==='boolean')return value?'TRUE':'FALSE';
 const bits=width[type]??32,mask=bits===32?0xffffffff:(1<<bits)-1,unsigned=(Math.trunc(value)&mask)>>>0;
 if(format==='Hex')return `16#${unsigned.toString(16).toUpperCase().padStart(bits/4,'0')}`;
 if(format==='Bin')return `2#${unsigned.toString(2).padStart(bits,'0')}`;
 if(format==='Time')return `T#${value}MS`;
 if(format==='Floating-point number')return Number.isInteger(value)?value.toFixed(1):String(Number(value.toPrecision(7)));
 return String(Math.trunc(value));
}
export function parseValue(text:string,type:DataType):Scalar|undefined{
 const s=text.trim().toUpperCase();if(!s)return undefined;
 if(type==='BOOL')return ['TRUE','1'].includes(s)?true:['FALSE','0'].includes(s)?false:undefined;
 const n=s.startsWith('16#')?parseInt(s.slice(3),16):s.startsWith('2#')?parseInt(s.slice(2),2):s.startsWith('T#')?Number(s.slice(2).replace(/MS$/,'')):Number(s);
 return Number.isFinite(n)?(type==='REAL'?n:Math.trunc(n)):undefined;
}
const findTag=(tags:Tag[],key:string)=>tags.find(t=>t.name.toLowerCase()===key.trim().replace(/^"|"$/g,'').toLowerCase()||t.address.toLowerCase()===key.trim().toLowerCase());
function Monitor({value,type,format,on}:{value:Scalar|undefined;type:DataType;format:string;on:boolean}){
 if(!on||value===undefined)return null;
 return <span className={`tia-monitor${typeof value==='boolean'?(value?' true':' false'):''}`}>{typeof value==='boolean'&&<i/>}{formatValue(value,type,format)}</span>;
}
function Toolbar({children}:{children:ReactNode}){return <div className="tia-table-toolbar" role="toolbar">{children}</div>;}
const Tool=({label,onClick,icon,pressed,disabled}:{label:string;onClick:()=>void;icon:ReactNode;pressed?:boolean;disabled?:boolean})=><button title={label} aria-label={label} aria-pressed={pressed} className={pressed?'pressed':''} disabled={disabled} onClick={onClick}>{icon}</button>;
const nextAddress=(tags:Tag[])=>{for(let i=0;i<512;i++){const a=`%M${10+Math.floor(i/8)}.${i%8}`;if(!tags.some(t=>t.address===a))return a;}return '%M100.0';};

// PLC tag table editor: Tags / User constants / System constants.
export function TagTable({tags,values,monitoring,locked,onChange,onMonitor}:{tags:Tag[];values:Record<string,Scalar>;monitoring:boolean;locked:boolean;onChange:(tags:Tag[])=>void;onMonitor:()=>void}){
 const t=useT(tablesDict),[tab,setTab]=useState<'tags'|'user'|'system'>('tags'),[selected,setSelected]=useState(-1);
 const update=(i:number,change:Partial<Tag>)=>onChange(tags.map((x,j)=>j===i?{...x,...change}:x));
 const fresh=():Tag=>{let n=tags.length+1;while(tags.some(x=>x.name===`Tag_${n}`))n++;return {name:`Tag_${n}`,type:'BOOL',address:nextAddress(tags),initial:false,comment:''};};
 const insert=(at:number)=>{const next=[...tags];next.splice(at,0,fresh());onChange(next);setSelected(at);};
 const remove=()=>{if(selected<0)return;onChange(tags.filter((_,j)=>j!==selected));setSelected(-1);};
 const system:[string,string,number][]=[['Local~Common','Hw_SubModule',50],['Local~Device','Hw_Device',32],['Local~Configuration','Hw_SubModule',33],['Local~Exec','Hw_SubModule',52],['Local~DI_14_DQ_10_1','Hw_SubModule',257],['Local~AI_2_1','Hw_SubModule',258],['OB_Main','OB_PCYCLE',1],['OB_Startup','OB_STARTUP',100]];
 return <div className="tia-table-editor">
  <div className="tia-tabs">{(['tags','user','system'] as const).map(k=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{t(k==='tags'?'tab.tags':k==='user'?'tab.userConstants':'tab.systemConstants')}</button>)}</div>
  {tab==='tags'&&<><Toolbar><Tool label={t('tool.insertRow')} icon={<Rows3 size={15}/>} disabled={locked} onClick={()=>insert(Math.max(0,selected))}/><Tool label={t('tool.addRow')} icon={<ListPlus size={15}/>} disabled={locked} onClick={()=>insert(tags.length)}/><Tool label={t('tool.delete')} icon={<Trash2 size={15}/>} disabled={locked||selected<0} onClick={remove}/><i/><Tool label={t('tool.monitorAll')} icon={<Glasses size={16}/>} pressed={monitoring} onClick={onMonitor}/></Toolbar>
   <div className="tia-table-scroll"><table className="tia-grid tia-edit-grid"><thead><tr><th/><th>{t('col.name')}</th><th>{t('col.dataType')}</th><th>{t('col.address')}</th><th>{t('col.retain')}</th><th title={t('col.hmiAccess')}>{t('col.hmiAccess')}</th><th title={t('col.hmiWrite')}>{t('col.hmiWrite')}</th><th title={t('col.hmiVisible')}>{t('col.hmiVisible')}</th>{monitoring&&<th>{t('col.monitor')}</th>}<th>{t('col.supervision')}</th><th>{t('col.comment')}</th></tr></thead>
    <tbody>{tags.map((x,i)=><tr key={i} className={selected===i?'selected':''} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Delete'&&(e.target as HTMLElement).tagName!=='INPUT')remove();}}>
     <td><TagTableIcon size={14}/></td><td><input aria-label={t('col.name')} disabled={locked} value={x.name} onChange={e=>update(i,{name:e.target.value})}/></td>
     <td><select aria-label={t('col.dataType')} disabled={locked} value={x.type} onChange={e=>{const type=e.target.value as DataType;update(i,{type,initial:type==='BOOL'?false:0});}}>{types.map(ty=><option key={ty} value={ty}>{ty[0]+ty.slice(1).toLowerCase()}</option>)}</select></td>
     <td><input aria-label={t('col.address')} disabled={locked} value={x.address} onChange={e=>update(i,{address:e.target.value.trim()})}/></td>
     <td className="center"><input type="checkbox" aria-label={t('col.retain')} disabled checked={false}/></td><td className="center"><input type="checkbox" aria-label={t('col.hmiAccess')} disabled checked/></td><td className="center"><input type="checkbox" aria-label={t('col.hmiWrite')} disabled checked/></td><td className="center"><input type="checkbox" aria-label={t('col.hmiVisible')} disabled checked/></td>
     {monitoring&&<td><Monitor value={values[x.name]} type={x.type} format={defaultFormat(x.type)} on/></td>}
     <td/><td><input aria-label={t('col.comment')} disabled={locked} value={x.comment} onChange={e=>update(i,{comment:e.target.value})}/></td></tr>)}
     <tr className="add" onClick={()=>!locked&&insert(tags.length)}><td/><td colSpan={monitoring?10:9}>{t('addNew')}</td></tr></tbody></table></div></>}
  {tab==='user'&&<div className="tia-table-scroll"><table className="tia-grid"><thead><tr><th/><th>{t('col.name')}</th><th>{t('col.dataType')}</th><th>{t('col.value')}</th><th>{t('col.comment')}</th></tr></thead><tbody><tr className="add"><td/><td colSpan={4}>{t('addNew')}</td></tr></tbody></table><p className="tia-muted">{t('empty.constants')}</p></div>}
  {tab==='system'&&<div className="tia-table-scroll"><table className="tia-grid"><thead><tr><th/><th>{t('col.name')}</th><th>{t('col.dataType')}</th><th>{t('col.value')}</th></tr></thead><tbody>{system.map(([n,ty,v])=><tr key={n}><td><TagTableIcon size={14}/></td><td>{n}</td><td>{ty}</td><td>{v}</td></tr>)}</tbody></table></div>}
 </div>;
}

// Rows of watch/force tables reference tags by name; "<Add new>" accepts a tag name or address.
function AddRow({tags,cols,onAdd,message}:{tags:Tag[];cols:number;onAdd:(tag:Tag)=>void;message:Msg}){
 const t=useT(tablesDict),[text,setText]=useState('');
 return <tr className="add"><td/><td colSpan={cols}><input list="tia-tag-names" aria-label={t('addNew')} placeholder={t('addNew')} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key!=='Enter')return;const tag=findTag(tags,text);if(tag){onAdd(tag);setText('');}else message(t('msg.unknownTag',{name:text}));}}/><datalist id="tia-tag-names">{tags.map(x=><option key={x.name} value={x.name}>{x.address}</option>)}</datalist></td></tr>;
}

export function WatchTable({tags,rows,setRows,values,monitoring,onMonitor,onModify,message}:{tags:Tag[];rows:WatchRow[];setRows:(rows:WatchRow[])=>void;values:Record<string,Scalar>;monitoring:boolean;onMonitor:()=>void;onModify:(entries:[string,Scalar][])=>void;message:Msg}){
 const t=useT(tablesDict),[selected,setSelected]=useState(-1);
 const update=(i:number,change:Partial<WatchRow>)=>setRows(rows.map((r,j)=>j===i?{...r,...change}:r));
 const modifyNow=()=>{const entries:[string,Scalar][]=[];for(const r of rows){if(!r.modifyOn||!r.modify.trim())continue;const tag=findTag(tags,r.name);if(!tag)continue;const v=parseValue(r.modify,tag.type);if(v===undefined){message(t('msg.badValue',{value:r.modify,name:tag.name}));return;}entries.push([tag.name,v]);}if(!entries.length){message(t('msg.nothingToModify'));return;}onModify(entries);message(t('msg.modified',{n:entries.length}));};
 return <div className="tia-table-editor"><Toolbar><Tool label={t('tool.monitorAll')} icon={<Glasses size={16}/>} pressed={monitoring} onClick={onMonitor}/><Tool label={t('tool.modifyNow')} icon={<Zap size={15} color="#d58a00"/>} onClick={modifyNow}/><i/><Tool label={t('tool.delete')} icon={<Trash2 size={15}/>} disabled={selected<0} onClick={()=>{setRows(rows.filter((_,j)=>j!==selected));setSelected(-1);}}/></Toolbar>
  <div className="tia-table-scroll"><table className="tia-grid tia-edit-grid"><thead><tr><th>i</th><th>{t('col.name')}</th><th>{t('col.address')}</th><th>{t('col.format')}</th><th>{t('col.monitor')}</th><th>{t('col.modify')}</th><th title={t('col.modifyFlag')}>⚡</th><th>{t('col.comment')}</th><th>{t('col.tagComment')}</th></tr></thead>
   <tbody>{rows.map((r,i)=>{const tag=findTag(tags,r.name);return <tr key={i} className={selected===i?'selected':''} onClick={()=>setSelected(i)}><td>{i+1}</td><td>"{tag?.name??r.name}"</td><td>{tag?.address??'???'}</td>
    <td>{tag&&<select aria-label={t('col.format')} value={r.format} onChange={e=>update(i,{format:e.target.value})}>{formatsFor(tag.type).map(f=><option key={f}>{f}</option>)}</select>}</td>
    <td>{tag&&<Monitor value={values[tag.name]} type={tag.type} format={r.format} on={monitoring}/>}</td>
    <td><input aria-label={t('col.modify')} value={r.modify} onChange={e=>update(i,{modify:e.target.value,modifyOn:true})}/></td><td className="center"><input type="checkbox" aria-label={t('col.modifyFlag')} checked={r.modifyOn} onChange={e=>update(i,{modifyOn:e.target.checked})}/></td><td/><td className="muted">{tag?.comment}</td></tr>;})}
   <AddRow tags={tags} cols={8} message={message} onAdd={tag=>setRows([...rows,{name:tag.name,format:defaultFormat(tag.type),modify:'',modifyOn:false}])}/></tbody></table></div>
  {!monitoring&&<p className="tia-muted">{t('msg.monitorOffline')}</p>}
 </div>;
}

export function ForceTable({tags,rows,setRows,values,forces,monitoring,onMonitor,onForce,message}:{tags:Tag[];rows:ForceRow[];setRows:(rows:ForceRow[])=>void;values:Record<string,Scalar>;forces:Record<string,Scalar>;monitoring:boolean;onMonitor:()=>void;onForce:(name:string,value:Scalar|null)=>void;message:Msg}){
 const t=useT(tablesDict),[selected,setSelected]=useState(-1);
 const update=(i:number,change:Partial<ForceRow>)=>setRows(rows.map((r,j)=>j===i?{...r,...change}:r));
 const start=()=>{let n=0;for(const r of rows){if(!r.forceOn)continue;const tag=findTag(tags,r.name);if(!tag)continue;const v=parseValue(r.force,tag.type);if(v===undefined){message(t('msg.badValue',{value:r.force,name:tag.name}));return;}onForce(tag.name,v);n++;}message(n?t('msg.forced',{n}):t('msg.nothingToModify'));};
 const stop=()=>{for(const name of Object.keys(forces))onForce(name,null);message(t('msg.unforced'));};
 return <div className="tia-table-editor"><Toolbar><Tool label={t('tool.monitorAll')} icon={<Glasses size={16}/>} pressed={monitoring} onClick={onMonitor}/><Tool label={t('tool.startForce')} icon={<span className="tia-f-icon">F<Zap size={11}/></span>} onClick={start}/><Tool label={t('tool.stopForce')} icon={<span className="tia-f-icon">F<ZapOff size={11}/></span>} disabled={!Object.keys(forces).length} onClick={stop}/><i/><Tool label={t('tool.delete')} icon={<Trash2 size={15}/>} disabled={selected<0} onClick={()=>{setRows(rows.filter((_,j)=>j!==selected));setSelected(-1);}}/></Toolbar>
  <div className="tia-table-scroll"><table className="tia-grid tia-edit-grid"><thead><tr><th>i</th><th>{t('col.name')}</th><th>{t('col.address')}</th><th>{t('col.format')}</th><th>{t('col.monitor')}</th><th>{t('col.force')}</th><th title={t('col.forceFlag')}>F</th><th>{t('col.comment')}</th></tr></thead>
   <tbody>{rows.map((r,i)=>{const tag=findTag(tags,r.name),active=!!tag&&tag.name in forces;return <tr key={i} className={`${selected===i?'selected':''}${active?' forced':''}`} onClick={()=>setSelected(i)}><td>{active?<b className="tia-forced-flag" title="F">F</b>:i+1}</td><td>"{tag?.name??r.name}"</td><td>{tag?`${tag.address}:P`:'???'}</td>
    <td>{tag&&<select aria-label={t('col.format')} value={r.format} onChange={e=>update(i,{format:e.target.value})}>{formatsFor(tag.type).map(f=><option key={f}>{f}</option>)}</select>}</td>
    <td>{tag&&<Monitor value={values[tag.name]} type={tag.type} format={r.format} on={monitoring}/>}</td>
    <td><input aria-label={t('col.force')} value={r.force} onChange={e=>update(i,{force:e.target.value,forceOn:true})}/></td><td className="center"><input type="checkbox" aria-label={t('col.forceFlag')} checked={r.forceOn} onChange={e=>update(i,{forceOn:e.target.checked})}/></td><td className="muted">{tag?.comment}</td></tr>;})}
   <AddRow tags={tags.filter(x=>/^%[IQ]/.test(x.address))} cols={7} message={message} onAdd={tag=>setRows([...rows,{name:tag.name,format:defaultFormat(tag.type),force:tag.type==='BOOL'?'TRUE':'0',forceOn:false}])}/></tbody></table></div>
  {!monitoring&&<p className="tia-muted">{t('msg.monitorOffline')}</p>}
 </div>;
}
