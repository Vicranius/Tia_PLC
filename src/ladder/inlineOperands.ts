import type {Value} from '../plc/model';

export const numericOperand=(source:string):Value=>{
 const text=source.trim().replace(/^"|"$/g,'');
 const number=Number(text);
 return text!==''&&Number.isFinite(number)?{kind:'literal',value:number}:{kind:'tag',tag:text};
};

export const timeOperand=(source:string):Value=>{
 const text=source.trim().replace(/^"|"$/g,'');
 if(/^\d+(?:\.\d+)?$/.test(text))return {kind:'literal',value:Number(text)};
 const body=text.match(/^T#(.+)$/i)?.[1]?.replaceAll('_','');
 if(body){
  const units:Record<string,number>={d:86400000,h:3600000,m:60000,s:1000,ms:1};
  const token=/(\d+(?:\.\d+)?)(ms|d|h|m|s)/gi;
  let total=0,consumed='',match:RegExpExecArray|null;
  while((match=token.exec(body))){consumed+=match[0];total+=Number(match[1])*units[match[2].toLowerCase()];}
  if(consumed.toLowerCase()===body.toLowerCase()&&Number.isInteger(total))return {kind:'literal',value:total};
 }
 return {kind:'tag',tag:text};
};

export const formatTimeOperand=(value:number|Value):string=>{
 if(typeof value==='number')return `T#${value}ms`;
 if(value.kind==='literal')return `T#${value.value}ms`;
 return value.kind==='tag'?value.tag:`${value.op}(...)`;
};
