import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalog,catalogFor,challenge,conceptIds,conceptLabel} from '../src/challenges/catalog';
import {curriculum,modules,modulesFor} from '../src/learning/curriculum';
import {Learning} from '../src/ui/Learning';
import ExercisePanel from '../src/ui/ExercisePanel';
import {LanguageProvider} from '../src/i18n/react';
import {LANGS,type Lang} from '../src/i18n/core';

const ids=Array.from({length:27},(_,i)=>i+1);
const seeds=[0,1,2,3,7,998];
const placeholder=/\{\w+\}/;
const filled=(s:string)=>typeof s==='string'&&s.trim().length>0;

test('Catalog holds 27 exercises and every one has complete text in both languages',()=>{
 assert.equal(catalog.length,27);
 for(const id of ids)for(const seed of seeds)for(const lang of LANGS){
  const c=challenge(id,seed,lang),label=`exercise ${id} / seed ${seed} / ${lang}`;
  assert.ok(filled(c.title),`${label}: title`);assert.ok(filled(c.scenario),`${label}: scenario`);
  assert.ok(c.objectives.length>=2&&c.objectives.every(filled),`${label}: objectives`);
  assert.equal(c.hints.length,3,`${label}: hints`);assert.ok(c.hints.every(filled),`${label}: hint text`);
  for(const text of [c.title,c.scenario,...c.objectives,...c.hints,...c.tags.map(t=>t.comment)])assert.ok(!placeholder.test(text),`${label}: unreplaced placeholder in “${text}”`);
  assert.ok(c.tags.every(t=>filled(t.comment)),`${label}: tag comments`);
 }
});

test('English is the default language and differs from Turkish in every text field',()=>{
 for(const id of ids)for(const seed of [0,1]){
  const def=challenge(id,seed),en=challenge(id,seed,'en'),tr=challenge(id,seed,'tr');
  assert.deepEqual(def,en,`exercise ${id}: default is English`);
  assert.notEqual(en.scenario,tr.scenario,`exercise ${id}: scenario`);
  assert.equal(en.objectives.length,tr.objectives.length,`exercise ${id}: objective count`);
  en.objectives.forEach((o,i)=>assert.notEqual(o,tr.objectives[i],`exercise ${id}: objective ${i+1}`));
  en.hints.forEach((h,i)=>assert.notEqual(h,tr.hints[i],`exercise ${id}: hint ${i+1}`));
  en.tags.forEach((t,i)=>assert.notEqual(t.comment,tr.tags[i].comment,`exercise ${id}: tag ${t.name} comment`));
  // The Turkish original is kept verbatim; spot-check the English side is really English, not a copy.
  assert.ok(!/[ğüşıöçĞÜŞİÖÇ]/.test(`${en.title}${en.scenario}${en.objectives.join('')}${en.hints.join('')}${en.tags.map(t=>t.comment).join('')}`.replace(/[°—–→·]/g,'')),`exercise ${id}: Turkish letters in English text`);
 }
});

test('Language never changes the structure of an exercise',()=>{
 for(const id of ids)for(const seed of [0,1,2]){
  const en=challenge(id,seed,'en'),tr=challenge(id,seed,'tr');
  assert.deepEqual({...en,title:'',scenario:'',objectives:[],hints:[],tags:[]},{...tr,title:'',scenario:'',objectives:[],hints:[],tags:[]},`exercise ${id}: id/seed/level/concepts/delay/preset/plant`);
  assert.deepEqual(en.tags.map(({comment,...rest})=>rest),tr.tags.map(({comment,...rest})=>rest),`exercise ${id}: tag names, addresses, types, input modes`);
 }
});

test('{delay} and {preset} are substituted in both languages for every seed',()=>{
 for(const lang of LANGS)for(const seed of seeds){
  const delay=(id:number)=>(id===22?5000:id===23?8000:1000)+(seed%3)*500;
  assert.equal(challenge(7,seed,lang).delay,delay(7));
  assert.ok(challenge(7,seed,lang).objectives[0].includes(`${delay(7)} ms`),`TON ${lang} seed ${seed}`);
  assert.ok(challenge(10,seed,lang).objectives[1].includes(String(3+(seed%4))),`counter preset ${lang} seed ${seed}`);
  assert.equal(challenge(13,seed,lang).objectives[1].split(`${delay(13)} ms`).length-1,lang==='tr'?3:1,`traffic lights: every {delay} is replaced (${lang})`);
  assert.ok(challenge(22,seed,lang).objectives.some(o=>o.includes(`${delay(22)} ms`)),`paint mixer ${lang}`);
  assert.ok(challenge(23,seed,lang).objectives.some(o=>o.includes(`${delay(23)} ms`)),`roaster ${lang}`);
 }
});

test('Invalid challenge or seed is rejected',()=>{
 for(const [id,seed] of [[0,0],[28,0],[1.5,0],[1,-1],[1,1000000],[1,0.5]] as const)assert.throws(()=>challenge(id,seed),/Invalid challenge or seed/);
});

test('catalogFor localizes titles and keeps ids, levels and concepts stable',()=>{
 const en=catalogFor('en'),tr=catalogFor('tr');
 assert.equal(en.length,27);assert.equal(tr.length,27);
 assert.deepEqual(en,catalog,'catalogFor(en) is the English catalog');
 // “TOF fan” is the same in both languages (TOF is an instruction mnemonic and “fan” is the same word in Turkish).
 const same=new Set(['TOF fan']);
 en.forEach((x,i)=>{
  assert.equal(tr[i].id,x.id);assert.equal(tr[i].level,x.level);assert.deepEqual(tr[i].concepts,x.concepts,`exercise ${x.id}: concept ids are stable`);
  assert.ok(filled(x.title)&&filled(tr[i].title));
  if(!same.has(x.title))assert.notEqual(x.title,tr[i].title,`exercise ${x.id}: title is translated`);
  assert.equal(x.title,challenge(x.id,0,'en').title);assert.equal(tr[i].title,challenge(x.id,0,'tr').title,`exercise ${x.id}: catalog and challenge agree`);
 });
 assert.equal(tr[0].title,'AND kapısı');assert.equal(en[20].title,'Water tank · fill and transfer');assert.equal(tr[20].title,'Su tankı · dolum ve transfer');
 assert.equal(catalogFor('tr'),catalogFor('tr'),'stable identity');
});

test('conceptLabel covers every concept id used by the exercises',()=>{
 const used=[...new Set(catalog.flatMap(c=>c.concepts))];
 assert.deepEqual([...conceptIds].sort(),[...used].sort());
 assert.ok(used.length>=14);
 // These are mnemonics or international terms that read the same in Turkish; every other label must really be translated.
 const sameInTurkish=new Set(['AND','OR','Analog']);
 for(const id of used){
  assert.equal(conceptLabel(id,'en'),id,`${id}: English label is the id`);
  const tr=conceptLabel(id,'tr');assert.ok(filled(tr));
  if(!sameInTurkish.has(id))assert.notEqual(tr,id,`${id}: Turkish label`);
 }
 assert.equal(conceptLabel('Seal-in','tr'),'Mühürleme');assert.equal(conceptLabel('Interlocks','tr'),'Kilitlemeler');assert.equal(conceptLabel('Timers','tr'),'Zamanlayıcılar');
 assert.equal(conceptLabel('Something-new','tr'),'Something-new');assert.equal(conceptLabel('Something-new','en'),'Something-new');
});

test('Curriculum modules are bilingual and open valid exercises',()=>{
 const en=modulesFor('en'),tr=modulesFor('tr');
 assert.equal(curriculum.length,17);assert.equal(en.length,17);assert.equal(tr.length,17);
 en.forEach((m,i)=>{
  assert.ok(filled(m.title)&&filled(m.body)&&filled(tr[i].title)&&filled(tr[i].body),`module ${i+1}`);
  assert.equal(m.exercise,tr[i].exercise);assert.ok(m.exercise>=1&&m.exercise<=27,`module ${i+1}: exercise exists`);
  assert.notEqual(m.body,tr[i].body,`module ${i+1}: body is translated`);
  if(m.title!=='FB / FC / DB')assert.notEqual(m.title,tr[i].title,`module ${i+1}: title is translated`);
  assert.ok(!placeholder.test(m.body)&&!placeholder.test(tr[i].body));
 });
 assert.deepEqual(modules.map(m=>m[0]),en.map(m=>m.title),'`modules` stays the English list');
 assert.equal(modulesFor('tr'),modulesFor('tr'),'stable identity');
});

function render<P extends object>(lang:Lang,component:(props:P)=>ReactNode,props:P){return renderToStaticMarkup(createElement(LanguageProvider,{initial:lang,explicit:true,children:createElement(component,props)}));}
test('Learning view renders in the interface language',()=>{
 const attempts=[{challenge:3,seed:0,score:80,passed:1,concepts:JSON.stringify(['Seal-in','Interlocks']),created:1}];
 const en=render('en',Learning,{attempts,load:()=>{}}),tr=render('tr',Learning,{attempts,load:()=>{}});
 assert.ok(en.includes('Learning path')&&en.includes('Theory → guided exercise'));
 assert.ok(en.includes('Water tank · fill and transfer')&&en.includes('Open the ladder exercise →'));
 assert.ok(en.includes('<span>Seal-in</span><b>80%</b>')&&en.includes('1 attempt<')&&en.includes('0 attempts<'));
 assert.ok(en.includes('MODULE 1')&&en.includes('The PLC and the Scan Cycle')&&en.includes('Open guided exercise'));
 assert.ok(tr.includes('Öğrenme yolu')&&tr.includes('Teori → rehberli alıştırma'));
 assert.ok(tr.includes('Su tankı · dolum ve transfer')&&tr.includes('Ladder alıştırmasını aç →'));
 assert.ok(tr.includes('<span>Mühürleme</span><b>80%</b>')&&tr.includes('1 deneme<'));
 assert.ok(tr.includes('MODÜL 1')&&tr.includes('PLC ve Tarama Çevrimi')&&tr.includes('Rehberli alıştırmayı aç')&&tr.includes('Endüstriyel alıştırma'));
 assert.ok(tr.includes('Sıralı kontrol'),'concept chips are localized');
 assert.ok(!/learning\.|exercise\./.test(en+tr),'no raw dictionary keys leak');
});

test('Exercise panel shows the exercise in the interface language',()=>{
 const props=(c:ReturnType<typeof challenge>)=>({challenge:c,run:()=>{},test:()=>{},reset:()=>{},exercises:()=>{},locked:false});
 const c=challenge(7,0),en=render('en',ExercisePanel,props(c)),tr=render('tr',ExercisePanel,props(c));
 assert.ok(en.includes('Exercise 07 — TON motor delay')&&en.includes('Required behavior')&&en.includes('Start Simulation'));
 assert.ok(en.includes('MOTOR runs once START has been continuously TRUE for 1000 ms.'));
 assert.ok(tr.includes('Alıştırma 07 — TON motor gecikmesi')&&tr.includes('Beklenen davranış')&&tr.includes('Simülasyonu başlat'));
 assert.ok(tr.includes('START kesintisiz 1000 ms TRUE olduğunda MOTOR çalışsın.'));
 for(const html of [en,tr])assert.ok(html.includes('<code>%I0.0</code> <strong>START</strong>'),'addresses and tag names are never translated');
 // An exercise delivered in the other language (e.g. loaded before a language switch) is shown in the current one.
 const staleTr=render('en',ExercisePanel,props(challenge(21,2,'tr')));
 assert.ok(staleTr.includes('Water tank · fill and transfer'));
});
