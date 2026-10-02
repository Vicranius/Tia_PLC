import LadSymbol from './LadSymbol';
import type {SymbolKind} from './geometry';
import {translator,type Lang} from '../i18n/core';
import {editorDict} from '../i18n/dict/editor';
const kinds:Record<string,SymbolKind>={NO:'NO',NC:'NC',NOT:'NOT',R_TRIG:'P',F_TRIG:'N',COIL:'COIL',SET:'SET',RESET:'RESET'};
// `list` draws box instructions as a box symbol (Instructions card); otherwise their name is shown (toolbar).
export function InstructionIcon({kind,list=false}:{kind:string;list?:boolean}){return kinds[kind]?<svg className="lad-toolbar-symbol" width={32} height={24} viewBox="0 0 64 48" aria-hidden="true"><LadSymbol kind={kinds[kind]} x={0} y={0} incoming="#202A33" outgoing="#202A33"/></svg>:!list?<span aria-hidden="true" className="block-icon">{kind}</span>:<svg className="lad-toolbar-symbol" width={32} height={24} viewBox="0 0 32 24" aria-hidden="true"><path d="M2 12H9M23 12H30" stroke="#202A33" strokeWidth={1.5}/><rect x={9} y={5} width={14} height={14} fill="#e3e4ea" stroke="#202A33" strokeWidth={1.2}/><rect x={9} y={5} width={14} height={4} fill="#9aa3ad"/></svg>;}
// Tooltip text for an instruction (dictionary keys `help.<kind>`); undefined for kinds without help.
export const instructionHelp=(kind:string,lang:Lang='en'):string|undefined=>{const key=`help.${kind}` as keyof typeof editorDict.en;return key in editorDict.en?translator(editorDict,lang)(key):undefined;};
