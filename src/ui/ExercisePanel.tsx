'use client';
import {useState} from 'react';
import type {Challenge} from '../challenges/catalog';
export default function ExercisePanel({challenge:c,run,test,exercises,locked}:{challenge:Challenge;run:()=>void;test:()=>void;exercises:()=>void;locked:boolean}){
 const [open,setOpen]=useState(true);
 return <section className="exercise-panel"><div className="exercise-heading"><button aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'▾':'▸'} Exercise {String(c.id).padStart(2,'0')} — {c.title}</button><button onClick={exercises}>Exercises</button></div>{open&&<div className="exercise-body"><p>{c.scenario}</p><div className="exercise-columns"><div><b>Inputs / Outputs</b>{c.tags.filter(t=>/^%[IQ]/.test(t.address)).map(t=><div key={t.name}><code>{t.address}</code> <strong>{t.name}</strong> <small>{t.type}</small></div>)}</div><div><b>Required behavior</b><ul>{c.objectives.map(o=><li key={o}>{o}</li>)}</ul></div></div><div className="exercise-actions"><button disabled={locked} onClick={run}>▷ Start Simulation</button><button disabled={locked} onClick={test}>✓ Test Solution</button></div></div>}</section>;
}
