import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('work',{recursive:true});
const config={name:'plc-lab-local',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]};
await writeFile('work/wrangler.local.json',JSON.stringify(config));
const args=['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','work/wrangler.local.json','--persist-to','.wrangler/state'];
const probe=spawnSync(process.execPath,[...args,'--command',"SELECT name FROM sqlite_master WHERE type='table' AND name='projects'",'--json'],{encoding:'utf8'});
if(probe.status!==0){process.stderr.write(probe.stderr);process.exit(probe.status??1);}
if(probe.stdout.includes('"name": "projects"')){console.log('Local database already exists; no schema changes applied.');process.exit(0);}
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const r=spawnSync(process.execPath,[...args,'--file',`drizzle/${file}`],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
