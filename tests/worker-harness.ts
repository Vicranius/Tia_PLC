import type {Runtime} from '../src/plc/runtime';
import type {Plant} from '../src/simulation/conveyor';

// The simulation Web Worker is a module singleton (it installs a global `onmessage` and an interval when first imported), so every
// test file shares one instance through this harness: the handler and the interval callback are captured once, `postMessage` is
// re-pointed at a fresh array on every call.
export type WorkerReply={snapshot?:ReturnType<Runtime['snapshot']>;plant:ReturnType<Plant['snapshot']>;mode:string;cycle:number;error?:string};
type Handler=(event:{data:unknown})=>void;
let handler:Handler|undefined;const intervals:(()=>void)[]=[];
export async function startWorker(){
 const g=globalThis as unknown as Record<string,unknown>,posted:WorkerReply[]=[];
 g.postMessage=(message:WorkerReply)=>{posted.push(message);};
 if(!handler){
  const realInterval=g.setInterval;g.onmessage=null;g.setInterval=(fn:()=>void)=>{intervals.push(fn);return 0;};
  try{await import('../src/simulation/worker');}finally{g.setInterval=realInterval;}
  handler=g.onmessage as Handler;
 }
 g.onmessage=handler;
 const send=(data:Record<string,unknown>)=>handler!({data});
 return {posted,send,tick:()=>intervals.forEach(fn=>fn()),last:()=>posted[posted.length-1]};
}
