'use client';
import type {PlantState} from '../simulation/conveyor';
import type {Scalar} from '../plc/model';
import {useT} from '../i18n/react';
import {processDict} from '../i18n/dict/process';

export default function IndustrialScene({plant,values}:{plant:PlantState;values:Record<string,Scalar>}){
 const t=useT(processDict),p=plant.industrial,roast=p.kind==='roaster',mix=p.kind==='mixer';
 const on=(tag:string)=>Boolean(values[tag]);
 const color=(tag:string)=>on(tag)?'#238a48':'#737e89';
 const valve=(x:number,y:number,tag:string)=><g><path d={`M${x-12} ${y-9}L${x+12} ${y+9}V${y-9}L${x-12} ${y+9}Z`} fill={on(tag)?'#86dca5':'#d9dde1'} stroke={color(tag)} strokeWidth="2"/><text x={x} y={y-20} textAnchor="middle">{tag}</text></g>;
 const motor=(x:number,y:number,tag:string)=><g><circle cx={x} cy={y} r="17" fill={on(tag)?'#d5efdc':'#edf0f2'} stroke={color(tag)} strokeWidth="2"/><text x={x} y={y+5} textAnchor="middle">M</text><text x={tag==='DRUM'?x-20:x+25} y={tag==='DRUM'?y-30:y+5}>{tag} · {on(tag)?'ON':'OFF'}</text></g>;
 const last=p.history.at(-1)?.time??0,first=Math.max(0,last-60000),span=Math.max(10000,last-first);
 const line=(key:'level'|'temperature'|'quality',max:number)=>p.history.map(s=>`${45+(s.time-first)/span*490},${150-s[key]/max*120}`).join(' ');
 return <div className="industrial-visual"><div className="hmi-title"><b>{t(roast?'scene.roaster':mix?'scene.mixer':'scene.water')}</b><span>{on('DONE')?t('scene.done'):on('RUN')?t('scene.active'):t('process.idle')}</span></div>
 <svg viewBox="0 0 580 330" role="img" aria-label={t(roast?'scene.roasterDiagram':mix?'scene.mixerDiagram':'scene.waterDiagram')} className="industrial-schematic">
 <defs><pattern id={`hatch-${p.kind}`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#cad0d7" strokeWidth="1"/></pattern><clipPath id={`vessel-${p.kind}`}><rect x="186" y="88" width="208" height="150"/></clipPath></defs>
 <rect width="580" height="330" fill="#f8fafb"/>
 {roast?<>
  <rect x="176" y="74" width="228" height="176" rx="12" fill={`url(#hatch-${p.kind})`} stroke="#818c99"/>
  <circle cx="290" cy="160" r="72" fill={p.temperature>118?'#f4dfc7':'#e2e7eb'} stroke="#4c5966" strokeWidth="3"/>
  <g transform={`rotate(${p.rotation} 290 160)`}><path d="M290 98V222M228 160H352" stroke="#87919b" strokeWidth="3"/><circle cx="290" cy="160" r="12" fill="#c1cbd2" stroke="#657583"/></g>
  <rect x="250" y="138" width="80" height="45" fill="#f8fafb" opacity=".95"/><text x="290" y="157" textAnchor="middle" className="process-number">{p.temperature.toFixed(1)} °C</text><text x="290" y="176" textAnchor="middle">{t('scene.load',{value:p.mass.toFixed(0)})}</text>
  <path d="M180 269H400" stroke={on('HEATER')?'#d17827':'#87939d'} strokeWidth="7"/><text x="290" y="293" textAnchor="middle">HEATER · {on('HEATER')?'ON':'OFF'}</text>
  <path d="M404 132H475V63" fill="none" stroke={color('FAN')} strokeWidth="5"/>{motor(475,110,'FAN')}
  <path d="M404 217H472V272" fill="none" stroke={color('DISCHARGE')} strokeWidth="4"/>{valve(472,247,'DISCHARGE')}
  {motor(109,160,'DRUM')}<path d="M126 160H218" stroke={color('DRUM')} strokeWidth="3"/>
  <text x="27" y="34">HOT ≥ 120 °C</text><text x="27" y="54">COOL ≤ 40 °C</text>
 </>:<>
  <path d={mix?'M50 53H237V88M527 53H343V88':'M48 53H237V88'} fill="none" stroke={color(mix?'DOSE_A':'VALVE')} strokeWidth="4"/>
  {valve(132,53,mix?'DOSE_A':'VALVE')}{mix&&valve(441,53,'DOSE_B')}
  <rect x="182" y="84" width="216" height="158" fill="#edf2f5" stroke="#697987" strokeWidth="3"/>
  <g clipPath={`url(#vessel-${p.kind})`}><rect x="186" y={238-p.level*1.5} width="208" height={p.level*1.5} fill={mix?'#8a80b8':'#69b8df'} opacity=".8"/></g>
  <text x="290" y="163" textAnchor="middle" className="process-number">{p.level.toFixed(1)} %</text>
  <text x="290" y="184" textAnchor="middle">{mix?`A ${p.a.toFixed(1)} / B ${p.b.toFixed(1)}`:t('scene.tank')}</text>
  {mix?<><path d="M290 65V132" stroke={color('MIXER')} strokeWidth="4"/><path d={`M${290-35*Math.cos(p.rotation*Math.PI/180)} 130H${290+35*Math.cos(p.rotation*Math.PI/180)}`} stroke={color('MIXER')} strokeWidth="5"/>{motor(290,43,'MIXER')}</>:<>{[110,208,234].map((y,i)=><g key={y}><path d={`M398 ${y}H430`} stroke="#6a7c8d"/><circle cx="436" cy={y} r="5" fill={on(['HIGH','LOW','EMPTY'][i])?'#2b9854':'#b7c1ca'}/><text x="449" y={y+4}>{['HIGH 85%','LOW 20%','EMPTY 2%'][i]}</text></g>)}</>}
  <path d="M290 243V275H490" fill="none" stroke={color(mix?'DRAIN':'PUMP')} strokeWidth="4"/>
  {mix?valve(400,275,'DRAIN'):motor(400,275,'PUMP')}
  <text x="35" y="310">{mix?t('scene.recipe'):t('scene.sequence')}</text>
 </>}
 <circle cx="538" cy="310" r="6" fill={on('DONE')?'#238a48':'#bdc6ce'}/><text x="517" y="315" textAnchor="end">DONE</text>
 </svg>
 <div className="process-measures"><span>{roast?t('scene.productLoad'):t('scene.level')}<b>{p.level.toFixed(1)} %</b></span><span>{roast?t('scene.temperature'):t('scene.mix')}<b>{roast?`${p.temperature.toFixed(1)} °C`:mix?`${p.quality.toFixed(0)} %`:'—'}</b></span><span>{t('scene.virtualTime')}<b>{(p.time/1000).toFixed(1)} s</b></span></div>
 <div className="trend-title">{t('scene.trace')} <span><i className="level-key"/> {t(roast?'scene.keyLoad':'scene.keyLevel')} <i className="heat-key"/> {t(roast?'scene.keyTemperature':'scene.keyMix')}</span></div>
 <svg viewBox="0 0 580 185" role="img" aria-label={t('scene.trend')} className="process-trend">
 {[0,25,50,75,100].map(v=><g key={v}><path d={`M45 ${150-v*1.2}H535`} stroke="#d7dee4"/><text x="35" y={154-v*1.2} textAnchor="end">{v}</text>{roast&&<text x="541" y={154-v*1.2}>{v*1.8}</text>}</g>)}
 <polyline points={line('level',100)} fill="none" stroke="#217baa" strokeWidth="2"/><polyline points={line(roast?'temperature':'quality',roast?180:100)} fill="none" stroke="#ba782d" strokeWidth="2"/>
 {[0,.25,.5,.75,1].map(v=><text key={v} x={45+v*490} y="174" textAnchor="middle">{((first+span*v)/1000).toFixed(0)} s</text>)}
 </svg>
 <div className="process-alarms" role="status">{p.alarms.length?p.alarms.map(a=><p key={a}>⚠ {a}</p>):<p>{t('scene.noAlarms')}</p>}</div>
 </div>;
}
