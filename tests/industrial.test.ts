import test from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
import {evaluate} from '../src/challenges/evaluator';
import {Runtime} from '../src/plc/runtime';
import {Plant} from '../src/simulation/conveyor';
import {IndustrialPlant} from '../src/simulation/industrial';
for(const id of [21,22,23,24,25,26,27])for(const seed of [0,1,2,7])test(`Industrial reference ${id}, variant ${seed}: sequence and interlocks`,()=>{
 const m=material(id,seed),e=evaluate(m.reference,id,seed);assert.equal(e.passed,true,JSON.stringify(e.results.filter(r=>!r.pass)));
});
for(const id of [21,22,23])test(`Closed loop ${id}: real PLC outputs drive plant to DONE`,()=>{
 const m=material(id),rt=new Runtime(m.reference),plant=new Plant(m.public.plant);
 if('LID_CLOSED'in rt.inputs)rt.inputs.LID_CLOSED=true;
 let complete=false;
 for(let i=0;i<12000;i++){
  for(const [tag,value] of Object.entries(plant.inputs()))if(tag in rt.inputs)rt.inputs[tag]=value;
  rt.inputs.START=i<5;rt.scan(10);plant.step(10,rt.outputs);
  assert.equal(plant.industrial.alarms.length,0,plant.industrial.alarms.join(', '));
  if(rt.outputs.DONE){complete=true;break;}
 }
 assert.equal(complete,true,JSON.stringify({outputs:rt.outputs,plant:plant.snapshot()}));
 assert.ok(plant.industrial.history.length>10);assert.ok(plant.industrial.history.length<=240);
 for(const [tag,value] of Object.entries(rt.outputs))if(tag!=='DONE')assert.equal(value,false,tag);
});
test('A stuck HIGH sensor changes the PLC path; process alarm detects missing upper stop',()=>{
 const m=material(21),rt=new Runtime(m.reference),plant=new Plant('water');plant.faultTarget='HIGH';plant.fault='stuck-false';
 for(let i=0;i<1600;i++){for(const [k,v] of Object.entries(plant.inputs()))if(k in rt.inputs)rt.inputs[k]=v;rt.inputs.START=i<5;rt.scan(10);plant.step(10,rt.outputs);}
 assert.equal(plant.level,100);assert.equal(rt.outputs.VALVE,true);assert.ok(plant.industrial.alarms.some(a=>a.includes('Taşma')));
 rt.inputs.FAULT=true;rt.scan(10);assert.equal(rt.outputs.VALVE,false);assert.equal(rt.outputs.PUMP,false);
});
test('Plant clamps physical bounds and detects unsafe actuator combinations',()=>{
 const tank=new IndustrialPlant('water');tank.step(1000,{VALVE:true,PUMP:true});assert.ok(tank.alarms.length);
 const roast=new IndustrialPlant('roaster');roast.step(1000,{HEATER:true});assert.ok(roast.alarms.some(a=>a.includes('tambur')));
 roast.step(60000,{HEATER:true,DRUM:true});assert.equal(roast.temperature,180);
 roast.step(60000,{FAN:true});assert.equal(roast.temperature,20);
});
