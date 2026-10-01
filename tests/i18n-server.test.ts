// Server-side language handling: reference suites, evaluator results, feedback, solution text and API validation helpers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {material} from '../src/challenges/private';
import {challenge,catalog} from '../src/challenges/catalog';
import {validated,evaluate,execute,assertContract,solutionText} from '../src/challenges/evaluator';
import {langOf,type Lang} from '../src/i18n/core';
import {serverDict} from '../src/i18n/dict/server';
import type {Program} from '../src/plc/model';
const LANGS:Lang[]=['en','tr'];
const TURKISH_ONLY=/[çğıİöşüÇĞÖŞÜ]/;
const ids=catalog.map(c=>c.id);
const broken=(lang:Lang)=>{const p=material(3,0,lang).reference;const n=p.blocks[0].networks[0];if('children'in n.logic)n.logic.children[2]={id:'broken',type:'NO',tag:'START'};return p;};
// Same program with every language-dependent field removed: titles and tag comments.
const logicOnly=(p:Program)=>({...structuredClone(p),tags:p.tags.map(t=>({...t,comment:''})),blocks:p.blocks.map(b=>({...b,networks:b.networks.map(n=>({...n,title:''}))}))});

test('langOf validates the API language and falls back to English',()=>{
 assert.equal(langOf('tr'),'tr');assert.equal(langOf('en'),'en');
 for(const bad of [undefined,null,'','de','TR','tr-TR',42,{},['tr']])assert.equal(langOf(bad),'en');
});

test('All exercises and seeds validate in both languages with identical logic',()=>{
 for(const id of ids)for(const seed of[0,1,2,3]){
  const en=validated(id,seed,'en'),tr=validated(id,seed,'tr');
  for(const lang of LANGS){const m=lang==='en'?en:tr;assert.ok(m.suites.every(s=>execute(m.reference,s,lang).pass),`${id}/${seed}/${lang}`);assert.equal(evaluate(m.reference,id,seed,0,lang).score,100,`${id}/${seed}/${lang}`);}
  assert.deepEqual(logicOnly(en.reference),logicOnly(tr.reference),`reference logic ${id}/${seed}`);
  assert.deepEqual(en.suites.map(s=>({name:s.name,category:s.category,steps:s.steps.map(x=>({at:x.at,inputs:x.inputs,expect:x.expect}))})),tr.suites.map(s=>({name:s.name,category:s.category,steps:s.steps.map(x=>({at:x.at,inputs:x.inputs,expect:x.expect}))})),`suite structure ${id}/${seed}`);
 }
});

test('Suite titles, step reasons and network titles are written in the requested language',()=>{
 for(const id of ids){
  const en=material(id,0,'en'),tr=material(id,0,'tr');assert.equal(en.suites.length,tr.suites.length);
  en.suites.forEach((s,i)=>{const o=tr.suites[i];
   assert.equal(s.name,o.name,'name is the stable key');assert.ok(s.title&&o.title);assert.equal(s.title,s.name,'English title is the stable name');assert.notEqual(s.title,o.title,`${id}: title "${s.title}" not translated`);
   assert.ok(!TURKISH_ONLY.test(s.title+s.steps.map(x=>x.reason).join(' ')),`${id}/${s.name}: Turkish text in English suite`);
   s.steps.forEach((x,j)=>{assert.ok(x.reason.trim()&&o.steps[j].reason.trim());assert.notEqual(x.reason,o.steps[j].reason,`${id}/${s.name}#${j}: reason not translated`);});});
  en.reference.blocks[0].networks.forEach((n,i)=>{assert.ok(n.title.trim());assert.ok(!TURKISH_ONLY.test(n.title),`${id}: ${n.title}`);assert.notEqual(n.title,tr.reference.blocks[0].networks[i].title,`${id}: network title not translated: ${n.title}`);});
 }
});

test('evaluate() messages and feedback differ between en and tr and are never empty',()=>{
 const en=evaluate(broken('en'),3,0,0,'en'),tr=evaluate(broken('tr'),3,0,0,'tr');
 for(const r of[en,tr]){assert.equal(r.passed,false);for(const key of ['what','why','impact','question'] as const)assert.ok(r.feedback[key].trim().length>0,key);}
 for(const key of ['what','why','impact','question'] as const)assert.notEqual(en.feedback[key],tr.feedback[key],key);
 const a=en.results.find(x=>x.name==='Seal-in'&&!x.pass),b=tr.results.find(x=>x.name==='Seal-in'&&!x.pass);assert.ok(a&&b,'stable test key in both languages');
 assert.notEqual(a.message,b.message);assert.notEqual(a.title,b.title);assert.equal(a.title,'Seal-in');assert.equal(b.title,'Mühürleme');
 assert.equal(a.at,b.at);assert.equal(a.tag,b.tag);assert.equal(a.expected,b.expected);assert.equal(a.actual,b.actual);
 assert.equal(en.score,tr.score);assert.deepEqual(en.scores,tr.scores);
 assert.match(en.feedback.why,/expected/);assert.match(tr.feedback.why,/beklenen/);assert.ok(!TURKISH_ONLY.test(JSON.stringify(en.feedback)),'English feedback contains Turkish letters');
 const passEn=evaluate(material(3,0,'en').reference,3,0,0,'en'),passTr=evaluate(material(3,0,'tr').reference,3,0,0,'tr');
 for(const r of[passEn,passTr]){assert.equal(r.passed,true);assert.ok(r.results.every(x=>x.pass&&x.message.trim()));for(const key of ['what','why','impact','question'] as const)assert.ok(r.feedback[key].trim());}
 for(const key of ['what','why','impact','question'] as const)assert.notEqual(passEn.feedback[key],passTr.feedback[key],`pass ${key}`);
 assert.notEqual(passEn.results[0].message,passTr.results[0].message);
});

test('Safety failures use the safety impact text and language defaults to English',()=>{
 const p=material(3,0).reference;const n=p.blocks[0].networks[0];if('children'in n.logic)n.logic.children[0]={id:'broken',type:'NO',tag:'STOP'};
 for(const lang of LANGS){const r=evaluate(p,3,0,0,lang),first=r.results.find(x=>!x.pass)!;const t=serverDict[lang];assert.equal(r.feedback.impact,first.category==='safety'?t.impactSafety:t.impactProcess);}
 assert.deepEqual(evaluate(p,3,0),evaluate(p,3,0,0,'en'));
});

test('Compile/runtime failures are reported in the requested language',()=>{
 const p=material(3,0).reference;p.blocks[0].networks[0].output.tag='MISSING';
 const en=evaluate(p,3,0,0,'en'),tr=evaluate(p,3,0,0,'tr');
 assert.equal(en.passed,false);assert.ok(en.diagnostics.length>0&&tr.diagnostics.length===en.diagnostics.length);
 assert.notEqual(en.diagnostics[0].message,tr.diagnostics[0].message);assert.equal(en.diagnostics[0].code,tr.diagnostics[0].code);
 const a=en.results[0],b=tr.results[0];assert.equal(a.pass,false);assert.ok(a.message.trim()&&b.message.trim());assert.notEqual(a.message,b.message);
 assert.ok(!/^Error:/.test(a.message));
 assert.ok(en.feedback.why.trim()&&tr.feedback.why.trim()&&en.feedback.why!==tr.feedback.why);
 assert.ok(!TURKISH_ONLY.test(en.feedback.what+en.feedback.why+a.message),'English error text contains Turkish letters');
});

test('Solution texts and reference network titles are localized',()=>{
 for(const id of[3,12,21,27]){
  const en=solutionText(validated(id,0,'en'),'en'),tr=solutionText(validated(id,0,'tr'),'tr');
  assert.equal(en.explanations.length,tr.explanations.length);assert.ok(en.explanations.length>0);
  en.explanations.forEach((x,i)=>{assert.ok(x.startsWith(`${i+1}. `));assert.notEqual(x,tr.explanations[i]);assert.ok(!TURKISH_ONLY.test(x),x);});
  for(const key of['scan','why','common'] as const){assert.ok(en[key].trim()&&tr[key].trim());assert.notEqual(en[key],tr[key],key);assert.ok(!TURKISH_ONLY.test(en[key]),en[key]);}
  assert.equal(en.common,challenge(id,0,'en').hints[1]);assert.equal(tr.common,challenge(id,0,'tr').hints[1]);
  assert.ok(en.explanations[0].includes(validated(id,0,'en').reference.blocks[0].networks[0].title));
 }
});

test('The I/O contract error is localized and names the tag',()=>{
 for(const lang of LANGS){const m=validated(3,0,lang),p=structuredClone(m.reference);assertContract(p,m,lang);p.tags[0].address='%I9.0';
  assert.throws(()=>assertContract(p,m,lang),(e:Error)=>e.message.includes(p.tags[0].name)&&e.message===serverDict[lang].errContract.replace('{name}',p.tags[0].name));
  const q=structuredClone(m.reference);q.tags=q.tags.slice(1);assert.throws(()=>assertContract(q,m,lang),/START|STOP|MOTOR|OVERLOAD/);}
 assert.notEqual(serverDict.en.errContract,serverDict.tr.errContract);
});

test('Server dictionary: both languages are complete and use the same placeholders',()=>{
 const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
 for(const key of Object.keys(serverDict.en) as (keyof typeof serverDict.en)[]){assert.ok(serverDict.en[key].trim()&&serverDict.tr[key].trim(),key);assert.equal(placeholders(serverDict.en[key]),placeholders(serverDict.tr[key]),key);assert.notEqual(serverDict.en[key],serverDict.tr[key],key);assert.ok(!TURKISH_ONLY.test(serverDict.en[key]),key);}
});

test('Public challenge follows the language, keeps concept ids stable and never carries the reference',()=>{
 for(const id of ids)for(const lang of LANGS){const pub=validated(id,0,lang).public;assert.deepEqual(pub,challenge(id,0,lang));assert.deepEqual(pub.concepts,challenge(id,0,'en').concepts,'concept ids are language-independent');assert.equal('reference'in pub,false);assert.equal('suites'in pub,false);}
 assert.notEqual(validated(3,0,'en'),validated(3,0,'tr'));assert.equal(validated(3,0,'tr'),validated(3,0,'tr'));
 assert.notEqual(validated(3,0,'en').public.scenario,validated(3,0,'tr').public.scenario);
});

test('Invalid challenge or seed is rejected in the requested language',()=>{
 for(const [id,seed] of [[0,0],[999,0],[3.5,0],[3,-1],[3,1e7],[NaN,0],[3,NaN]]){
  const en=(()=>{try{validated(id,seed,'en');}catch(e){return (e as Error).message;}return '';})(),tr=(()=>{try{validated(id,seed,'tr');}catch(e){return (e as Error).message;}return '';})();
  assert.equal(en,serverDict.en.errChallenge,`${id}/${seed}`);assert.equal(tr,serverDict.tr.errChallenge,`${id}/${seed}`);
 }
});
