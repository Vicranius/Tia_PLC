import {type Expr,type Network,type BranchConnection,walk} from './model';

export function connectionError(network:Network,c:BranchConnection):string|undefined {
 const nodes=new Map<string,Expr>(),entry=new Map<string,number>(),exit=new Map<string,number>();let tick=0;
 const visit=(e:Expr)=>{nodes.set(e.id,e);entry.set(e.id,tick++);if('children'in e)e.children.forEach(visit);for(const key of ['input','down','reset','load'] as const)if(key in e)visit((e as unknown as Record<string,Expr>)[key]);exit.set(e.id,tick++);};visit(network.logic);
 const owner=nodes.get(c.block);if(!owner||!['reset','load','down'].includes(c.pin)||!(c.pin in owner))return 'Kontrol pini bulunamadı.';
 const target=(owner as unknown as Record<string,Expr>)[c.pin];
 if(c.source==='$rail')return;
 const source=nodes.get(c.source);if(!source)return 'Bağlantının kaynak branch’i silinmiş.';
 let inside=false;walk(target,e=>{if(e.id===c.source)inside=true;});if(inside)return 'Bir kol kendi içine bağlanamaz.';
 const sourceTime=(c.side==='before'?entry:exit).get(c.source)!;
 if(sourceTime>=entry.get(target.id)!)return 'Kaynak, pinin öncesinde hesaplanan bir branch olmalı.';
}

export function connectBranch(network:Network,connection:BranchConnection):Network {
 const error=connectionError(network,connection);if(error)throw Error(error);
 return {...network,connections:[...(network.connections??[]).filter(c=>c.block!==connection.block||c.pin!==connection.pin),connection]};
}
