import {cookies,headers} from 'next/headers';
import Lab from '@/src/ui/Lab';
import {LanguageProvider} from '@/src/i18n/react';
import {LANG_COOKIE,isLang,parseAcceptLanguage,resolveLanguage} from '@/src/i18n/core';

export default async function Home(){
 const cookie=(await cookies()).get(LANG_COOKIE)?.value,lang=resolveLanguage(cookie,parseAcceptLanguage((await headers()).get('accept-language')));
 return <LanguageProvider initial={lang} explicit={isLang(cookie)}><Lab/></LanguageProvider>;
}
