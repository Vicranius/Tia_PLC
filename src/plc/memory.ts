import {types,type Tag,type Scalar,type DataType} from './model';
import {type Lang,langOf} from '../i18n/core';
import {say} from '../i18n/dict/plc';
export function address(address:string,type:DataType,lang:Lang='en') {
 const m=/^%([IQM])(?:(B|W|D)(\d+)|(\d+)\.([0-7]))$/.exec(address);
 if(!m)throw Error(say(lang,'mem.address',{address}));
 const width=type==='BOOL'?0:type==='BYTE'?1:['WORD','INT'].includes(type)?2:4;
 const at=Number(m[3]??m[4]); const spec=m[2];
 if((width===0&&spec)||(width>0&&spec!==(({1:'B',2:'W',4:'D'} as Record<number,string>)[width])))throw Error(say(lang,'mem.width',{type,address}));
 if(at+(width||1)>65536)throw Error(say(lang,'mem.limit'));
 return {area:m[1] as 'I'|'Q'|'M',at,bit:Number(m[5]??0),width};
}
export function validScalar(type:DataType,v:unknown):v is Scalar {
 if(type==='BOOL')return typeof v==='boolean';
 if(typeof v!=='number'||!Number.isFinite(v))return false;
 if(type==='REAL')return Math.abs(v)<=3.402823466e38;
 const range:Record<string,number[]>={BYTE:[0,255],WORD:[0,65535],DWORD:[0,4294967295],INT:[-32768,32767],DINT:[-2147483648,2147483647],TIME:[-2147483648,2147483647]};
 return types.includes(type)&&Number.isInteger(v)&&v>=range[type][0]&&v<=range[type][1];
}
export class Memory {
 areas={I:new DataView(new ArrayBuffer(65536)),Q:new DataView(new ArrayBuffer(65536)),M:new DataView(new ArrayBuffer(65536))};
 tags:Map<string,Tag>;lang:Lang;
 constructor(tags:Tag[],lang:Lang='en'){this.lang=langOf(lang);this.tags=new Map(tags.map(t=>[t.name,t]));for(const t of tags)this.set(t.name,t.initial);}
 read(name:string):Scalar{const t=this.tags.get(name);if(!t)throw Error(say(this.lang,'mem.undefinedTag',{name}));const a=address(t.address,t.type,this.lang),v=this.areas[a.area];switch(t.type){case'BOOL':return !!(v.getUint8(a.at)&(1<<a.bit));case'BYTE':return v.getUint8(a.at);case'WORD':return v.getUint16(a.at);case'INT':return v.getInt16(a.at);case'REAL':return v.getFloat32(a.at);case'DWORD':return v.getUint32(a.at);default:return v.getInt32(a.at);}}
 set(name:string,value:Scalar){const t=this.tags.get(name);if(!t)throw Error(say(this.lang,'mem.undefinedTag',{name}));if(!validScalar(t.type,value))throw Error(say(this.lang,'mem.range',{name,type:t.type,value:String(value)}));const a=address(t.address,t.type,this.lang),v=this.areas[a.area],n=Number(value);switch(t.type){case'BOOL':v.setUint8(a.at,(v.getUint8(a.at)&~(1<<a.bit))|(value?1<<a.bit:0));break;case'BYTE':v.setUint8(a.at,n);break;case'WORD':v.setUint16(a.at,n);break;case'INT':v.setInt16(a.at,n);break;case'REAL':v.setFloat32(a.at,n);break;case'DWORD':v.setUint32(a.at,n);break;default:v.setInt32(a.at,n);}}
 snapshot(){return Object.fromEntries([...this.tags.keys()].map(k=>[k,this.read(k)]));}
}

