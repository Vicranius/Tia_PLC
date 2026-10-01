'use client';
import {useState} from 'react';
import {Search} from 'lucide-react';
import {InstructionIcon} from '../ladder/InstructionIcon';
import {useT} from '../i18n/react';
import {instructionsDict} from '../i18n/dict/instructions';
import {CardSection} from './shell/TaskCards';
import {BlockIcon,FolderIcon} from './shell/TiaIcons';
import {blocksDict} from '../i18n/dict/blocks';

type K=keyof typeof instructionsDict.en;
type Item=[kind:string,version:string];
// Basic instructions in TIA order; groups without items exist in TIA but are not implemented by the trainer.
const basic:[K,Item[]][]=[
 ['g.general',[['NETWORK','']]],
 ['g.bit',[['NO',''],['NC',''],['COIL',''],['SET',''],['RESET',''],['R_TRIG',''],['F_TRIG','']]],
 ['g.timer',[['TON','V1.0'],['TOF','V1.0'],['TP','V1.0']]],
 ['g.counter',[['CTU','V1.0'],['CTD','V1.0'],['CTUD','V1.0']]],
 ['g.compare',[['CMP ==',''],['CMP <>',''],['CMP >=',''],['CMP <=',''],['CMP >',''],['CMP <','']]],
 ['g.math',[['ADD','V1.0'],['SUB','V1.0'],['MUL','V1.0'],['DIV','V1.0'],['MOD','V1.0'],['NEG',''],['ABS',''],['MIN',''],['MAX',''],['LIMIT',''],['SQR',''],['SQRT','']]],
 ['g.move',[['MOVE','']]],
 ['g.convert',[['INT_TO_REAL',''],['REAL_TO_INT',''],['WORD_TO_INT',''],['NORM_X',''],['SCALE_X','']]],
 ['g.program',[]],
 ['g.word',[['AND',''],['OR',''],['XOR',''],['INVERT',''],['DECO',''],['ENCO',''],['SEL','']]],
 ['g.shift',[['SHR',''],['SHL',''],['ROR',''],['ROL','']]],
];
const favorites=['NO','NC','COIL','SET','RESET'];
const extended:K[]=['x.datetime','x.string','x.image','x.dio','x.energy','x.module','x.interrupts','x.alarming','x.diagnostics','x.pulse','x.recipe','x.dbcontrol','x.addressing'];
const technology:K[]=['t.counting','t.pid','t.motion','t.timebased'];
const communication:K[]=['c.s7','c.open','c.web','c.others','c.cp'];
const label=(kind:string)=>kind==='R_TRIG'?'P_TRIG':kind==='F_TRIG'?'N_TRIG':kind==='NETWORK'?'Network':kind;

export default function Instructions({insert,disabled,onProblem,blocks=[]}:{insert:(kind:string)=>void;disabled:boolean;onProblem:()=>void;blocks?:{id:string;label:string;kind:'FB'|'FC'}[]}){
 const t=useT(instructionsDict),tb=useT(blocksDict),[search,setSearch]=useState('');
 const [sections,setSections]=useState<Set<string>>(()=>new Set(['basic'])),[folders,setFolders]=useState<Set<string>>(()=>new Set(['g.bit','g.timer']));
 const flip=(set:Set<string>,id:string)=>{const next=new Set(set);if(next.has(id))next.delete(id);else next.add(id);return next;};
 const query=search.trim().toLowerCase(),match=(kind:string)=>!query||`${label(kind)} ${t(`d.${kind}` as K)}`.toLowerCase().includes(query);
 const row=(kind:string,version:string,depth=1)=><button key={kind} className="tia-instr-row" style={{paddingLeft:6+depth*16}} disabled={disabled} title={`${label(kind)} — ${t(`d.${kind}` as K)}`} onClick={()=>insert(kind)} onDoubleClick={e=>e.preventDefault()}><span className="tia-instr-name"><span className="tia-instr-icon"><InstructionIcon kind={kind}/></span>{label(kind)}</span><span>{t(`d.${kind}` as K)}</span><span>{version}</span></button>;
 const folder=(id:K,items:Item[]|null)=>{const visible=items?.filter(([k])=>match(k))??[];if(query&&!visible.length)return null;const open=query?true:folders.has(id);return <div key={id}><button className="tia-instr-row folder" aria-expanded={open} onClick={()=>setFolders(f=>flip(f,id))}><span className="tia-instr-name"><span className="tia-tree-toggle">{open?'▾':'▸'}</span><FolderIcon/>{t(id)}</span><span/><span/></button>{open&&(items&&items.length?visible.map(([k,v])=>row(k,v,2)):<p className="tia-card-empty indent">{t('notAvailable')}</p>)}</div>;};
 const columns=<div className="tia-instr-head"><span>{t('col.name')}</span><span>{t('col.description')}</span><span>{t('col.version')}</span></div>;
 const section=(id:string,title:K,body:React.ReactNode,grow=false)=><CardSection key={id} title={t(title)} open={!!query||sections.has(id)} grow={grow} onToggle={()=>setSections(s=>flip(s,id))}>{body}</CardSection>;
 return <div className="tia-instructions">
  <div className="tia-card-options"><b>{t('options')}</b><label className="tia-instr-search"><Search size={13}/><input aria-label={t('searchLabel')} placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
  {section('favorites','favorites',<div className="tia-instr-list">{favorites.filter(match).map(k=>row(k,'',0))}</div>)}
  {section('basic','basic',<>{columns}<div className="tia-instr-list"><div><button className="tia-instr-row folder" aria-expanded={!!query||folders.has('user-blocks')} onClick={()=>setFolders(f=>flip(f,'user-blocks'))}><span className="tia-instr-name"><span className="tia-tree-toggle">{query||folders.has('user-blocks')?'▾':'▸'}</span><FolderIcon/>{tb('instr.blocks')}</span><span/><span/></button>{(query||folders.has('user-blocks'))&&(blocks.length?blocks.filter(b=>!query||b.label.toLowerCase().includes(query)).map(b=><button key={b.id} className="tia-instr-row" style={{paddingLeft:38}} disabled={disabled} title={b.label} onClick={()=>insert(`CALL:${b.id}`)}><span className="tia-instr-name"><BlockIcon kind={b.kind} size={14}/>{b.label}</span><span>{tb(b.kind==='FB'?'kind.FB':'kind.FC')}</span><span/></button>):<p className="tia-card-empty indent">{tb('instr.noBlocks')}</p>)}</div>{basic.map(([id,items])=>folder(id,items))}</div><p className="tia-card-hint">{t('hint')} <button className="tia-link" onClick={onProblem}>{t('showTask')}</button></p></>,true)}
  {!query&&section('extended','extended',<div className="tia-instr-list">{extended.map(id=>folder(id,null))}</div>)}
  {!query&&section('technology','technology',<div className="tia-instr-list">{technology.map(id=>folder(id,null))}</div>)}
  {!query&&section('communication','communication',<div className="tia-instr-list">{communication.map(id=>folder(id,null))}</div>)}
  {!query&&section('optional','optional',<p className="tia-card-empty">{t('notAvailable')}</p>)}
 </div>;
}
