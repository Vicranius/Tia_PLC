import {defineDict} from '../core';

// LAD editor: instruction ribbon, network headers, element properties, rung drawing (aria/titles/hints) and instruction tooltips.
// Instruction mnemonics (NO, NC, TON, CTU, MOVE, EN/ENO, IN, PT, Q, ET, CV, PV…), tag names and addresses are never translated.
export const editorDict=defineDict({
 // instruction ribbon
 'ribbon.contacts':'CONTACTS','ribbon.coils':'COILS','ribbon.timersCounters':'TIMERS / COUNTERS','ribbon.branchCompare':'BRANCH / COMPARE',
 'ribbon.counter':'Counter','ribbon.timer':'IEC timer','ribbon.addParallel':'Add parallel branch','ribbon.parallel':'Parallel','ribbon.addSeries':'Add series contact','ribbon.series':'Series','ribbon.compare':'Compare',
 'ribbon.deleteSelected':'Delete selected element','ribbon.delete':'Delete','ribbon.hint':'Select an element → click an instruction → assign a tag. Parallel: adds an alternative path to the selected element.','ribbon.moveMath':'MOVE / Math / Conversion',
 // block and network chrome
 'conn.done':'Branch connection established.','block.default':'Main Program Sweep (Cycle)','block.title':'Block title:','comment':'Comment',
 'empty.heading':'Build your first network','empty.text':'Pick NO / NC contacts and add them in series or in parallel. Assign the tag of the output coil.','empty.add':'＋ Add network',
 'network.label':'Network {n}:','network.expand':'Expand network {n}','network.collapse':'Collapse network {n}','network.title':'Network {n} title','network.comment':'Network {n} comment','network.up':'Move network up','network.down':'Move network down','network.delete':'Delete network','network.add':'Add network',
 // element properties
 'inspector.title':'Element properties','inspector.contactType':'Contact type','inspector.contactOperand':'Contact operand / tag',
 'inspector.timerInstruction':'Timer instruction','inspector.counterInstruction':'Counter instruction','inspector.instanceName':'Instance name','inspector.timerInstance':'Timer instance name','inspector.counterInstance':'Counter instance name','inspector.ptOperand':'PT operand','inspector.pvOperand':'PV operand',
 'inspector.timerOutputs':'BOOL output: {instance}.Q · TIME output: {instance}.ET','inspector.counterOutputs':'BOOL outputs: {instance}.{bool} · Numeric output: {instance}.CV',
 'inspector.comparison':'Comparison','inspector.groupLogic':'Group logic','inspector.why':'Why TRUE / FALSE?','inspector.outputInstruction':'Output instruction','inspector.outputTag':'Output tag','inspector.jumpTarget':'Jump label (target)','inspector.jumpLabel':'Jump label of this network (LABEL)',
 // operand editors
 'time.operandType':'PT operand type','time.duration':'PT duration (ms)','time.tag':'PT TIME tag',
 'value.operandType':'Operand type','value.literal':'Constant','value.tag':'Tag','value.constant':'Constant value','value.numericTag':'Numeric tag',
 // rung drawing
 'rung.network':'{title} Ladder network','rung.iecCounter':'IEC counter','rung.iecCounterOutput':'IEC counter output · BOOL','rung.tagName':'Tag name',
 'rung.emptyPin':'Empty pin: add a contact','rung.emptyPath':'Empty path: select to add an element','rung.compare':'Compare {op}','rung.compareProps':'Comparison properties','rung.instruction':'{type} instruction','rung.coilProps':'Coil / output properties',
 'rung.editInstance':'Edit {type} instance tag','rung.editPt':'Edit PT operand','rung.editEt':'Edit ET output tag','rung.editPv':'Edit PV operand','rung.editCv':'Edit CV output tag',
 'rung.insertBefore':'Insert before','rung.insertAfter':'Insert after','rung.insertEnd':'Add element at the end of the rung',
 'rung.moveConnection':'Move left connection of {type} {port} pin','rung.dragHint':'Drag the left end to a branch point. Delete: remove the connection.','rung.junctionBefore':'Branch connection point before {id}','rung.junctionAfter':'Branch connection point after {id}',
 'rung.operandEditor':'{field} operand editor','rung.timeHint':'T#3s, T#500ms or a TIME tag','rung.numberHint':'Number or a tag of a suitable type','rung.hint.instance':'Instance name, e.g. Counter_1','rung.hint.pv':'Number or an integer tag','rung.hint.output':'Select a writable tag',
 'rung.err.duplicate':'This instance name is already in use.','rung.err.invalid':'Enter an instance name that starts with a letter or _.',
 // instruction tooltips
 'help.NO':'Normally Open Contact — TRUE when operand = 1','help.NC':'Normally Closed Contact — TRUE when operand = 0','help.R_TRIG':'P_TRIG — positive edge, TRUE for one scan','help.F_TRIG':'N_TRIG — negative edge, TRUE for one scan',
 'help.COIL':'Coil — assign path result to BOOL output','help.SET':'SET — latch output TRUE while path is TRUE','help.RESET':'RESET — reset output FALSE while path is TRUE',
 'help.TON':'TON — on-delay timer (IN, PT, Q, ET)','help.TOF':'TOF — off-delay timer (IN, PT, Q, ET)','help.TP':'TP — pulse timer (IN, PT, Q, ET)',
 'help.CTU':'CTU — counts rising edges of CU (R, PV, Q, CV)','help.CTD':'CTD — counts down on rising edges of CD (LD, PV, Q, CV)','help.CTUD':'CTUD — counts up and down with CU/CD (R, LD, PV, QU, QD, CV)',
 'help.ADD':'ADD — IN1 + IN2 → OUT','help.SUB':'SUB — IN1 − IN2 → OUT','help.MUL':'MUL — IN1 × IN2 → OUT','help.DIV':'DIV — IN1 ÷ IN2 → OUT','help.MOVE':'MOVE — copy the IN value to OUT',
 'help.INT_TO_REAL':'INT_TO_REAL — convert the INT value to REAL','help.REAL_TO_INT':'REAL_TO_INT — round the REAL value to the nearest INT','help.WORD_TO_INT':'WORD_TO_INT — interpret the 16-bit WORD value as a signed INT',
 'help.NORM_X':'NORM_X — convert VALUE within the MIN–MAX range to a 0.0–1.0 ratio','help.SCALE_X':'SCALE_X — scale a 0.0–1.0 ratio to the MIN–MAX engineering range',
 'call.title':'Block call {name}','call.instance':'Instance DB: {name}','call.inputs':'Inputs (operand or value)','call.outputs':'Outputs','call.none':'— not connected —','call.missing':'The called block no longer exists.',
},{
 'ribbon.contacts':'KONTAKLAR','ribbon.coils':'BOBİNLER','ribbon.timersCounters':'ZAMANLAYICILAR / SAYICILAR','ribbon.branchCompare':'BAĞLANTI / KARŞILAŞTIRMA',
 'ribbon.counter':'Sayıcı','ribbon.timer':'IEC zamanlayıcı','ribbon.addParallel':'Paralel kol ekle','ribbon.parallel':'Paralel','ribbon.addSeries':'Seri kontak ekle','ribbon.series':'Seri','ribbon.compare':'Karşılaştır',
 'ribbon.deleteSelected':'Seçili elemanı sil','ribbon.delete':'Sil','ribbon.hint':'Elemanı seç → komuta tıkla → tag ata. Paralel: seçili elemana alternatif yol ekler.','ribbon.moveMath':'MOVE / Matematik / Dönüştürme',
 'conn.done':'Branch bağlantısı kuruldu.','block.default':'Ana program çevrimi (Cycle)','block.title':'Blok başlığı:','comment':'Açıklama',
 'empty.heading':'İlk network’ünü kur','empty.text':'NO / NC kontaklarını seçip seri veya paralel ekle. Çıkış bobininin tag’ini ata.','empty.add':'＋ Network ekle',
 'network.label':'Network {n}:','network.expand':'Network {n} aç','network.collapse':'Network {n} kapat','network.title':'Network {n} başlığı','network.comment':'Network {n} açıklaması','network.up':'Network yukarı','network.down':'Network aşağı','network.delete':'Network sil','network.add':'Network ekle',
 'inspector.title':'Eleman özellikleri','inspector.contactType':'Kontak türü','inspector.contactOperand':'Kontak operandı / tag',
 'inspector.timerInstruction':'Zamanlayıcı komutu','inspector.counterInstruction':'Sayıcı komutu','inspector.instanceName':'Instance adı','inspector.timerInstance':'Zamanlayıcı instance adı','inspector.counterInstance':'Sayıcı instance adı','inspector.ptOperand':'PT operandı','inspector.pvOperand':'PV operandı',
 'inspector.timerOutputs':'BOOL çıkış: {instance}.Q · TIME çıkış: {instance}.ET','inspector.counterOutputs':'BOOL çıkışlar: {instance}.{bool} · Sayısal çıkış: {instance}.CV',
 'inspector.comparison':'Karşılaştırma','inspector.groupLogic':'Grup mantığı','inspector.why':'Neden TRUE / FALSE?','inspector.outputInstruction':'Çıkış komutu','inspector.outputTag':'Çıkış tag','inspector.jumpTarget':'Atlama etiketi (hedef)','inspector.jumpLabel':'Bu network’ün atlama etiketi (LABEL)',
 'time.operandType':'PT operand türü','time.duration':'PT süresi (ms)','time.tag':'PT TIME tag',
 'value.operandType':'Operand türü','value.literal':'Sabit','value.tag':'Tag','value.constant':'Sabit değer','value.numericTag':'Sayısal tag',
 'rung.network':'{title} Ladder network’ü','rung.iecCounter':'IEC sayıcı','rung.iecCounterOutput':'IEC sayıcı çıkışı · BOOL','rung.tagName':'Tag adı',
 'rung.emptyPin':'Boş pin: kontak ekle','rung.emptyPath':'Boş yol: eleman eklemek için seç','rung.compare':'Karşılaştırma {op}','rung.compareProps':'Karşılaştırma özellikleri','rung.instruction':'{type} komutu','rung.coilProps':'Bobin / çıkış özellikleri',
 'rung.editInstance':'{type} instance tagini düzenle','rung.editPt':'PT operandını düzenle','rung.editEt':'ET çıkış tagini düzenle','rung.editPv':'PV operandını düzenle','rung.editCv':'CV çıkış tagini düzenle',
 'rung.insertBefore':'Önüne ekle','rung.insertAfter':'Arkasına ekle','rung.insertEnd':'Hat sonuna eleman ekle',
 'rung.moveConnection':'{type} {port} kolunun sol bağlantısını taşı','rung.dragHint':'Sol ucu branch noktasına sürükle. Delete: bağlantıyı kaldır.','rung.junctionBefore':'{id} öncesi branch bağlantı noktası','rung.junctionAfter':'{id} sonrası branch bağlantı noktası',
 'rung.operandEditor':'{field} operand düzenleyici','rung.timeHint':'T#3s, T#500ms veya TIME tag','rung.numberHint':'Sayı veya uygun türde tag','rung.hint.instance':'Instance adı: ör. Sayac_1','rung.hint.pv':'Sayı veya integer tag','rung.hint.output':'Yazılabilir tag seçin',
 'rung.err.duplicate':'Bu instance adı zaten kullanılıyor.','rung.err.invalid':'Harf veya _ ile başlayan bir instance adı yazın.',
 'help.NO':'Normalde açık kontak — operand = 1 iken TRUE','help.NC':'Normalde kapalı kontak — operand = 0 iken TRUE','help.R_TRIG':'P_TRIG — yükselen kenar, bir tarama boyunca TRUE','help.F_TRIG':'N_TRIG — düşen kenar, bir tarama boyunca TRUE',
 'help.COIL':'Bobin — yol sonucunu BOOL çıkışa ata','help.SET':'SET — yol TRUE olduğunda çıkışı TRUE yapıp mühürle','help.RESET':'RESET — yol TRUE olduğunda çıkışı FALSE yap',
 'help.TON':'TON — çekme gecikmeli zamanlayıcı (IN, PT, Q, ET)','help.TOF':'TOF — bırakma gecikmeli zamanlayıcı (IN, PT, Q, ET)','help.TP':'TP — darbe zamanlayıcı (IN, PT, Q, ET)',
 'help.CTU':'CTU — CU yükselen kenarlarını sayar (R, PV, Q, CV)','help.CTD':'CTD — CD yükselen kenarlarında aşağı sayar (LD, PV, Q, CV)','help.CTUD':'CTUD — CU/CD ile iki yönde sayar (R, LD, PV, QU, QD, CV)',
 'help.ADD':'ADD — IN1 + IN2 → OUT','help.SUB':'SUB — IN1 − IN2 → OUT','help.MUL':'MUL — IN1 × IN2 → OUT','help.DIV':'DIV — IN1 ÷ IN2 → OUT','help.MOVE':'MOVE — IN değerini OUT hedefine kopyala',
 'help.INT_TO_REAL':'INT_TO_REAL — INT değerini REAL değere dönüştür','help.REAL_TO_INT':'REAL_TO_INT — REAL değerini en yakın INT değere yuvarla','help.WORD_TO_INT':'WORD_TO_INT — 16 bit WORD değerini işaretli INT olarak yorumla',
 'help.NORM_X':'NORM_X — VALUE değerini MIN–MAX aralığında 0.0–1.0 oranına dönüştür','help.SCALE_X':'SCALE_X — 0.0–1.0 oranını MIN–MAX mühendislik aralığına ölçekle',
 'call.title':'Blok çağrısı {name}','call.instance':'Instance veri bloğu: {name}','call.inputs':'Girişler (operand veya değer)','call.outputs':'Çıkışlar','call.none':'— bağlı değil —','call.missing':'Çağrılan blok artık yok.',
});
