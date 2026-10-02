import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/challenges/catalog';
import {material} from '../src/challenges/private';
let cookie='';const origin=process.env.API_ORIGIN??'http://localhost:3000';
async function request(path:string,body?:unknown){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json() as Record<string,unknown>};}
test('Server challenge API, private tests, persistence and owner isolation',async()=>{
 const first=await request('/api/lab?id=3&seed=0');assert.equal(first.status,200);assert.equal('reference'in first.data,false);assert.equal('suites'in first.data,false);
 for(let id=1;id<=catalog.length;id++){const m=material(id);const result=await request('/api/lab',{action:'check',id,seed:0,program:m.reference,hints:0});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.score,100,`challenge ${id}`);}
 const p=material(3).reference;assert.equal((await request('/api/lab',{action:'save',id:3,seed:0,program:p})).status,200);
 const restored=await request('/api/lab?action=restore');assert.deepEqual((restored.data.project as {program:unknown}).program,p);
 const history=await request('/api/lab?action=profile');assert.equal((history.data.attempts as unknown[]).length,catalog.length);
 const other=await fetch(origin+'/api/lab?action=restore');const otherData=await other.json() as {project:unknown};assert.equal(otherData.project,null);
 const invalid=await request('/api/lab',{action:'check',id:3,seed:0,program:{bad:true}});assert.equal(invalid.status,400);
 const changed=structuredClone(p);changed.tags[0].address='%I1.0';assert.equal((await request('/api/lab',{action:'check',id:3,seed:0,program:changed})).status,400);
 const solution=await request('/api/lab',{action:'solution',id:12,seed:0});assert.ok(solution.data.program);
 const cross=await fetch(origin+'/api/lab',{method:'POST',headers:{'Origin':'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({action:'save',id:3,seed:0,program:p})});assert.equal(cross.status,403);
});

const TURKISH_ONLY=/[çğıİöşüÇĞÖŞÜ]/;
type Feedback={what:string;why:string;impact:string;question:string};
type Check={passed:boolean;lang:string;results:{name:string;title:string;pass:boolean;message:string}[];feedback:Feedback};
test('Server answers in the requested language: GET ?lang=, POST body lang, English by default',async()=>{
 const get=async(query:string)=>(await request(`/api/lab?id=3&seed=0${query}`)).data.challenge as {title:string;scenario:string;hints:string[];concepts:string[]};
 const en=await get('&lang=en'),tr=await get('&lang=tr'),none=await get(''),bad=await get('&lang=de');
 assert.notEqual(en.scenario,tr.scenario);assert.deepEqual(none,en);assert.deepEqual(bad,en);assert.deepEqual(en.concepts,tr.concepts);
 assert.ok(!TURKISH_ONLY.test(en.scenario+en.hints.join(' ')));
 const catalogOf=async(lang:string)=>(await request(`/api/lab?id=3&seed=0&lang=${lang}`)).data.catalog as {id:number;concepts:string[]}[];
 const [ce,ct]=[await catalogOf('en'),await catalogOf('tr')];assert.equal(ce.length,catalog.length);assert.deepEqual(ce.map(c=>c.concepts),ct.map(c=>c.concepts));
 // check: failing program, both languages; the stable test name is the same, the display title and texts are localized.
 const p=material(3).reference;const n=p.blocks[0].networks[0];if('children'in n.logic)n.logic.children[2]={id:'broken',type:'NO',tag:'START'};
 const checkEn=(await request('/api/lab',{action:'check',id:3,seed:0,program:p,lang:'en'})).data as unknown as Check;
 const checkTr=(await request('/api/lab',{action:'check',id:3,seed:0,program:p,lang:'tr'})).data as unknown as Check;
 const checkNone=(await request('/api/lab',{action:'check',id:3,seed:0,program:p})).data as unknown as Check;
 assert.equal(checkEn.lang,'en');assert.equal(checkTr.lang,'tr');assert.equal(checkNone.lang,'en');assert.deepEqual(checkNone.feedback,checkEn.feedback);
 const a=checkEn.results.find(r=>r.name==='Seal-in'&&!r.pass),b=checkTr.results.find(r=>r.name==='Seal-in'&&!r.pass);assert.ok(a&&b);assert.notEqual(a.message,b.message);assert.notEqual(a.title,b.title);
 for(const key of ['what','why','impact','question'] as const){assert.ok(checkEn.feedback[key]&&checkTr.feedback[key]);assert.notEqual(checkEn.feedback[key],checkTr.feedback[key],key);}
 assert.ok(!TURKISH_ONLY.test(JSON.stringify(checkEn.feedback)));
 // solution / next: explanations, scan, why, common and the reference network titles follow the language.
 const sol=async(lang:string,action='solution')=>(await request('/api/lab',{action,id:12,seed:0,index:0,lang})).data as unknown as {program?:{blocks:{networks:{title:string}[]}[]};network?:{title:string};explanations:string[];scan:string;why:string;common:string};
 const [se,st,ne,nt]=[await sol('en'),await sol('tr'),await sol('en','next'),await sol('tr','next')];
 for(const key of ['scan','why','common'] as const){assert.notEqual(se[key],st[key],key);assert.ok(!TURKISH_ONLY.test(se[key]),key);}
 assert.equal(se.explanations.length,st.explanations.length);assert.notEqual(se.explanations[0],st.explanations[0]);assert.ok(!TURKISH_ONLY.test(se.explanations.join(' ')));
 assert.notEqual(se.program!.blocks[0].networks[0].title,st.program!.blocks[0].networks[0].title);assert.notEqual(ne.network!.title,nt.network!.title);
});
test('API errors are localized and keep their status codes',async()=>{
 const err=async(body:unknown,lang?:string)=>{const r=await request('/api/lab',body&&typeof body==='object'?{...body,...(lang?{lang}:{})}:body);return {status:r.status,error:String(r.data.error)};};
 const p=material(3).reference,changed=structuredClone(p);changed.tags[0].address='%I1.0';
 const cases:[string,unknown][]=[['I/O contract',{action:'check',id:3,seed:0,program:changed}],['unknown action',{action:'nope',id:3,seed:0,program:p}],['hint count',{action:'check',id:3,seed:0,program:p,hints:1000}],['network step',{action:'next',id:3,seed:0,index:-1}],['invalid program',{action:'check',id:3,seed:0,program:{bad:true}}],['invalid challenge',{action:'check',id:9999,seed:0,program:p}]];
 for(const [name,body] of cases){const en=await err(body,'en'),tr=await err(body,'tr'),none=await err(body);assert.equal(en.status,400,name);assert.equal(tr.status,400,name);assert.notEqual(en.error,tr.error,`${name}: error not localized`);assert.equal(none.error,en.error,`${name}: default is English`);assert.ok(!TURKISH_ONLY.test(en.error),`${name}: ${en.error}`);assert.ok(en.error.trim()&&tr.error.trim());}
 assert.match((await err(cases[0][1],'en')).error,/START/);
 // Cross-origin: the framework may answer 403 before the route runs; either way no program is saved. If the route answers, it speaks the requested language.
 const cross=async(lang:string)=>{const r=await fetch(`${origin}/api/lab?lang=${lang}`,{method:'POST',headers:{'Origin':'https://evil.example','Content-Type':'application/json'},body:'{}'});const text=await r.text();let error='';try{error=(JSON.parse(text) as {error?:string}).error??'';}catch{/* plain-text 403 from the framework */}return {status:r.status,error};};
 const [oe,ot]=[await cross('en'),await cross('tr')];assert.equal(oe.status,403);assert.equal(ot.status,403);if(oe.error&&ot.error)assert.notEqual(oe.error,ot.error);
 const big=await fetch(`${origin}/api/lab?lang=tr`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'check',id:3,seed:0,pad:'x'.repeat(260000)})});assert.equal(big.status,413);
 const notJson=await fetch(`${origin}/api/lab`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{not json'});assert.equal(notJson.status,400);assert.ok(!TURKISH_ONLY.test(((await notJson.json()) as {error:string}).error));
});
