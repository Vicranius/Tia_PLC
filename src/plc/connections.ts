import {type Expr,type Network,type BranchConnection,walk} from './model';
import type {Lang} from '../i18n/core';
import {say} from '../i18n/dict/plc';

export function connectionError(network:Network,c:BranchConnection,lang:Lang='en'):string|undefined {
 const nodes=new Map<string,Expr>(),entry=new Map<string,number>(),exit=new Map<string,number>();let tick=0;
 const visit=(e:Expr)=>{nodes.set(e.id,e);entry.set(e.id,tick++);if('children'in e)e.children.forEach(visit);for(const key of ['input','down','reset','load'] as const)if(key in e)visit((e as unknown as Record<string,Expr>)[key]);exit.set(e.id,tick++);};visit(network.logic);
 const owner=nodes.get(c.block);if(!owner||!['reset','load','down'].includes(c.pin)||!(c.pin in owner))return say(lang,'conn.noPin');
 const target=(owner as unknown as Record<string,Expr>)[c.pin];
 if(c.source==='$rail')return;
 const source=nodes.get(c.source);if(!source)return say(lang,'conn.sourceDeleted');
 let inside=false;walk(target,e=>{if(e.id===c.source)inside=true;});if(inside)return say(lang,'conn.selfLoop');
 const sourceTime=(c.side==='before'?entry:exit).get(c.source)!;
 if(sourceTime>=entry.get(target.id)!)return say(lang,'conn.order');
}

export function connectBranch(network:Network,connection:BranchConnection,lang:Lang='en'):Network {
 const error=connectionError(network,connection,lang);if(error)throw Error(error);
 return {...network,connections:[...(network.connections??[]).filter(c=>c.block!==connection.block||c.pin!==connection.pin),connection]};
}
