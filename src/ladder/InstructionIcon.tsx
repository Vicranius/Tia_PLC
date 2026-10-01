import LadSymbol from './LadSymbol';
import type {SymbolKind} from './geometry';
import {translator,type Lang} from '../i18n/core';
import {editorDict} from '../i18n/dict/editor';
const kinds:Record<string,SymbolKind>={NO:'NO',NC:'NC',R_TRIG:'P',F_TRIG:'N',COIL:'COIL',SET:'SET',RESET:'RESET'};
export function InstructionIcon({kind}:{kind:string}){return kinds[kind]?<svg className="lad-toolbar-symbol" width={32} height={24} viewBox="0 0 64 48" aria-hidden="true"><LadSymbol kind={kinds[kind]} x={0} y={0} incoming="#202A33" outgoing="#202A33"/></svg>:<span aria-hidden="true" className="block-icon">{kind}</span>;}
// Tooltip text for an instruction (dictionary keys `help.<kind>`); undefined for kinds without help.
export const instructionHelp=(kind:string,lang:Lang='en'):string|undefined=>{const key=`help.${kind}` as keyof typeof editorDict.en;return key in editorDict.en?translator(editorDict,lang)(key):undefined;};
