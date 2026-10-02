'use client';
import {Fragment} from 'react';
import {Trash2} from 'lucide-react';
import {types,type Block,type BlockInterface,type DataType,type Program,type Scalar,type Section,type Variable} from '../../plc/model';
import {blockLabel,blockName,dbMembers,defaultValue,sectionsFor} from '../../plc/blocks';
import {validScalar} from '../../plc/memory';
import {useT} from '../../i18n/react';
import {blocksDict} from '../../i18n/dict/blocks';
import {formatValue,defaultFormat} from './Tables';

const base:Record<Section,string>={input:'In',output:'Out',inout:'InOut',static:'Stat',temp:'Temp',constant:'Const'};
const typeLabel=(t:DataType)=>t[0]+t.slice(1).toLowerCase();
function freeVar(names:string[],stem:string){let n=1;while(names.includes(`${stem}_${n}`))n++;return `${stem}_${n}`;}
function StartValue({v,disabled,onChange}:{v:Variable;disabled:boolean;onChange:(value:Scalar)=>void}){
 if(v.type==='BOOL')return <select aria-label={v.name} disabled={disabled} value={String(v.initial)} onChange={e=>onChange(e.target.value==='true')}><option value="false">false</option><option value="true">true</option></select>;
 return <input aria-label={v.name} disabled={disabled} type="number" step={v.type==='REAL'?'any':1} defaultValue={Number(v.initial)} key={`${v.name}:${v.type}:${v.initial}`} onBlur={e=>{const n=Number(e.target.value);if(validScalar(v.type,n))onChange(n);else e.target.value=String(v.initial);}}/>;
}
function VarRows({list,disabled,onChange,startLabel}:{list:Variable[];disabled:boolean;onChange:(list:Variable[])=>void;startLabel?:boolean}){
 const t=useT(blocksDict),set=(i:number,change:Partial<Variable>)=>onChange(list.map((v,j)=>j===i?{...v,...change}:v));
 return <>{list.map((v,i)=><tr key={i}><td/><td><input aria-label={t('iface.name')} disabled={disabled} value={v.name} onChange={e=>set(i,{name:e.target.value.trim()})}/></td>
  <td><select aria-label={t('iface.dataType')} disabled={disabled} value={v.type} onChange={e=>{const type=e.target.value as DataType;set(i,{type,initial:defaultValue(type)});}}>{types.map(x=><option key={x} value={x}>{typeLabel(x)}</option>)}</select></td>
  <td><StartValue v={v} disabled={disabled} onChange={initial=>set(i,{initial})}/></td>{startLabel&&<td/>}<td><input aria-label={t('iface.comment')} disabled={disabled} value={v.comment} onChange={e=>set(i,{comment:e.target.value})}/></td>
  <td><button className="tia-row-delete" aria-label={t('iface.delete')} title={t('iface.delete')} disabled={disabled} onClick={()=>onChange(list.filter((_,j)=>j!==i))}><Trash2 size={13}/></button></td></tr>)}</>;
}

// Editable block interface (TIA "Block interface"): sections depend on the block type; OB inputs are system parameters.
export function InterfaceEditor({block,locked,onChange}:{block:Block;locked:boolean;onChange:(iface:BlockInterface)=>void}){
 const t=useT(blocksDict),iface=block.iface??{},all=Object.values(iface).flat().map(v=>v.name);
 const system=block.kind==='OB'?(block.obType==='startup'||block.id==='OB100'?[['LostRetentive','iface.lostRetentive'],['LostRTC','iface.lostRtc']] as const:[['Initial_Call','iface.initialCall'],['Remanence','iface.remanence']] as const):[];
 return <table className="tia-grid tia-edit-grid tia-iface-table"><thead><tr><th/><th>{t('iface.name')}</th><th>{t('iface.dataType')}</th><th>{t('iface.default')}</th><th>{t('iface.comment')}</th><th/></tr></thead><tbody>
  {sectionsFor(block.kind).map(section=><Fragment key={section}><tr className="section"><td>▾</td><td colSpan={5}>{t(`iface.${section}`)}</td></tr>
   {section==='input'&&system.map(([n,k])=><tr key={n} className="system"><td/><td>{n}</td><td>Bool</td><td/><td>{t(k)}</td><td/></tr>)}
   {!(block.kind==='OB'&&section==='input')&&<><VarRows list={iface[section]??[]} disabled={locked} onChange={list=>onChange({...iface,[section]:list})}/>
   <tr className="add" onClick={()=>{if(!locked)onChange({...iface,[section]:[...(iface[section]??[]),{name:freeVar(all,base[section]),type:'BOOL',initial:false,comment:''}]});}}><td/><td colSpan={5}>{t('iface.addNew')}</td></tr></>}
  </Fragment>)}
 </tbody></table>;
}

// Data block editor: global DBs are edited directly; instance DBs show the structure of their FB (read-only) with monitor values.
export function DbEditor({program,block,values,monitoring,locked,onChange}:{program:Program;block:Block;values:Record<string,Scalar>;monitoring:boolean;locked:boolean;onChange:(data:Variable[])=>void}){
 const t=useT(blocksDict),fb=block.instanceOf?program.blocks.find(b=>b.id===block.instanceOf):undefined,members=dbMembers(program,block),name=blockName(block);
 const monitor=(v:Variable)=>monitoring?formatValue(values[`${name}.${v.name}`],v.type,defaultFormat(v.type)):'';
 return <div className="tia-table-editor"><div className="tia-table-scroll">{fb&&<p className="tia-muted">{t('db.instanceNote',{fb:blockLabel(fb)})}</p>}
  <table className="tia-grid tia-edit-grid"><thead><tr><th/><th>{t('iface.name')}</th><th>{t('iface.dataType')}</th><th>{t('iface.start')}</th><th>{t('iface.monitor')}</th><th>{t('iface.retain')}</th><th>{t('iface.comment')}</th><th/></tr></thead><tbody>
   <tr className="section"><td>▾</td><td colSpan={7}>{t('iface.static')}</td></tr>
   {fb?members.map(v=><tr key={v.name}><td/><td>{v.name}</td><td>{typeLabel(v.type)}</td><td>{String(v.initial)}</td><td>{monitor(v)}</td><td className="center"><input type="checkbox" disabled checked={false} aria-label={t('iface.retain')}/></td><td className="muted">{v.comment}</td><td/></tr>)
   :(block.data??[]).map((v,i)=><tr key={i}><td/><td><input aria-label={t('iface.name')} disabled={locked} value={v.name} onChange={e=>onChange((block.data??[]).map((x,j)=>j===i?{...x,name:e.target.value.trim()}:x))}/></td>
    <td><select aria-label={t('iface.dataType')} disabled={locked} value={v.type} onChange={e=>{const type=e.target.value as DataType;onChange((block.data??[]).map((x,j)=>j===i?{...x,type,initial:defaultValue(type)}:x));}}>{types.map(x=><option key={x} value={x}>{typeLabel(x)}</option>)}</select></td>
    <td><StartValue v={v} disabled={locked} onChange={initial=>onChange((block.data??[]).map((x,j)=>j===i?{...x,initial}:x))}/></td><td>{monitor(v)}</td><td className="center"><input type="checkbox" disabled checked={false} aria-label={t('iface.retain')}/></td>
    <td><input aria-label={t('iface.comment')} disabled={locked} value={v.comment} onChange={e=>onChange((block.data??[]).map((x,j)=>j===i?{...x,comment:e.target.value}:x))}/></td>
    <td><button className="tia-row-delete" aria-label={t('iface.delete')} title={t('iface.delete')} disabled={locked} onClick={()=>onChange((block.data??[]).filter((_,j)=>j!==i))}><Trash2 size={13}/></button></td></tr>)}
   {!fb&&<tr className="add" onClick={()=>{if(!locked)onChange([...(block.data??[]),{name:freeVar((block.data??[]).map(v=>v.name),'Static'),type:'BOOL',initial:false,comment:''}]);}}><td/><td colSpan={7}>{t('iface.addNew')}</td></tr>}
   {fb&&!members.length&&<tr><td/><td colSpan={7} className="muted">{t('db.empty')}</td></tr>}
  </tbody></table></div></div>;
}
