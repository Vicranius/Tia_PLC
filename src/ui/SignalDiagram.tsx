import type {Tag,Scalar} from '../plc/model';
export default function SignalDiagram({tags,values}:{tags:Tag[];values:Record<string,Scalar>}){
 const outputs=tags.filter(t=>t.address.startsWith('%Q'));
 return <div className="signal-diagram"><div className="hmi-title"><b>PLC_1 · Sinyal ve aktüatör izleme</b></div><svg viewBox={`0 0 500 ${Math.max(170,outputs.length*70+35)}`} role="img" aria-label="PLC çıkışları ve bağlı aktüatör durumları">
 {outputs.map((t,i)=>{const y=55+i*70,on=Boolean(values[t.name]);return <g key={t.name}><rect x="25" y={y-20} width="135" height="40" fill="#e7ebef" stroke="#8797a5"/><text x="92" y={y-3} textAnchor="middle">{t.address}</text><text x="92" y={y+13} textAnchor="middle">{t.name}</text><path d={`M160 ${y}H290`} stroke={on?'#299451':'#7c8894'} strokeWidth="3"/><circle cx="316" cy={y} r="25" fill={on?'#d1efd9':'#edf0f3'} stroke={on?'#299451':'#7c8894'} strokeWidth="2"/><text x="316" y={y+4} textAnchor="middle">{t.name.includes('ALARM')?'!':t.name==='VALID'?'✓':'M'}</text><text x="360" y={y+5}>{on?'ON / TRUE':'OFF / FALSE'}</text></g>;})}
 </svg><p>Geri bildirim ve talepleri giriş panelinden değiştir; komut ve alarm sonuçlarını izle.</p></div>;
}
