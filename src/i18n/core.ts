// Framework-free i18n core: usable from React, the PLC Web Worker and the server API.
export type Lang='en'|'tr';
export const LANGS:readonly Lang[]=['en','tr'];
export const DEFAULT_LANG:Lang='en';
export const LANG_COOKIE='plc_lang';
export const LANG_NAMES:Record<Lang,string>={en:'English',tr:'Türkçe'};
export const isLang=(value:unknown):value is Lang=>value==='en'||value==='tr';
export const langOf=(value:unknown):Lang=>isLang(value)?value:DEFAULT_LANG;

// Browser preference order decides: the first preferred language we support wins, otherwise English.
export function pickLanguage(preferences:readonly string[]):Lang{
 for(const tag of preferences){const primary=tag.trim().toLowerCase().split(/[-_]/)[0];if(isLang(primary))return primary;}
 return DEFAULT_LANG;
}
export function parseAcceptLanguage(header:string|null|undefined):string[]{
 if(!header)return [];
 return header.split(',').map((part,index)=>{const [tag,...params]=part.trim().split(';');const q=Number(params.map(p=>p.trim()).find(p=>p.startsWith('q='))?.slice(2)??1);return {tag:tag.trim(),q:Number.isFinite(q)?q:0,index};}).filter(x=>x.tag&&x.tag!=='*'&&x.q>0).sort((a,b)=>b.q-a.q||a.index-b.index).map(x=>x.tag);
}
// An explicit choice (cookie) beats the browser default (Accept-Language / navigator.languages).
export const resolveLanguage=(cookie:string|null|undefined,preferences:readonly string[])=>isLang(cookie)?cookie:pickLanguage(preferences);
export const readLangCookie=(cookieHeader:string|null|undefined)=>new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=(en|tr)(?:;|$)`).exec(cookieHeader??'')?.[1] as Lang|undefined;

export type Params=Record<string,string|number|boolean>;
export const format=(template:string,params?:Params)=>params?template.replace(/\{(\w+)\}/g,(match,key:string)=>key in params?String(params[key]):match):template;

// A dictionary is one English source table plus a Turkish table with exactly the same keys (checked by the compiler).
export type Dict<K extends string>={en:Record<K,string>;tr:Record<K,string>};
export const defineDict=<const E extends Record<string,string>>(en:E,tr:Record<keyof E,string>):Dict<Extract<keyof E,string>>=>({en,tr});
export type Translate<K extends string>=(key:K,params?:Params)=>string;
export const translator=<K extends string>(dict:Dict<K>,lang:Lang):Translate<K>=>(key,params)=>format(dict[lang][key]??dict.en[key]??key,params);

// For data that carries both languages inline, e.g. exercise text: {en:'...',tr:'...'}.
export type Text={en:string;tr:string};
export const pick=(text:Text,lang:Lang,params?:Params)=>format(text[lang]||text.en,params);
