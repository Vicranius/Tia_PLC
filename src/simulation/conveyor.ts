import {IndustrialPlant} from './industrial';
import type {PlantKind} from '../challenges/catalog';
import type {Scalar} from '../plc/model';
export class Plant {
 industrial:IndustrialPlant;faultTarget='';
 constructor(kind:PlantKind='motor'){this.industrial=new IndustrialPlant(kind);this.auto=['water','mixer','roaster'].includes(kind);if(this.auto){this.level=this.industrial.level;this.temperature=this.industrial.temperature;}}
 position=0.12;count=0;level=35;temperature=20;pusher=0;auto=false;fault:'none'|'stuck-true'|'stuck-false'='none';
 step(ms:number,outputs:Record<string,Scalar>){if(['water','mixer','roaster'].includes(this.industrial.kind)){this.industrial.step(ms,outputs);this.level=this.industrial.level;this.temperature=this.industrial.temperature;return;}const dt=ms/1000;const moving=Boolean(outputs.CONVEYOR??outputs.MOTOR??outputs.PUMP??outputs.FAN);this.pusher=Math.max(0,Math.min(1,this.pusher+(outputs.PUSHER?dt*5:-dt*5)));if(moving)this.position+=dt*.15;if(outputs.PUSHER&&this.position>.54&&this.position<.73){this.count++;this.position=.03;}if(this.position>1){this.position=0;this.count++;}this.level=Math.min(100,Math.max(0,this.level+(outputs.VALVE?8*dt:outputs.PUMP?-7*dt:0)));this.temperature=Math.max(0,Math.min(150,this.temperature+(outputs.HEATER?2*dt:-.15*dt)));}
 sensor(){return this.fault==='stuck-true'?true:this.fault==='stuck-false'?false:this.position>=.60&&this.position<.72;}
 inputs():Record<string,Scalar>{const result=this.industrial.sensors();if(this.faultTarget&&this.fault!=='none'&&typeof result[this.faultTarget]==='boolean')result[this.faultTarget]=this.fault==='stuck-true';return result;}
 snapshot(){return {industrial:this.industrial.snapshot(),faultTarget:this.faultTarget,position:this.position,count:this.count,level:this.level,temperature:this.temperature,pusher:this.pusher,auto:this.auto,fault:this.fault,sensor:this.sensor()};}
}
export type PlantState=ReturnType<Plant['snapshot']>;
