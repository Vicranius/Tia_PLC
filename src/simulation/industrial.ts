import type {Scalar} from '../plc/model';
import type {PlantKind} from '../challenges/catalog';
export type Sample={time:number;level:number;temperature:number;quality:number};
const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
/** Deterministic teaching model. The PLC owns every actuator; sensors feed the next scan. */
export class IndustrialPlant {
 kind:PlantKind;level=10;temperature=20;a=0;b=0;quality=0;mass=100;time=0;rotation=0;
 history:Sample[]=[];alarms:string[]=[];
 constructor(kind:PlantKind){this.kind=kind;if(kind==='mixer')this.level=0;if(kind==='roaster')this.level=this.mass;}
 step(ms:number,o:Record<string,Scalar>){
  const dt=ms/1000;this.time+=ms;this.alarms=[];
  if(this.kind==='water'){
   const next=this.level+((o.VALVE?8:0)-(o.PUMP?10:0))*dt;
   if(next>100)this.alarms.push('Taşma: dolum valfini kapatın.');
   if(o.PUMP&&this.level<=2)this.alarms.push('Kuru çalışma: pompayı durdurun.');
   if(o.PUMP&&o.VALVE)this.alarms.push('Dolum ve boşaltma aynı anda açık.');
   this.level=clamp(next);
  }else if(this.kind==='mixer'){
   if(o.DOSE_A||o.DOSE_B)this.quality=0;
   if(o.DOSE_A)this.a+=12*dt;if(o.DOSE_B)this.b+=8*dt;
   if(o.DRAIN){const total=this.a+this.b,remaining=Math.max(0,total-18*dt);if(total){this.a*=remaining/total;this.b*=remaining/total;}}
   this.level=clamp(this.a+this.b);
   if(this.a+this.b>100){this.alarms.push('Karışım tankı taşıyor.');const scale=100/(this.a+this.b);this.a*=scale;this.b*=scale;}
   if(o.MIXER){this.rotation=(this.rotation+dt*180)%360;if(this.level<10)this.alarms.push('Karıştırıcı için ürün seviyesi düşük.');else this.quality=clamp(this.quality+dt*20);}
   if(o.DRAIN&&this.quality<99&&this.level>2)this.alarms.push('Karışım tamamlanmadan boşaltılıyor.');
  }else if(this.kind==='roaster'){
   this.temperature=clamp(this.temperature+((o.HEATER?9:0)-(o.FAN?7:0)-.4)*dt,20,180);
   if(o.DRUM)this.rotation=(this.rotation+dt*90)%360;
   if(o.HEATER&&!o.DRUM)this.alarms.push('Isıtıcı açıkken tambur dönmüyor.');
   if(this.temperature>140)this.alarms.push('Yüksek sıcaklık: 140 °C aşıldı.');
   if(this.temperature>=118&&o.DRUM)this.quality=clamp(this.quality+dt*12.5);
   if(o.DISCHARGE){this.mass=clamp(this.mass-25*dt);if(this.temperature>40)this.alarms.push('Ürün soğumadan boşaltılıyor.');}
   this.level=this.mass;
  }
  if(!this.history.length||this.time-this.history[this.history.length-1].time>=250){this.history.push({time:this.time,level:this.level,temperature:this.temperature,quality:this.quality});if(this.history.length>240)this.history.shift();}
 }
 sensors():Record<string,Scalar>{return {LOW:this.level<=20,HIGH:this.level>=85,EMPTY:this.kind==='roaster'?this.mass<=1:this.level<=2,A_READY:this.a>=60,B_READY:this.b>=30,HOT:this.temperature>=120,COOL:this.temperature<=40,LEVEL:this.level,PROCESS_TEMP:this.temperature};}
 snapshot(){return {kind:this.kind,level:this.level,temperature:this.temperature,a:this.a,b:this.b,quality:this.quality,mass:this.mass,time:this.time,rotation:this.rotation,history:[...this.history],alarms:[...this.alarms]};}
}
