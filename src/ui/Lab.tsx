'use client';
import {Fragment,useEffect,useRef,useState,type ReactNode} from 'react';
import {ChevronDown,ChevronUp,Glasses,ListPlus,Maximize2,Minimize2,Minus,X} from 'lucide-react';
import {useLab} from './useLab';
import {Choice} from './Choice';
import Instructions from './Instructions';
import ProjectTree,{type EditorId} from './ProjectTree';
import Process from './Process';
import {Tags} from './Tags';
import {Learning} from './Learning';
import Editor from '../ladder/Editor';
import ResizableWorkspace from './ResizableWorkspace';
import ExercisePanel from './ExercisePanel';
import PortalView,{type ProjectTarget} from './PortalView';
import TopBar from './shell/TopBar';
import Inspector,{type InspectorTab} from './shell/Inspector';
import EditorBar from './shell/EditorBar';
import {TaskCardPane,TaskCardTabs,NotAvailable,type CardId} from './shell/TaskCards';
import {LibrariesCard,TasksCard,TestingCard} from './shell/Cards';
import {BlockProperties,CompileList,DeviceInformation,Instructor,MessageLog,ScanWhy,TestResults,type LogEntry} from './shell/InspectorPanes';
import {BlockIcon,DeviceConfigIcon,ExerciseIcon,OnlineDiagIcon,ScreenIcon,TagTableIcon,WatchTableIcon} from './shell/TiaIcons';
import {LANGS,LANG_NAMES} from '../i18n/core';
import {useLang,useT} from '../i18n/react';
import {shellDict} from '../i18n/dict/shell';
import {catalogFor} from '../challenges/catalog';
import {compile,parseProgram} from '../plc/compiler';
import {blankNetwork} from '../plc/model';

const PROJECT='PLC_Lab_Project';
const blockName=(id:string)=>id==='OB1'?'Main':id==='OB100'?'Startup':id;
// Status kind for the TIA message list; "errors: 0" / "hata: 0" in a compile summary is not an error.
const isError=(text:string)=>/failed|could not|cannot|canceled|invalid|başarısız|başlatılamadı|okunamadı|iptal|geçersiz/i.test(text)||/\b[1-9]\d* (compile )?(error|derleme hatası)|\((errors|hata): [1-9]/i.test(text);

export default function Lab(){
 const lab=useLab(),{lang,setLang}=useLang(),t=useT(shellDict);const {c,program,snapshot,plant,mode,cycle,monitor,busy,result,hints,solution}=lab;
 const [portalView,setPortalView]=useState(true),[editors,setEditors]=useState<EditorId[]>(['ladder:OB1']),[active,setActive]=useState<EditorId>('ladder:OB1'),[online,setOnline]=useState(false);
 const [treeOpen,setTreeOpen]=useState(true),[cardsOpen,setCardsOpen]=useState(true),[card,setCard]=useState<CardId>('instructions');
 const [inspectorOpen,setInspectorOpen]=useState(true),[inspectorTab,setInspectorTab]=useState<InspectorTab>('properties'),[inspectorSub,setInspectorSub]=useState('general');
 const [why,setWhy]=useState(''),[maximized,setMaximized]=useState(false),[zoom,setZoom]=useState(100),[iface,setIface]=useState(false),[errorIndex,setErrorIndex]=useState(-1);
 const [inspectorTarget,setInspectorTarget]=useState<HTMLDivElement|null>(null),[command,setCommand]=useState<{kind:string;nonce:number}>(),[log,setLog]=useState<LogEntry[]>([]);
 const file=useRef<HTMLInputElement>(null),live=useRef(lab);live.current=lab;
 const view=active.startsWith('ladder:')?'ladder':active,block=active.startsWith('ladder:')?active.slice(7):'OB1',currentBlock=program.blocks.find(b=>b.id===block)??program.blocks[0];
 const diagnostics=compile(program,lang),errors=diagnostics.filter(d=>d.severity==='error').length,locked=mode==='RUN'||busy,running=mode==='RUN';
 const values=snapshot?.values??Object.fromEntries(program.tags.map(x=>[x.name,x.initial]));
 const exerciseTitle=catalogFor(lang).find(x=>x.id===c.id)?.title??c.title;

 // Every status message also lands in Info › General, like the TIA message list.
 useEffect(()=>{if(lab.message)setLog(l=>[...l.slice(-99),{time:new Date().toLocaleTimeString(lang),text:lab.message,kind:isError(lab.message)?'error':'ok'}]);},[lab.message]);// eslint-disable-line react-hooks/exhaustive-deps

 const open=(id:EditorId)=>{setEditors(e=>e.includes(id)?e:[...e,id]);setActive(id);setPortalView(false);};
 const closeEditor=()=>{const rest=editors.filter(x=>x!==active);setEditors(rest);setActive(rest[rest.length-1]??'overview');};
 const inspect=(tab:InspectorTab,sub:string)=>{setMaximized(false);setInspectorOpen(true);setInspectorTab(tab);setInspectorSub(sub);};
 const commitBlock=(networks:typeof currentBlock.networks)=>lab.commit({...program,blocks:program.blocks.map(b=>b.id===block?{...b,networks}:b)});
 const addNetwork=()=>{if(view!=='ladder')open(`ladder:${block}` as EditorId);commitBlock([...currentBlock.networks,blankNetwork()]);};
 const insertInstruction=(kind:string)=>{if(kind==='NETWORK'){addNetwork();return;}if(view!=='ladder')open(`ladder:${block}` as EditorId);setCommand({kind,nonce:Date.now()});};
 const focusDiagnostic=(id?:string)=>{if(!id)return;const b=program.blocks.find(x=>x.networks.some(n=>n.id===id));if(b)open(`ladder:${b.id}` as EditorId);setTimeout(()=>document.getElementById(`network-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'}),50);};
 const stepError=(dir:1|-1)=>{const list=diagnostics.filter(d=>d.network);if(!list.length)return;const next=(errorIndex+dir+list.length)%list.length;setErrorIndex(next);focusDiagnostic(list[next].network);inspect('info','compile');};
 const showWhy=(id:string)=>{setWhy(id);inspect('info','scan');};
 const switchChallenge=(id:number,seed=0,debug=false)=>{open('ladder:OB1');setWhy('');void lab.loadChallenge(id,seed,debug);};
 const openProject=(target?:ProjectTarget)=>{if(target){const id=(target.view==='ladder'?`ladder:${target.block??'OB1'}`:target.view) as EditorId;open(id);if(target.monitor){setOnline(true);lab.setMonitor(true);}}setPortalView(false);};
 const compileNow=()=>{inspect('info','compile');lab.setMessage(t('info.compileSummary',{e:errors,w:diagnostics.length-errors}));};
 const download=()=>{if(errors){inspect('info','compile');lab.setMessage(t('msg.downloadBlocked'));return;}lab.send({action:'load',program,plant:c.plant});lab.setMessage(t('msg.downloadOk'));};
 const goOnline=()=>{setOnline(true);lab.setMonitor(true);lab.setMessage(t('msg.online'));};
 const goOffline=()=>{setOnline(false);lab.setMessage(t('msg.offline'));};
 const showCard=(id:CardId)=>{setCard(id);setCardsOpen(true);setMaximized(false);};
 const exportProgram=()=>{const blob=new Blob([JSON.stringify(program,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`plc-lab-${c.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const search=(q:string)=>{const needle=q.toLowerCase(),tag=program.tags.find(x=>x.name.toLowerCase().includes(needle)||x.address.toLowerCase()===needle);if(tag){open('tags');lab.setMessage(t('msg.searchTag',{name:tag.name}));return;}for(const b of program.blocks){const i=b.networks.findIndex(n=>`${n.title} ${n.comment??''} ${JSON.stringify(n.logic)} ${n.output.tag}`.toLowerCase().includes(needle));if(i>=0){focusDiagnostic(b.networks[i].id);lab.setMessage(t('msg.searchNetwork',{q,block:`${blockName(b.id)} [${b.id}]`,n:i+1}));return;}}lab.setMessage(t('msg.searchNone',{q}));};
 const toggleMonitoring=()=>{if(!online){lab.setMessage(t('editor.monitoringOffline'));return;}lab.setMonitor(!monitor);};
 useEffect(()=>{const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;if(!context)return;const controller=new AbortController();void Promise.resolve(context.registerTool({name:'inspect_ladder_program',title:'Inspect LAD program',description:'Read the current LAD AST, compile diagnostics and the last scan state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input:unknown){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('Expected an empty object');const l=live.current;return {program:l.program,diagnostics:compile(l.program),mode:l.mode,snapshot:l.snapshot};}},{signal:controller.signal})).catch(()=>{});return()=>controller.abort();},[]);

 const menus=[
  {name:t('menu.project'),items:[{label:t('menu.new'),run:()=>setPortalView(true),disabled:locked},{label:t('menu.open'),run:()=>setPortalView(true)},{label:t('menu.save'),run:()=>void lab.save(),disabled:busy},{label:t('menu.export'),run:exportProgram},{label:t('menu.import'),run:()=>file.current?.click(),disabled:locked},{label:t('menu.close'),run:()=>setPortalView(true)}]},
  {name:t('menu.edit'),items:[{label:t('toolbar.undo'),run:lab.undo,disabled:locked||!lab.history.length},{label:t('toolbar.redo'),run:lab.redoAction,disabled:locked||!lab.redo.length}]},
  {name:t('menu.view'),items:[{label:t('menu.portalView'),run:()=>setPortalView(true)},{label:t('menu.projectTree'),run:()=>setTreeOpen(v=>!v)},{label:t('menu.taskCards'),run:()=>setCardsOpen(v=>!v)},{label:t('menu.inspector'),run:()=>setInspectorOpen(v=>!v)},{label:t('menu.overview'),run:()=>open('overview')},{label:t('menu.maximize'),run:()=>setMaximized(v=>!v)}]},
  {name:t('menu.insert'),items:[{label:t('menu.network'),run:addNetwork,disabled:locked},...['NO','NC','COIL','SET','RESET','TON','TOF','TP','CTU','CTD','CTUD'].map(kind=>({label:kind,run:()=>insertInstruction(kind),disabled:locked}))]},
  {name:t('menu.online'),items:[{label:t('toolbar.goOnline'),run:goOnline,disabled:online},{label:t('toolbar.goOffline'),run:goOffline,disabled:!online},{label:t('toolbar.download'),run:download,disabled:busy||running},{label:t('toolbar.simulation'),run:()=>showCard('testing')},{label:t('toolbar.accessible'),run:()=>open('diagnostics')},{label:t('toolbar.startCpu'),run:()=>lab.run(),disabled:busy||running},{label:t('toolbar.stopCpu'),run:()=>lab.send({action:'stop'}),disabled:!running},{label:t('menu.singleScan'),run:()=>{lab.run('step');inspect('info','scan');},disabled:busy},{label:t('menu.monitoring'),run:toggleMonitoring}]},
  {name:t('menu.options'),items:LANGS.map(l=>({label:`${lang===l?'✓':' '} ${t('menu.languageHeader')} ${LANG_NAMES[l]}`,run:()=>setLang(l)}))},
  {name:t('menu.tools'),items:[{label:t('toolbar.compile'),run:compileNow},{label:t('menu.check'),run:()=>{inspect('info','tests');void lab.check();}},{label:t('menu.learning'),run:()=>open('learning')}]},
  {name:t('menu.window'),items:[{label:t('menu.closeAll'),run:()=>{setEditors([]);setActive('overview');}},{label:t('menu.maximize'),run:()=>setMaximized(v=>!v)}]},
  {name:t('menu.help'),items:[{label:t('menu.showHelp'),run:()=>setPortalView(true)},{label:t('menu.activeTask'),run:()=>showCard('tasks')},{label:t('menu.instructor'),run:()=>inspect('info','instructor')}]},
 ];
 const editorMeta=(id:EditorId):{label:string;icon:ReactNode;path:string[]}=>{const plc=`PLC_1 [${program.cpu}]`;if(id.startsWith('ladder:')){const b=id.slice(7);return {label:`${blockName(b)} [${b}]`,icon:<BlockIcon kind="OB"/>,path:[plc,t('tree.programBlocks'),`${blockName(b)} [${b}]`]};}
  switch(id){case 'tags':return {label:t('view.tags'),icon:<TagTableIcon/>,path:[plc,t('tree.plcTags'),`${t('tree.defaultTagTable')} [${program.tags.length}]`]};case 'watch':return {label:t('view.watch'),icon:<WatchTableIcon/>,path:[plc,t('tree.watchTables'),t('view.watch')]};case 'process':return {label:t('view.process'),icon:<ScreenIcon/>,path:[`HMI_1 [${t('tree.processScreens')}]`,t('tree.screens'),t('view.process')]};case 'device':return {label:t('view.device'),icon:<DeviceConfigIcon/>,path:[plc,t('view.device')]};case 'diagnostics':return {label:t('view.diagnostics'),icon:<OnlineDiagIcon/>,path:[plc,t('view.diagnostics')]};case 'learning':return {label:t('view.learning'),icon:<ExerciseIcon/>,path:[t('view.learning')]};default:return {label:t('view.overview'),icon:<TagTableIcon/>,path:[t('view.overview')]};}};
 const meta=editorMeta(active);
 const ifaceRows=block==='OB100'?[['LostRetentive','Bool','iface.lostRetentive'],['LostRTC','Bool','iface.lostRtc']] as const:[['Initial_Call','Bool','iface.initialCall'],['Remanence','Bool','iface.remanence']] as const;

 const workarea=()=>{switch(view){
  case 'ladder':return <>
   <div className="tia-editor-toolbar" role="toolbar" aria-label={t('editor.toolbar')}><button title={t('editor.insertNetwork')} aria-label={t('editor.insertNetwork')} disabled={locked} onClick={addNetwork}><ListPlus size={16} color="#2f6ea8"/></button><i/><button title={t('editor.prevError')} aria-label={t('editor.prevError')} disabled={!diagnostics.some(d=>d.network)} onClick={()=>stepError(-1)}><ChevronUp size={16} color="#c0392b"/></button><button title={t('editor.nextError')} aria-label={t('editor.nextError')} disabled={!diagnostics.some(d=>d.network)} onClick={()=>stepError(1)}><ChevronDown size={16} color="#c0392b"/></button><i/><span className="tia-grow"/><button className={online&&monitor?'pressed':''} title={online?t('editor.monitoring'):t('editor.monitoringOffline')} aria-label={t('editor.monitoring')} aria-pressed={online&&monitor} onClick={toggleMonitoring}><Glasses size={17} color={online?'#e8730c':'#6b7680'}/></button></div>
   <button className={`tia-iface-strip${iface?' open':''}`} aria-expanded={iface} onClick={()=>setIface(v=>!v)}>{t('editor.interface')}<span>{iface?'▴':'▾'}</span></button>
   {iface&&<div className="tia-iface"><table className="tia-grid"><thead><tr><th/><th>{t('iface.name')}</th><th>{t('iface.dataType')}</th><th>{t('iface.default')}</th><th>{t('iface.comment')}</th></tr></thead><tbody><tr className="section"><td>▾</td><td colSpan={4}>Input</td></tr>{ifaceRows.map(([n,ty,k])=><tr key={n}><td/><td>{n}</td><td>{ty}</td><td/><td>{t(k)}</td></tr>)}{['Temp','Constant'].map(s=><Fragment key={s}><tr className="section"><td>▾</td><td colSpan={4}>{s}</td></tr><tr className="add"><td/><td colSpan={4}>{t('iface.addNew')}</td></tr></Fragment>)}</tbody></table></div>}
   <div className="tia-editor-scroll"><Editor inspectorTarget={inspectorTarget} onInspect={()=>{if(inspectorTab!=='properties'||!inspectorOpen)inspect('properties','general');}} blockName={block==='OB1'?t('block.mainTitle'):t('block.startupTitle')} zoom={zoom} onCommandDone={()=>setCommand(undefined)} command={command} networks={currentBlock.networks} tags={program.tags} trace={snapshot?.trace??{}} monitor={online&&monitor} locked={locked} onWhy={showWhy} onChange={commitBlock}/></div>
   <div className="tia-zoom"><Choice label={t('editor.zoom')} value={String(zoom)} options={['50','75','100','125','150','200'].map(v=>({value:v,label:`${v}%`}))} onChange={v=>setZoom(Number(v))}/><input type="range" min={50} max={200} step={5} value={zoom} aria-label={t('editor.zoom')} onChange={e=>setZoom(Number(e.target.value))}/></div>
  </>;
  case 'tags':return <Tags tags={program.tags} values={values} forces={snapshot?.forces??{}} onChange={tags=>lab.commit({...program,tags})} onInput={lab.input} onForce={(tag,value)=>lab.send({action:'force',tag,value})} watch={false} locked={locked}/>;
  case 'watch':return <Tags tags={program.tags} values={values} forces={snapshot?.forces??{}} onChange={()=>{}} onInput={lab.input} onForce={(tag,value)=>lab.send({action:'force',tag,value})} watch/>;
  case 'learning':return <Learning attempts={lab.attempts} load={switchChallenge}/>;
  case 'process':return <div className="process-workarea"><div className="process-workbar"><b>HMI_1 · {t('tree.screens')}</b><Choice label={t('editor.processSelect')} disabled={locked} value={String(c.id)} options={catalogFor(lang).map(x=>({value:String(x.id),label:x.title}))} onChange={id=>switchChallenge(Number(id))}/><button onClick={()=>open('ladder:OB1')}>Main [OB1]</button><button disabled={locked} onClick={()=>void lab.reveal()}>{t('editor.loadReference')}</button></div><div className="process-brief"><b>{exerciseTitle}</b><p>{c.scenario}</p><details><summary>{t('editor.taskSequence')}</summary><ol>{c.objectives.map(x=><li key={x}>{x}</li>)}</ol></details><p>{t('editor.processNote')}</p></div><Process plant={plant} c={{...c,tags:program.tags}} values={values} inputs={snapshot?.inputs??{}} onInput={lab.input} send={lab.send}/></div>;
  case 'device':return <div className="device-view"><h1>{program.cpu}</h1><p>{t('device.profile')}</p><Choice label={t('device.model')} disabled={locked} value={program.cpu} options={['1211C','1212C','1214C','1215C','1217C'].map(v=>`CPU ${v} DC/DC/DC`)} onChange={cpu=>lab.commit({...program,cpu})}/><p>{t('device.note')}</p><dl><dt>{t('device.image')}</dt><dd>{t('device.imageV')}</dd><dt>{t('device.scan')}</dt><dd>{t('device.scanV')}</dd><dt>{t('device.analog')}</dt><dd>{t('device.analogV')}</dd><dt>{t('device.lang')}</dt><dd>{t('device.langV')}</dd></dl><div className="note">{t('device.download')}</div></div>;
  case 'diagnostics':return <DeviceInformation mode={mode} snapshot={snapshot} cycle={cycle} diagnostics={diagnostics} onFocus={focusDiagnostic}/>;
  default:return <div className="tia-overview"><table className="tia-grid"><thead><tr><th>{t('overview.object')}</th><th>{t('overview.type')}</th></tr></thead><tbody>{[...program.blocks.map(b=>[`ladder:${b.id}`,`${blockName(b.id)} [${b.id}]`,t('overview.block')]),['tags',`${t('tree.defaultTagTable')} [${program.tags.length}]`,t('overview.tagTable')],['watch',t('view.watch'),t('overview.watchTable')],['process',t('view.process'),t('overview.screen')],['device',`PLC_1 [${program.cpu}]`,t('overview.device')]].map(([id,name,type])=><tr key={id} onDoubleClick={()=>open(id as EditorId)}><td>{editorMeta(id as EditorId).icon} {name}</td><td>{type}</td></tr>)}</tbody></table><p className="tia-muted">{t('overview.hint')}</p></div>;
 }};
 const cardContent:Record<CardId,ReactNode>={
  instructions:<Instructions insert={insertInstruction} disabled={locked} onProblem={()=>showCard('tasks')}/>,
  testing:<TestingCard mode={mode} scans={snapshot?.scans??0} time={snapshot?.time??0} forces={Object.keys(snapshot?.forces??{}).length} errors={errors} busy={busy} speed={lab.speed} onRun={()=>lab.run()} onStop={()=>lab.send({action:'stop'})} onMres={()=>{lab.send({action:'load',program,plant:c.plant});lab.setMessage(t('testing.mresDone'));}} onPause={()=>lab.send({action:'pause'})} onStep={()=>{lab.run('step');inspect('info','scan');}} onSpeed={speed=>{lab.setSpeed(speed);lab.send({action:'speed',speed:Number(speed)});}} process={<Process plant={plant} c={{...c,tags:program.tags}} values={values} inputs={snapshot?.inputs??{}} onInput={lab.input} send={lab.send}/>}/>,
  tasks:<TasksCard c={c} locked={locked} busy={busy} onChoose={id=>switchChallenge(id)} onVariant={()=>switchChallenge(c.id,Math.floor(Math.random()*999999))} onDebug={()=>switchChallenge(3,0,true)} onCheck={()=>{inspect('info','tests');void lab.check();}} onLearning={()=>open('learning')} onInstructor={()=>inspect('info','instructor')} exercise={<ExercisePanel key={c.id} challenge={c} locked={locked} reset={lab.resetExercise} run={()=>lab.run()} test={()=>{inspect('info','tests');void lab.check();}} exercises={()=>open('learning')}/>}/>,
  libraries:<LibrariesCard/>,
  addins:<NotAvailable text={t('card.notAvailable')}/>,
 };
 const inspectorTitle=view==='ladder'?`${blockName(block)} [${block}]`:meta.label;
 const subs={
  properties:[{id:'general',label:t('sub.general'),keepMounted:true,content:<><div ref={setInspectorTarget} className="properties-host"/>{view==='ladder'?<BlockProperties block={currentBlock} name={blockName(block)}/>:<p className="tia-muted">{t('props.selectElement')}</p>}</>},{id:'texts',label:t('sub.texts'),content:<p className="tia-muted">{t('props.textsNa')}</p>}],
  info:[{id:'general',label:t('sub.general'),content:<MessageLog log={log}/>},{id:'crossref',label:t('sub.crossRef'),content:<p className="tia-muted">{t('info.crossRefNa')}</p>},{id:'compile',label:t('sub.compile'),content:<CompileList diagnostics={diagnostics} onFocus={focusDiagnostic}/>},{id:'tests',label:t('sub.tests'),content:<TestResults result={result} busy={busy} onCheck={()=>void lab.check()} onNext={()=>{const list=catalogFor(lang),next=list.find(x=>x.id!==c.id&&x.concepts.some(k=>c.concepts.includes(k))&&!lab.attempts.some(a=>a.challenge===x.id&&a.passed));switchChallenge(next?.id??(c.id%list.length+1),c.seed+1);}}/>},{id:'instructor',label:t('sub.instructor'),content:<Instructor c={c} result={result} hints={hints} solution={solution} busy={busy} locked={locked} onCheck={()=>{inspect('info','tests');void lab.check();}} onHint={()=>lab.setHints(Math.min(3,hints+1))} onNext={()=>void lab.reveal(true)} onSolution={()=>void lab.reveal()}/>},{id:'scan',label:t('sub.scan'),content:<ScanWhy program={program} snapshot={snapshot} why={why} cycle={cycle} busy={busy} onStep={()=>lab.run('step')}/>}],
  diagnostics:[{id:'device',label:t('sub.deviceInfo'),content:<DeviceInformation mode={mode} snapshot={snapshot} cycle={cycle} diagnostics={diagnostics} onFocus={focusDiagnostic}/>},{id:'monitor',label:t('sub.monitorValues'),content:<Tags tags={program.tags} values={values} forces={snapshot?.forces??{}} onChange={()=>{}} onInput={lab.input} onForce={(tag,value)=>lab.send({action:'force',tag,value})} watch/>}],
 };
 const last=log[log.length-1],status=last?{kind:last.kind,text:last.text}:{kind:'ok' as const,text:t('msg.opened',{project:PROJECT})};

 return <><PortalView visible={portalView} projectName={PROJECT} cpu={program.cpu} blocks={program.blocks} challenge={c} mode={mode} locked={locked} saved={lab.saved} dirty={lab.history.length>0&&!lab.saved} message={lab.message} onOpen={openProject} onCreate={id=>{switchChallenge(id);setPortalView(false);}} onCpu={cpu=>lab.commit({...program,cpu})} onStart={()=>lab.run()} onStop={()=>lab.send({action:'stop'})}/>
 <main className={`tia-shell${online?' online':''}`} style={portalView?{display:'none'}:undefined}>
  <TopBar menus={menus} a={{newProject:()=>setPortalView(true),openProject:()=>setPortalView(true),save:()=>void lab.save(),undo:lab.undo,redo:lab.redoAction,canUndo:!!lab.history.length,canRedo:!!lab.redo.length,compile:compileNow,download,startSimulation:()=>{showCard('testing');lab.setMessage(t('msg.simulation'));},goOnline,goOffline,accessible:()=>open('diagnostics'),startCpu:()=>lab.run(),stopCpu:()=>lab.send({action:'stop'}),search,online,running,busy,locked}}/>
  <input hidden ref={file} type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>250000)throw Error(t('msg.fileTooLarge'));lab.commit(parseProgram(JSON.parse(await f.text()),lang));lab.setMessage(t('msg.imported'));}catch(error){lab.setMessage(error instanceof Error?error.message:String(error));}e.target.value='';}}/>
  <div className="tia-body">
   <div className="tia-left-strip">{!treeOpen&&<button className="tia-vtab" onClick={()=>setTreeOpen(true)}>{t('pane.projectTree')}</button>}<span className="tia-strip-label">{t('pane.strip')}</span></div>
   <ResizableWorkspace maximized={maximized} right={cardsOpen} bottomOpen={inspectorOpen} onOpenBottom={()=>setInspectorOpen(true)} className={`tia-workspace${treeOpen?'':' tree-collapsed'}${cardsOpen?'':' cards-collapsed'}${inspectorOpen?'':' inspector-collapsed'}`}>
    {treeOpen&&<ProjectTree projectName={PROJECT} cpuName={program.cpu} blocks={program.blocks} tags={program.tags} active={active} online={online} onOpen={open} onCollapse={()=>setTreeOpen(false)}/>}
    <section className="tia-workarea" aria-label={meta.label}>
     <div className="tia-pane-title tia-editor-title"><span className="tia-crumbs">{[PROJECT,...meta.path].map((p,i)=><span key={i}>{i>0&&<b aria-hidden="true">▸</b>}{p}</span>)}</span><span className="tia-window-btns"><button disabled aria-label={t('editor.minimize')} title={t('editor.minimize')}><Minus size={13}/></button><button aria-label={maximized?t('editor.restore'):t('editor.maximize')} title={maximized?t('editor.restore'):t('editor.maximize')} onClick={()=>setMaximized(v=>!v)}>{maximized?<Minimize2 size={13}/>:<Maximize2 size={13}/>}</button><button aria-label={t('editor.close')} title={t('editor.close')} disabled={active==='overview'} onClick={closeEditor}><X size={14}/></button></span></div>
     <div className={`tia-workarea-body view-${view}`}>{workarea()}</div>
    </section>
    {cardsOpen&&<TaskCardPane active={card} onClose={()=>setCardsOpen(false)}>{cardContent[card]}</TaskCardPane>}
    <Inspector title={inspectorTitle} tab={inspectorTab} sub={inspectorSub} open={inspectorOpen} badge={errors||undefined} subs={subs} onTab={tab=>{setInspectorOpen(true);setInspectorTab(tab);setInspectorSub(subs[tab][0].id);}} onSub={setInspectorSub} onToggle={()=>setInspectorOpen(v=>!v)}/>
   </ResizableWorkspace>
   <TaskCardTabs active={card} open={cardsOpen} onSelect={id=>{if(cardsOpen&&card===id)setCardsOpen(false);else showCard(id);}}/>
  </div>
  <EditorBar editors={editors.map(id=>({id,label:editorMeta(id).label,icon:editorMeta(id).icon}))} active={active} status={status} onActivate={id=>setActive(id as EditorId)} onPortal={()=>setPortalView(true)} onOverview={()=>open('overview')}/>
 </main></>;
}
