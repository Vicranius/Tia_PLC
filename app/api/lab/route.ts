import {env} from 'cloudflare:workers';
import {validated,evaluate,assertContract,solutionText} from '@/src/challenges/evaluator';
import {parseProgram} from '@/src/plc/compiler';
import {catalogFor} from '@/src/challenges/catalog';
import {isLang,langOf,translator,type Lang} from '@/src/i18n/core';
import {serverDict} from '@/src/i18n/dict/server';
const db=()=> (env as unknown as {DB:D1Database}).DB;
function owner(request:Request){const value=/plc_session=([a-f0-9-]{36})(?:;|$)/.exec(request.headers.get('cookie')??'')?.[1];return value??crypto.randomUUID();}
function reply(data:unknown,id:string,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','Set-Cookie':`plc_session=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${process.env.NODE_ENV==='production'?'; Secure':''}`}});}
// Language: GET `?lang=en|tr`, POST body `lang` (the query string is a fallback for errors raised before the body is read).
// Anything else is English. Every user-visible string in a response is in that language.
export async function GET(request:Request){const session=owner(request);const url=new URL(request.url),lang=langOf(url.searchParams.get('lang'));try{const action=url.searchParams.get('action');if(action==='profile'){const rows=await db().prepare('SELECT challenge,seed,score,passed,concepts,created FROM attempts WHERE owner = ? ORDER BY created DESC LIMIT 100').bind(session).all();return reply({attempts:rows.results},session);}if(action==='restore'){const row=await db().prepare('SELECT payload,updated FROM projects WHERE owner = ?').bind(session).first<{payload:string;updated:number}>();return reply(row?{project:JSON.parse(row.payload),updated:row.updated}:{project:null},session);}const id=Number(url.searchParams.get('id')??3),seed=Number(url.searchParams.get('seed')??0);return reply({challenge:validated(id,seed,lang).public,catalog:catalogFor(lang),lang},session);}catch(e){return reply({error:e instanceof Error?e.message:String(e)},session,400);}}
export async function POST(request:Request){const session=owner(request);let lang:Lang=langOf(new URL(request.url).searchParams.get('lang'));try{
 const t=()=>translator(serverDict,lang);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:t()('errOrigin')},session,403);
 const text=await request.text();if(text.length>250000)return reply({error:t()('errSize')},session,413);let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error(t()('errBody'));}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error(t()('errBody'));const body=parsed as Record<string,unknown>;if(isLang(body.lang))lang=body.lang;const id=Number(body.id),seed=Number(body.seed);const m=validated(id,seed,lang);
 if(body.action==='solution'||body.action==='next'){const index=Number(body.index??0);if(!Number.isInteger(index)||index<0||index>100)throw Error(t()('errIndex'));const networks=m.reference.blocks[0].networks;return reply({program:body.action==='solution'?m.reference:undefined,network:body.action==='next'?networks[index]??null:undefined,...solutionText(m,lang),lang},session);}
 const program=parseProgram(body.program,lang);
 if(body.action==='save'){await db().prepare('INSERT INTO projects (owner,payload,updated) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(session,JSON.stringify({id,seed,program}),Date.now()).run();return reply({saved:true},session);}
 if(body.action!=='check')throw Error(t()('errAction'));
 assertContract(program,m,lang);
 const hintCount=Number(body.hints??0);if(!Number.isInteger(hintCount)||hintCount<0||hintCount>100)throw Error(t()('errHints'));
 // `replay` re-evaluates an earlier check in another language (language switch) without recording a new attempt.
 const result=evaluate(program,id,seed,hintCount,lang);if(body.replay!==true)await db().prepare('INSERT INTO attempts (id,owner,challenge,seed,score,passed,concepts,created) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),session,id,seed,result.score,result.passed?1:0,JSON.stringify(m.public.concepts),Date.now()).run();return reply({...result,lang},session);
 }catch(e){return reply({error:e instanceof Error?e.message:String(e)},session,400);}}
