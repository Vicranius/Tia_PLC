import type {Expr,Network} from '../plc/model';

export interface PlacedLogic {layout:LogicLayout;x:number;y:number;port:'IN'|'R'}
export interface LogicLayout {expr:Expr;width:number;height:number;terminalY:number;children:PlacedLogic[];boxX?:number;resetY?:number}
export interface RungLayout {logic:LogicLayout;logicX:number;logicY:number;terminalY:number;coilX:number;coilWidth:number;rightRailX:number;width:number;height:number}

// All dimensions belong to one SVG coordinate system. Labels never affect ports.
export function layoutLogic(expr:Expr):LogicLayout {
 const base={expr,width:112,height:108,terminalY:58,children:[] as PlacedLogic[]};
 if('children'in expr){
  if(!expr.children.length)return {...base,width:112};
  const layouts=expr.children.map(layoutLogic);
  if(expr.type==='AND'){
   const terminalY=Math.max(...layouts.map(l=>l.terminalY));let x=0;
   const children=layouts.map(layout=>{const child={layout,x,y:terminalY-layout.terminalY,port:'IN' as const};x+=layout.width;return child;});
   return {...base,width:x,terminalY,height:Math.max(...children.map(c=>c.y+c.layout.height)),children};
  }
  let y=0;const children=layouts.map(layout=>{const child={layout,x:24,y,port:'IN' as const};y+=layout.height+14;return child;});
  return {...base,width:Math.max(...layouts.map(l=>l.width))+48,height:y-14,terminalY:layouts[0].terminalY,children};
 }
 if('input'in expr){
  const input=layoutLogic(expr.input);const children:PlacedLogic[]=[{layout:input,x:0,y:0,port:'IN'}];
  let resetY:number|undefined;let childWidth=input.width;let height=Math.max(input.height,input.terminalY+98);
  if('reset'in expr){const reset=layoutLogic(expr.reset),y=input.height+14;children.push({layout:reset,x:0,y,port:'R'});resetY=y+reset.terminalY;childWidth=Math.max(childWidth,reset.width);height=Math.max(height,y+reset.height,resetY+42);}
  const boxX=childWidth+24;
  return {...base,width:boxX+158,height,terminalY:input.terminalY,children,boxX,resetY};
 }
 if(expr.type==='COMPARE')return {...base,width:160,height:136};
 return base;
}

export function layoutRung(network:Network):RungLayout {
 const logic=layoutLogic(network.logic),logicX=40,logicY=12;
 const terminalY=logicY+logic.terminalY,coilX=logicX+logic.width+40,coilWidth=112,rightRailX=coilX+coilWidth+24;
 return {logic,logicX,logicY,terminalY,coilX,coilWidth,rightRailX,width:rightRailX+20,height:Math.max(logicY+logic.height+12,terminalY+70)};
}
