import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile,access} from 'node:fs/promises';

test('Production worker constructor resolves against the website, never a build filesystem URL',async()=>{
 const root='dist/client/_next/static/chunks';
 const files=(await readdir(root)).filter(f=>f.startsWith('Lab-')&&f.endsWith('.js'));
 assert.equal(files.length,1);
 const code=await readFile(`${root}/${files[0]}`,'utf8');
 const constructor=code.match(/new Worker\(new URL\([^)]*\)/)?.[0];
 assert.ok(constructor,'Production worker constructor must be present');
 assert.ok(constructor.includes('window.location.origin'),constructor);
 assert.ok(!constructor.includes('file:'),constructor);
 const asset=code.match(/\/\_next\/static\/worker-[A-Za-z0-9_-]+\.js/)?.[0];
 assert.ok(asset,'Bundler must emit a worker asset URL');
 assert.equal(new URL(asset,'https://plc-lab.example').origin,'https://plc-lab.example');
 await access(`dist/client${asset}`);
});

test('Reference suites remain absent from browser chunks',async()=>{
 const root='dist/client/_next/static/chunks';
 for(const f of (await readdir(root)).filter(f=>f.endsWith('.js'))){
  const code=await readFile(`${root}/${f}`,'utf8');
  assert.ok(!code.includes('Reference validation failed:'),`Private evaluator leaked into ${f}`);
 }
});
