'use client';
import {useState} from 'react';
import {X} from 'lucide-react';
import type {Block,BlockKind,Program} from '../../plc/model';
import {blockLabel,blockName,blockNumber,identifier,nextNumber} from '../../plc/blocks';
import {useT} from '../../i18n/react';
import {blocksDict} from '../../i18n/dict/blocks';
import {BlockIcon,DbIcon} from './TiaIcons';

const kinds:BlockKind[]=['OB','FB','FC','DB'];
const nameTaken=(p:Program,name:string)=>p.blocks.some(b=>blockName(b).toLowerCase()===name.toLowerCase())||p.tags.some(t=>t.name.toLowerCase()===name.toLowerCase());
const freeName=(p:Program,base:string)=>{let n=1;while(nameTaken(p,`${base}_${n}`))n++;return `${base}_${n}`;};
const kindIcon=(k:BlockKind,size=34)=>k==='DB'?<DbIcon size={size}/>:<BlockIcon kind={k} size={size}/>;

// "Add new block" as in TIA: block type tiles on the left, name/language/number and type-specific options on the right.
export function AddBlockDialog({program,onCreate,onCancel}:{program:Program;onCreate:(block:Block,open:boolean)=>void;onCancel:()=>void}){
 const t=useT(blocksDict),fbs=program.blocks.filter(b=>b.kind==='FB');
 const [kind,setKind]=useState<BlockKind>('FB'),[name,setName]=useState(()=>freeName(program,'Block')),[auto,setAuto]=useState(true),[number,setNumber]=useState(nextNumber(program,'FB')),[obType,setObType]=useState<'cycle'|'startup'>('cycle'),[dbType,setDbType]=useState('global'),[open,setOpen]=useState(true),[error,setError]=useState('');
 const choose=(k:BlockKind)=>{setKind(k);setNumber(nextNumber(program,k));setError('');};
 const effective=auto?nextNumber(program,kind):number;
 const create=()=>{const n=name.trim();if(!identifier.test(n))return setError(t('err.name'));if(nameTaken(program,n))return setError(t('err.duplicate',{name:n}));if(program.blocks.some(b=>b.kind===kind&&blockNumber(b)===effective))return setError(t('err.number',{number:effective,kind:t(`kind.${kind}`)}));if(kind==='DB'&&dbType!=='global'&&!fbs.length)return setError(t('err.noFb'));
  const block:Block={id:`${kind}${effective}`,kind,name:n,number:effective,networks:[]};
  if(kind==='OB')block.obType=obType;if(kind==='FB')block.iface={input:[],output:[],inout:[],static:[],temp:[],constant:[]};if(kind==='FC')block.iface={input:[],output:[],inout:[],temp:[],constant:[]};
  if(kind==='DB'){if(dbType==='global')block.data=[];else block.instanceOf=dbType;}
  onCreate(block,open);};
 return <div className="tia-modal-backdrop"><div className="tia-dialog tia-add-block" role="dialog" aria-modal="true" aria-label={t('add.title')}>
  <div className="tia-dialog-title"><span>{t('add.title')}</span><button aria-label={t('add.cancel')} onClick={onCancel}><X size={14}/></button></div>
  <div className="tia-add-block-body">
   <div className="tia-block-tiles" role="radiogroup" aria-label={t('add.type')}>{kinds.map(k=><button key={k} role="radio" aria-checked={kind===k} className={kind===k?'active':''} onClick={()=>choose(k)}>{kindIcon(k)}<span>{t(`kind.${k}`)}</span></button>)}</div>
   <div className="tia-block-form">
    <div className="tia-form-grid"><label htmlFor="block-name">{t('add.name')}</label><input id="block-name" value={name} onChange={e=>{setName(e.target.value);setError('');}}/>
     {kind!=='DB'&&<><label>{t('add.language')}</label><select disabled><option>LAD</option></select></>}
     <label>{t('add.number')}</label><span className="tia-number"><input type="number" min={1} max={65535} value={effective} disabled={auto} onChange={e=>setNumber(Number(e.target.value))}/><label className="tia-check"><input type="radio" checked={!auto} onChange={()=>setAuto(false)}/>{t('add.manual')}</label><label className="tia-check"><input type="radio" checked={auto} onChange={()=>setAuto(true)}/>{t('add.automatic')}</label></span>
     {kind==='OB'&&<><label>{t('add.type')}</label><select value={obType} onChange={e=>setObType(e.target.value as 'cycle'|'startup')}><option value="cycle">{t('ob.cycle')}</option><option value="startup">{t('ob.startup')}</option></select></>}
     {kind==='DB'&&<><label>{t('add.type')}</label><select value={dbType} onChange={e=>setDbType(e.target.value)}><option value="global">{t('db.global')}</option>{fbs.map(fb=><option key={fb.id} value={fb.id}>{t('db.instance',{fb:blockLabel(fb)})}</option>)}</select></>}
    </div>
    <p className="tia-block-desc">{t(`desc.${kind}`)}</p>
    {error&&<p className="tia-form-error" role="alert">{error}</p>}
   </div>
  </div>
  <div className="tia-dialog-body tia-dialog-foot"><div className="tia-dialog-buttons"><label className="tia-check"><input type="checkbox" checked={open} onChange={e=>setOpen(e.target.checked)}/>{t('add.open')}</label><span className="tia-grow"/><button className="primary" onClick={create}>{t('add.ok')}</button><button onClick={onCancel}>{t('add.cancel')}</button></div></div>
 </div></div>;
}

// Call options when an FB is inserted: a single-instance DB is created (name "<FB>_DB", automatic number).
export function CallOptionsDialog({program,fb,onCreate,onCancel}:{program:Program;fb:Block;onCreate:(db:Block)=>void;onCancel:()=>void}){
 const t=useT(blocksDict),[name,setName]=useState(()=>nameTaken(program,`${blockName(fb)}_DB`)?freeName(program,`${blockName(fb)}_DB`):`${blockName(fb)}_DB`),[error,setError]=useState('');
 const number=nextNumber(program,'DB');
 const ok=()=>{const n=name.trim();if(!identifier.test(n))return setError(t('err.name'));if(nameTaken(program,n))return setError(t('err.duplicate',{name:n}));onCreate({id:`DB${number}`,kind:'DB',name:n,number,instanceOf:fb.id,networks:[]});};
 return <div className="tia-modal-backdrop"><div className="tia-dialog tia-call-options" role="dialog" aria-modal="true" aria-label={t('call.title')}>
  <div className="tia-dialog-title"><span>{t('call.title')}</span><button aria-label={t('add.cancel')} onClick={onCancel}><X size={14}/></button></div>
  <div className="tia-add-block-body"><div className="tia-block-tiles"><button className="active" role="radio" aria-checked="true"><DbIcon size={34}/><span>{t('call.single')}</span></button></div>
   <div className="tia-block-form"><div className="tia-form-grid"><label htmlFor="call-db-name">{t('call.dbName')}</label><input id="call-db-name" value={name} onChange={e=>{setName(e.target.value);setError('');}}/><label>{t('call.dbNumber')}</label><span className="tia-number"><input type="number" value={number} disabled/><label className="tia-check"><input type="radio" checked readOnly/>{t('add.automatic')}</label></span></div>
    <p className="tia-block-desc">{t('call.singleDesc')}</p>{error&&<p className="tia-form-error" role="alert">{error}</p>}</div></div>
  <div className="tia-dialog-body tia-dialog-foot"><div className="tia-dialog-buttons"><span className="tia-grow"/><button className="primary" onClick={ok}>{t('add.ok')}</button><button onClick={onCancel}>{t('add.cancel')}</button></div></div>
 </div></div>;
}
