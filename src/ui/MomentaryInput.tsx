'use client';
import {useEffect,useRef,useState} from 'react';
import {useT} from '../i18n/react';
import {processDict} from '../i18n/dict/process';
/** A held physical input is always released on cancellation or loss of focus. */
export default function MomentaryInput({name,onInput}:{name:string;onInput:(name:string,value:boolean)=>void}){
 const t=useT(processDict),[held,setHeld]=useState(false),active=useRef(false),send=useRef(onInput);send.current=onInput;
 const press=()=>{if(!active.current){active.current=true;setHeld(true);send.current(name,true);}};
 const release=()=>{if(active.current){active.current=false;setHeld(false);send.current(name,false);}};
 useEffect(()=>{const reset=()=>{if(active.current){active.current=false;setHeld(false);send.current(name,false);}};window.addEventListener('blur',reset);return()=>{window.removeEventListener('blur',reset);if(active.current){active.current=false;send.current(name,false);}};},[name]);
 return <button className="momentary-input" aria-label={t('momentary.hold',{name})} aria-pressed={held} title={t('momentary.title')} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);press();}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onBlur={release} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press();}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}}}>{held?'● TRUE':t('momentary.idle')}</button>;
}
