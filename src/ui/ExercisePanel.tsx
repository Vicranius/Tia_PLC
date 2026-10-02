'use client';
import {useMemo,useState} from 'react';
import {challenge as localize,type Challenge} from '../challenges/catalog';
import {useLang,useT} from '../i18n/react';
import {learningDict} from '../i18n/dict/learning';
export default function ExercisePanel({challenge:c,run,test,reset,exercises,locked}:{challenge:Challenge;run:()=>void;test:()=>void;reset:()=>void;exercises:()=>void;locked:boolean}){
 const [open,setOpen]=useState(true);
 const t=useT(learningDict),{lang}=useLang();
 // Title, scenario and objectives follow the interface language; the I/O tags (names, addresses, types) come from the loaded challenge as they are.
 const text=useMemo(()=>localize(c.id,c.seed,lang),[c.id,c.seed,lang]);
 return <section className="exercise-panel"><div className="exercise-heading"><button aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'▾':'▸'} {t('exercise.heading',{n:String(c.id).padStart(2,'0'),title:text.title})}</button><button onClick={exercises}>{t('exercise.list')}</button></div>{open&&<div className="exercise-body"><p>{text.scenario}</p><div className="exercise-columns"><div><b>{t('exercise.io')}</b>{c.tags.filter(x=>/^%[IQ]/.test(x.address)).map(x=><div key={x.name}><code>{x.address}</code> <strong>{x.name}</strong> <small>{x.type}</small></div>)}</div><div><b>{t('exercise.behavior')}</b><ul>{text.objectives.map(o=><li key={o}>{o}</li>)}</ul></div></div><div className="exercise-actions"><button disabled={locked} onClick={run}>{t('exercise.run')}</button><button disabled={locked} onClick={test}>{t('exercise.test')}</button><button disabled={locked} onClick={reset}>{t('exercise.reset')}</button></div></div>}</section>;
}
