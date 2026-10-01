'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {LANG_COOKIE,isLang,pickLanguage,translator,type Dict,type Lang,type Translate} from './core';

interface LangState {lang:Lang;setLang:(lang:Lang)=>void}
const LangContext=createContext<LangState>({lang:'en',setLang:()=>{}});

// `initial` comes from the server (cookie, else Accept-Language). Without an explicit choice the browser keeps deciding;
// a menu choice is stored in a cookie so the next server render already uses it.
export function LanguageProvider({initial,explicit,children}:{initial:Lang;explicit:boolean;children:ReactNode}){
 const [lang,setState]=useState<Lang>(initial);
 useEffect(()=>{if(explicit)return;const browser=pickLanguage(navigator.languages?.length?navigator.languages:[navigator.language]);if(browser!==initial)setState(browser);},[explicit,initial]);
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 const setLang=useCallback((next:Lang)=>{if(!isLang(next))return;setState(next);try{document.cookie=`${LANG_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;}catch{}},[]);
 const value=useMemo(()=>({lang,setLang}),[lang,setLang]);
 return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
export const useLang=()=>useContext(LangContext);
export function useT<K extends string>(dict:Dict<K>):Translate<K>{return translator(dict,useContext(LangContext).lang);}
