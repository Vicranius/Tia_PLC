import {defineDict} from '../core';

// Tag / watch tables, process screen (conveyor/tank/motor), industrial HMI scenes, signal diagram, momentary input,
// resizable-workspace splitters and the classic menu bar. Tag names, addresses and mnemonics are never translated.
export const processDict=defineDict({
 // tag table and watch table
 'tags.search':'Search tags','tags.searchPlaceholder':'Search by tag or address…','tags.add':'＋ Add tag',
 'tags.hintWatch':'Change inputs or apply an explicit force.','tags.hintTable':'Change inputs with Modify value; follow the result in Main with Monitoring.',
 'col.name':'Name','col.dataType':'Data type','col.address':'Address','col.start':'Start value','col.monitor':'Monitor value','col.modify':'Modify value','col.force':'Force','col.inputBehavior':'Input behavior','col.comment':'Comment',
 'tags.name':'Tag name','tags.address':'Tag address','tags.comment':'Tag comment','tags.toggle':'Toggle {name}','tags.numeric':'{name} numeric input','tags.delete':'Delete tag {name}',
 'tags.forceActive':'FORCE {value} ×','tags.forceValue':'Force value','tags.inputBehavior':'{name} input behavior','tags.toggleInput':'Toggle input','tags.momentaryInput':'Momentary input',
 // momentary input button
 'momentary.hold':'Hold {name}','momentary.title':'Momentary input: TRUE while pressed, FALSE when released','momentary.idle':'○ Hold',
 // process screen
 'process.title':'PROCESS SIMULATION','process.moving':'MOTION','process.idle':'IDLE','process.diagram':'Process diagram driven by the PLC outputs','process.items':'{count} products',
 'process.autoSensors':'Automatic sensors','process.closedLoop':'Closed-loop sensors','process.fault':'Sensor fault','process.fault.none':'Sensor normal','process.fault.stuckTrue':'Sensor stuck at TRUE','process.fault.stuckFalse':'Sensor stuck at FALSE',
 'process.faultTarget':'Sensor to apply the fault to','process.selectSensor':'Select sensor','process.reset':'New batch / reset process','process.addProduct':'＋ Place product','process.inputsHint':'Change the inputs in the panel below.',
 'process.manualInputs':'MANUAL INPUTS','process.activeHint':'TRUE = active','process.value':'{name} value',
 // industrial HMI scene
 'scene.roaster':'R-301 · Nut roasting','scene.mixer':'MX-201 · Paint preparation','scene.water':'TK-101 · Water filling and transfer','scene.done':'BATCH COMPLETE','scene.active':'CYCLE ACTIVE',
 'scene.roasterDiagram':'Process diagram of the drum, heater, fan and discharge flap','scene.mixerDiagram':'Process diagram of the A and B dosing valves, agitator and tank level','scene.waterDiagram':'Process diagram of the fill valve, level switches and transfer pump',
 'scene.load':'{value}% load','scene.tank':'1000 L · training tank','scene.recipe':'Recipe: A 60 units + B 30 units','scene.sequence':'Fill → high level → transfer → empty tank',
 'scene.productLoad':'Product load','scene.level':'Level','scene.temperature':'Temperature','scene.mix':'Mix','scene.virtualTime':'Virtual time',
 'scene.trace':'Trace · last 60 s','scene.keyLoad':'Load (%)','scene.keyLevel':'Level (%)','scene.keyTemperature':'Temperature (°C)','scene.keyMix':'Mix (%)','scene.trend':'Process trend chart over time','scene.noAlarms':'● No active process alarms',
 // signal diagram (motor exercises)
 'signal.title':'PLC_1 · Signal and actuator monitoring','signal.diagram':'PLC outputs and the states of the connected actuators','signal.hint':'Change feedback and requests in the input panel; watch the command and alarm results.',
 // splitters and menu bar
 'splitter.left':'Project tree width','splitter.right':'Right pane width','splitter.bottom':'Bottom pane height','splitter.title':'Drag to resize · Double-click: default size','menu.aria':'Application menu',
},{
 'tags.search':'Tag ara','tags.searchPlaceholder':'Tag veya adres ara…','tags.add':'＋ Tag ekle',
 'tags.hintWatch':'Girişleri değiştir veya açıkça zorlama uygula.','tags.hintTable':'Girişleri “Değiştirme değeri” ile değiştir; Main’deki sonucu izleme ile takip et.',
 'col.name':'Ad','col.dataType':'Veri tipi','col.address':'Adres','col.start':'Başlangıç değeri','col.monitor':'İzleme değeri','col.modify':'Değiştirme değeri','col.force':'Zorlama','col.inputBehavior':'Giriş davranışı','col.comment':'Açıklama',
 'tags.name':'Tag adı','tags.address':'Tag adresi','tags.comment':'Tag açıklaması','tags.toggle':'{name} değiştir','tags.numeric':'{name} sayısal giriş','tags.delete':'{name} tag sil',
 'tags.forceActive':'ZORLAMA {value} ×','tags.forceValue':'Değeri zorla','tags.inputBehavior':'{name} giriş davranışı','tags.toggleInput':'Toggle giriş','tags.momentaryInput':'Momentary giriş',
 'momentary.hold':'{name} basılı tut','momentary.title':'Momentary giriş: basınca TRUE, bırakınca FALSE','momentary.idle':'○ Basılı tut',
 'process.title':'PROSES SİMÜLASYONU','process.moving':'HAREKET','process.idle':'BEKLEME','process.diagram':'PLC çıkışlarından beslenen proses şeması','process.items':'{count} ürün',
 'process.autoSensors':'Otomatik sensörler','process.closedLoop':'Kapalı çevrim sensörleri','process.fault':'Sensör arızası','process.fault.none':'Sensör normal','process.fault.stuckTrue':'Sensör takılı TRUE','process.fault.stuckFalse':'Sensör takılı FALSE',
 'process.faultTarget':'Arıza uygulanacak sensör','process.selectSensor':'Sensör seç','process.reset':'Yeni parti / prosesi sıfırla','process.addProduct':'＋ Ürün yerleştir','process.inputsHint':'Girişleri aşağıdaki panelden değiştir.',
 'process.manualInputs':'MANUEL GİRİŞLER','process.activeHint':'TRUE = aktif','process.value':'{name} değeri',
 'scene.roaster':'R-301 · Çerez kavurma','scene.mixer':'MX-201 · Boya hazırlama','scene.water':'TK-101 · Su dolum ve transfer','scene.done':'PARTİ TAMAMLANDI','scene.active':'ÇEVRİM AKTİF',
 'scene.roasterDiagram':'Tambur, ısıtıcı, fan ve boşaltma klapesi proses şeması','scene.mixerDiagram':'A ve B dozaj valfleri, karıştırıcı ve tank seviyesi proses şeması','scene.waterDiagram':'Dolum valfi, seviye şalterleri ve transfer pompası proses şeması',
 'scene.load':'{value}% yük','scene.tank':'1000 L · eğitim tankı','scene.recipe':'Reçete: A 60 birim + B 30 birim','scene.sequence':'Dolum → üst seviye → transfer → boş tank',
 'scene.productLoad':'Ürün yükü','scene.level':'Seviye','scene.temperature':'Sıcaklık','scene.mix':'Karışım','scene.virtualTime':'Sanal süre',
 'scene.trace':'Trace · son 60 s','scene.keyLoad':'Yük (%)','scene.keyLevel':'Seviye (%)','scene.keyTemperature':'Sıcaklık (°C)','scene.keyMix':'Karışım (%)','scene.trend':'Zamana bağlı proses trend grafiği','scene.noAlarms':'● Aktif proses alarmı yok',
 'signal.title':'PLC_1 · Sinyal ve aktüatör izleme','signal.diagram':'PLC çıkışları ve bağlı aktüatör durumları','signal.hint':'Geri bildirim ve talepleri giriş panelinden değiştir; komut ve alarm sonuçlarını izle.',
 'splitter.left':'Proje ağacı genişliği','splitter.right':'Sağ panel genişliği','splitter.bottom':'Alt panel yüksekliği','splitter.title':'Boyutlandırmak için sürükle · Çift tık: varsayılan boyut','menu.aria':'Uygulama menüsü',
});
