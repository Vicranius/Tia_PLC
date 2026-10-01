'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,X} from 'lucide-react';
import {useT} from '../../i18n/react';
import {shellDict} from '../../i18n/dict/shell';

// Compact simulator window in the style of TIA's PLC simulation: CPU, LEDs, RUN/STOP/MRES, IP address.
export default function Plcsim({cpu,mode,loaded,consistent,errors,forces,onRun,onStop,onMres,onClose}:{cpu:string;mode:string;loaded:boolean;consistent:boolean;errors:number;forces:number;onRun:()=>void;onStop:()=>void;onMres:()=>void;onClose:()=>void}){
 const t=useT(shellDict),root=useRef<HTMLDivElement>(null),drag=useRef<{dx:number;dy:number}|null>(null),[pos,setPos]=useState<{x:number;y:number}|null>(null),[collapsed,setCollapsed]=useState(false);
 // Keep a dragged window inside the viewport when the browser is resized.
 useEffect(()=>{const clamp=()=>setPos(p=>{if(!p||!root.current)return p;return {x:Math.max(0,Math.min(window.innerWidth-root.current.offsetWidth,p.x)),y:Math.max(0,Math.min(window.innerHeight-root.current.offsetHeight,p.y))};});window.addEventListener('resize',clamp);return()=>window.removeEventListener('resize',clamp);},[]);
 const running=mode==='RUN';
 return <div ref={root} className="tia-plcsim" role="dialog" aria-label={t('plcsim.title')} style={pos?{left:pos.x,top:pos.y,right:'auto',bottom:'auto'}:undefined}>
  <div className="tia-plcsim-title" title={t('plcsim.dock')} onPointerDown={e=>{const r=root.current!.getBoundingClientRect();drag.current={dx:e.clientX-r.left,dy:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;const w=root.current!.offsetWidth,h=root.current!.offsetHeight;setPos({x:Math.max(0,Math.min(window.innerWidth-w,e.clientX-drag.current.dx)),y:Math.max(0,Math.min(window.innerHeight-h,e.clientY-drag.current.dy))});}} onPointerUp={()=>{drag.current=null;}}>
   <span>{t('plcsim.title')} · {mode}</span><span className="tia-grow"/><button aria-label={collapsed?t('pane.expand'):t('pane.collapse')} title={collapsed?t('pane.expand'):t('pane.collapse')} onPointerDown={e=>e.stopPropagation()} onClick={()=>setCollapsed(v=>!v)}>{collapsed?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button><button aria-label={t('plcsim.close')} title={t('plcsim.close')} onPointerDown={e=>e.stopPropagation()} onClick={onClose}><X size={13}/></button></div>
  {!collapsed&&<div className="tia-plcsim-body">
   <div className="tia-plcsim-row"><b>PLC_1</b><span>{cpu}</span></div>
   <div className="tia-plcsim-main"><ul className="tia-leds"><li><i className={running?'led green':mode==='ERROR'?'led red':'led yellow'}/>RUN / STOP</li><li><i className={mode==='ERROR'||errors?'led red':'led off'}/>ERROR</li><li><i className={forces?'led yellow':'led off'}/>MAINT</li></ul>
    <div className="tia-cpu-buttons"><button className={running?'pressed':''} disabled={!loaded||running} onClick={onRun}>RUN</button><button className={!running?'pressed':''} disabled={!running} onClick={onStop}>STOP</button><button disabled={running} onClick={onMres}>MRES</button></div></div>
   <div className="tia-plcsim-row"><span>{t('plcsim.ip')}</span><code>192.168.0.1</code></div>
   <p className={`tia-plcsim-state${loaded&&!consistent?' warn':''}`}>{!loaded?t('plcsim.notLoaded'):consistent?t('plcsim.loaded'):t('plcsim.differs')}</p>
  </div>}
 </div>;
}
