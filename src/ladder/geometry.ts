import type {Expr,Network} from '../plc/model';

export const LAD_GRID_X=64;
export const LAD_GRID_Y=48;
export const LAD_STROKE=2;
export const LAD_MIN_RUNG_CELLS=9;
export type SymbolKind='NO'|'NC'|'P'|'N'|'COIL'|'SET'|'RESET';
/** Fixed electrical cell. Labels are deliberately not an input. */
export function symbolGeometry(kind:SymbolKind,x=0,y=0){
 const width=LAD_GRID_X,height=LAD_GRID_Y,cx=x+width/2,cy=y+height/2,halfBody=10;
 const left=x,right=x+width,bodyLeft=cx-halfBody,bodyRight=cx+halfBody;
 const coil=['COIL','SET','RESET'].includes(kind);
 const paths=coil
  ? [`M ${cx-5} ${cy-10} Q ${cx-15} ${cy} ${cx-5} ${cy+10}`,`M ${cx+5} ${cy-10} Q ${cx+15} ${cy} ${cx+5} ${cy+10}`]
  : [`M ${bodyLeft} ${cy-10} V ${cy+10}`,`M ${bodyRight} ${cy-10} V ${cy+10}`,...(kind==='NC'?[`M ${cx-7} ${cy+10} L ${cx+7} ${cy-10}`]:[])];
 return {width,height,cx,cy,left,right,bodyLeft,bodyRight,leftWireLength:bodyLeft-left,rightWireLength:right-bodyRight,paths,letter:kind==='SET'?'S':kind==='RESET'?'R':kind==='P'?'P':kind==='N'?'N':''};
}
export type LogicPort='IN'|'CU'|'CD'|'R'|'LD';
export interface PlacedLogic {layout:LogicLayout;x:number;y:number;port:LogicPort}
export interface LogicLayout {expr:Expr;width:number;height:number;terminalY:number;children:PlacedLogic[];boxX?:number;resetY?:number}
export interface RungLayout {logic:LogicLayout;logicX:number;logicY:number;terminalY:number;coilX:number;coilWidth:number;rightRailX:number;width:number;height:number}
const X=LAD_GRID_X,Y=LAD_GRID_Y;
export function layoutLogic(expr:Expr):LogicLayout {
 const base={expr,width:X,height:Y*2,terminalY:Y*1.5,children:[] as PlacedLogic[]};
 if('children'in expr){
  if(!expr.children.length)return base;
  const layouts=expr.children.map(layoutLogic);
  if(expr.type==='AND'){
   const terminalY=Math.max(...layouts.map(l=>l.terminalY));let x=0;
   const children=layouts.map(layout=>{const child={layout,x,y:terminalY-layout.terminalY,port:'IN' as const};x+=layout.width;return child;});
   return {...base,width:x,terminalY,height:Math.max(...children.map(c=>c.y+c.layout.height)),children};
  }
  let y=0;const children=layouts.map(layout=>{const child={layout,x:X,y,port:'IN' as const};y+=layout.height;return child;});
  return {...base,width:Math.max(...layouts.map(l=>l.width))+2*X,height:y,terminalY:layouts[0].terminalY,children};
 }
 if('input'in expr){
  const input=layoutLogic(expr.input),firstPort:LogicPort=expr.type==='CTU'||expr.type==='CTUD'?'CU':expr.type==='CTD'?'CD':'IN',children:PlacedLogic[]=[{layout:input,x:0,y:0,port:firstPort}];
  if(expr.type==='R_TRIG'||expr.type==='F_TRIG')return {...base,width:input.width+X,height:input.height,terminalY:input.terminalY,children,boxX:input.width};
  let resetY:number|undefined,childWidth=input.width,height=Math.max(input.height,Y*4),nextY=input.height;
  const append=(childExpr:Expr,port:LogicPort)=>{const child=layoutLogic(childExpr);children.push({layout:child,x:0,y:nextY,port});resetY=nextY+child.terminalY;nextY+=child.height;childWidth=Math.max(childWidth,child.width);height=Math.max(height,nextY+Y);};
  if('down'in expr)append(expr.down,'CD');
  if('reset'in expr)append(expr.reset,'R');
  if('load'in expr)append(expr.load,'LD');
  return {...base,width:childWidth+3*X,height:Math.max(height,(resetY??input.terminalY)+2*Y),terminalY:input.terminalY,children,boxX:childWidth+X,resetY};
 }
 if(expr.type==='COMPARE')return {...base,width:2*X,height:3*Y};
 return base;
}
export function layoutRung(network:Network):RungLayout {
 const logic=layoutLogic(network.logic),logicX=LAD_GRID_X,logicY=0;
 const terminalY=logic.terminalY,coilX=logicX+logic.width,coilWidth=network.output.type==='MOVE'?3*LAD_GRID_X:LAD_GRID_X,rightRailX=Math.max(logicX+LAD_MIN_RUNG_CELLS*LAD_GRID_X,coilX+coilWidth);
 return {logic,logicX,logicY,terminalY,coilX,coilWidth,rightRailX,width:rightRailX+LAD_GRID_X,height:Math.max(logic.height+(network.output.type==='MOVE'?LAD_GRID_Y:0),3*LAD_GRID_Y)};
}
