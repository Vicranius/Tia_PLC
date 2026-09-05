import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const api=process.argv.includes('--api');
await mkdir('work',{recursive:true});
const outfile=api?'work/api.test.cjs':'work/runtime.test.cjs';
await build({entryPoints:[api?'tests/api.test.ts':'tests/runtime.test.ts'],bundle:true,platform:'node',format:'cjs',outfile});
const r=spawnSync(process.execPath,['--test',outfile],{stdio:'inherit'});process.exit(r.status??1);
