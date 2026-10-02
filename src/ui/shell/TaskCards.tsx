'use client';
import type {ReactNode} from 'react';
import {Library,ListChecks,Puzzle,SquareFunction,TestTubeDiagonal} from 'lucide-react';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

export type CardId='instructions'|'testing'|'tasks'|'libraries'|'addins';
const cards:{id:CardId;key:'card.instructions'|'card.testing'|'card.tasks'|'card.libraries'|'card.addins';icon:typeof Library}[]=[{id:'instructions',key:'card.instructions',icon:SquareFunction},{id:'testing',key:'card.testing',icon:TestTubeDiagonal},{id:'tasks',key:'card.tasks',icon:ListChecks},{id:'libraries',key:'card.libraries',icon:Library},{id:'addins',key:'card.addins',icon:Puzzle}];

// The task card pane; its vertical tabs live in a separate strip at the window edge (TaskCardTabs).
export function TaskCardPane({active,onClose,children}:{active:CardId;onClose:()=>void;children:ReactNode}){
 const t=useT(shellDict),card=cards.find(c=>c.id===active)!;
 return <aside className="tia-pane tia-cards" aria-label={t(card.key)}><div className="tia-pane-title"><span>{t(card.key)}</span><button className="tia-pane-btn" aria-label={t('pane.collapse')} title={t('pane.collapse')} onClick={onClose}>▸</button></div><div className="tia-card-body">{children}</div></aside>;
}
export function TaskCardTabs({active,open,onSelect}:{active:CardId;open:boolean;onSelect:(id:CardId)=>void}){
 const t=useT(shellDict);
 return <nav className="tia-vtabs" aria-label={t('card.tabs')}>{cards.map(c=><button key={c.id} className={open&&active===c.id?'active':''} aria-pressed={open&&active===c.id} onClick={()=>onSelect(c.id)}><c.icon size={14}/><span>{t(c.key)}</span></button>)}</nav>;
}
// Collapsible section inside a task card ("Favorites", "Basic instructions", "CPU operator panel" …).
export function CardSection({title,open,onToggle,children,grow}:{title:string;open:boolean;onToggle:()=>void;children:ReactNode;grow?:boolean}){
 return <section className={`tia-card-section${open?' open':''}${grow?' grow':''}`}><button className="tia-card-section-head" aria-expanded={open} onClick={onToggle}><span>{open?'⌄':'›'}</span>{title}</button>{open&&<div className="tia-card-section-body">{children}</div>}</section>;
}
export function NotAvailable({text}:{text:string}){return <p className="tia-card-empty">{text}</p>;}
