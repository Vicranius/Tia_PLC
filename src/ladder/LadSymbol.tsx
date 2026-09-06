import {symbolGeometry,LAD_STROKE,type SymbolKind} from './geometry';
export default function LadSymbol({kind,x,y,incoming,outgoing}:{kind:SymbolKind;x:number;y:number;incoming:string;outgoing:string}){
 const g=symbolGeometry(kind,x,y);
 return <g data-lad-symbol={kind} data-cell-x={x} data-cell-y={y} data-left-wire={g.leftWireLength} data-right-wire={g.rightWireLength} fill="none" strokeWidth={LAD_STROKE}>
  <line data-connector="left" x1={g.left} y1={g.cy} x2={g.bodyLeft} y2={g.cy} stroke={incoming}/>
  <line data-connector="right" x1={g.bodyRight} y1={g.cy} x2={g.right} y2={g.cy} stroke={outgoing}/>
  {g.paths.map((d,i)=><path key={i} d={d} stroke={outgoing}/>)}
  {g.letter&&<text x={g.cx} y={g.cy+4} textAnchor="middle" fill={outgoing} style={{fill:outgoing}} stroke="none" fontSize={11}>{g.letter}</text>}
 </g>;
}
