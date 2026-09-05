import {test} from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
let cookie='';const origin='http://localhost:3000';
async function request(path:string,body?:unknown){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json() as Record<string,unknown>};}
test('Server challenge API, private tests, persistence and owner isolation',async()=>{
 const first=await request('/api/lab?id=3&seed=0');assert.equal(first.status,200);assert.equal('reference'in first.data,false);assert.equal('suites'in first.data,false);
 for(let id=1;id<=20;id++){const m=material(id);const result=await request('/api/lab',{action:'check',id,seed:0,program:m.reference,hints:0});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.score,100,`challenge ${id}`);}
 const p=material(3).reference;assert.equal((await request('/api/lab',{action:'save',id:3,seed:0,program:p})).status,200);
 const restored=await request('/api/lab?action=restore');assert.deepEqual((restored.data.project as {program:unknown}).program,p);
 const history=await request('/api/lab?action=profile');assert.equal((history.data.attempts as unknown[]).length,20);
 const other=await fetch(origin+'/api/lab?action=restore');const otherData=await other.json() as {project:unknown};assert.equal(otherData.project,null);
 const invalid=await request('/api/lab',{action:'check',id:3,seed:0,program:{bad:true}});assert.equal(invalid.status,400);
 const changed=structuredClone(p);changed.tags[0].address='%I1.0';assert.equal((await request('/api/lab',{action:'check',id:3,seed:0,program:changed})).status,400);
 const solution=await request('/api/lab',{action:'solution',id:12,seed:0});assert.ok(solution.data.program);
 const cross=await fetch(origin+'/api/lab',{method:'POST',headers:{'Origin':'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({action:'save',id:3,seed:0,program:p})});assert.equal(cross.status,403);
});
