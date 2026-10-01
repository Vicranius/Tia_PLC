import {defineDict} from '../core';

// PLC tag table, watch table and force table (TIA column wording).
export const tablesDict=defineDict({
 'tab.tags':'Tags','tab.userConstants':'User constants','tab.systemConstants':'System constants',
 'col.name':'Name','col.dataType':'Data type','col.address':'Address','col.retain':'Retain','col.hmiAccess':'Accessible from HMI/OPC UA/Web API','col.hmiWrite':'Writable from HMI/OPC UA/Web API','col.hmiVisible':'Visible in HMI engineering','col.supervision':'Supervision','col.comment':'Comment','col.value':'Value',
 'col.monitor':'Monitor value','col.format':'Display format','col.modify':'Modify value','col.tagComment':'Tag comment','col.force':'Force value','col.forceFlag':'F','col.modifyFlag':'Modify',
 'addNew':'<Add new>','tool.addRow':'Add row','tool.insertRow':'Insert row','tool.delete':'Delete','tool.monitorAll':'Monitor all','tool.modifyNow':'Modify now','tool.startForce':'Start or replace forcing','tool.stopForce':'Stop forcing',
 'msg.monitorOffline':'Go online to monitor values.','msg.modified':'Modified {n} value(s).','msg.nothingToModify':'Select the modify column (⚡) of at least one row with a modify value.','msg.forced':'Forcing started for {n} address(es). The MAINT LED is on.','msg.unforced':'Forcing stopped.','msg.badValue':'Invalid value “{value}” for {name}.','msg.unknownTag':'“{name}” is not a PLC tag.','msg.forceIo':'Only I/O addresses can be forced: {name}.',
 'empty.constants':'No user constants.','msg.needOnline':'Go online to PLC_1 first.','tag':'Tag_{n}',
},{
 'tab.tags':'Etiketler','tab.userConstants':'Kullanıcı sabitleri','tab.systemConstants':'Sistem sabitleri',
 'col.name':'Ad','col.dataType':'Veri tipi','col.address':'Adres','col.retain':'Kalıcı','col.hmiAccess':'HMI/OPC UA/Web API’den erişilebilir','col.hmiWrite':'HMI/OPC UA/Web API’den yazılabilir','col.hmiVisible':'HMI mühendisliğinde görünür','col.supervision':'Denetim','col.comment':'Açıklama','col.value':'Değer',
 'col.monitor':'İzleme değeri','col.format':'Görüntüleme biçimi','col.modify':'Değiştirme değeri','col.tagComment':'Etiket açıklaması','col.force':'Zorlama değeri','col.forceFlag':'F','col.modifyFlag':'Değiştir',
 'addNew':'<Yeni ekle>','tool.addRow':'Satır ekle','tool.insertRow':'Araya satır ekle','tool.delete':'Sil','tool.monitorAll':'Tümünü izle','tool.modifyNow':'Şimdi değiştir','tool.startForce':'Zorlamayı başlat veya değiştir','tool.stopForce':'Zorlamayı durdur',
 'msg.monitorOffline':'Değerleri izlemek için çevrimiçi ol.','msg.modified':'{n} değer değiştirildi.','msg.nothingToModify':'Değiştirme değeri olan en az bir satırın değiştirme sütununu (⚡) seç.','msg.forced':'{n} adres için zorlama başladı. MAINT LED’i yanıyor.','msg.unforced':'Zorlama durduruldu.','msg.badValue':'{name} için geçersiz değer “{value}”.','msg.unknownTag':'“{name}” bir PLC etiketi değil.','msg.forceIo':'Yalnızca I/O adresleri zorlanabilir: {name}.',
 'empty.constants':'Kullanıcı sabiti yok.','msg.needOnline':'Önce PLC_1’e çevrimiçi ol.','tag':'Etiket_{n}',
});
