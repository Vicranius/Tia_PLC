import type {Tag,Program} from '../plc/model';
import {pick,type Lang,type Text} from '../i18n/core';
export type PlantKind='conveyor'|'tank'|'motor'|'water'|'mixer'|'roaster';
export interface Challenge {id:number;seed:number;title:string;level:number;scenario:string;objectives:string[];concepts:string[];tags:Tag[];delay:number;preset:number;plant:PlantKind;hints:string[]}

// Every piece of learner-facing text is stored once per language ({en,tr}) right next to its twin, so a change to one
// language is always reviewed against the other. The Turkish text is the original training text; English is the main language.
// Placeholders {delay} and {preset} are substituted per seed in both languages (see `pick`).
const T=(en:string,tr:string):Text=>({en,tr});
interface Definition {title:Text;level:number;scenario:Text;rules:Text[];concepts:string[];ins:string[];outs:string[]}
const def=(title:Text,level:number,scenario:Text,rules:Text[],concepts:string[],ins:string[],outs:string[]):Definition=>({title,level,scenario,rules,concepts,ins,outs});

const definitions:Definition[]=[
 def(T('AND gate','AND kapısı'),1,
  T('The press must run only while both hand buttons are active together.','Pres yalnızca iki el butonu birlikte aktifken çalışmalıdır.'),
  [T('MOTOR runs when both buttons are TRUE.','İki buton birlikte TRUE ise MOTOR çalışsın.'),
   T('The motor stops as soon as either button is released.','Tek buton bırakılınca motor dursun.')],
  ['AND'],['START','ENABLE'],['MOTOR']),
 def(T('OR gate','OR kapısı'),1,
  T('The operator can start the belt from two different stations.','Operatör bandı iki farklı istasyondan çalıştırabilir.'),
  [T('MOTOR runs when START or REMOTE is active.','START veya REMOTE aktifse MOTOR çalışsın.'),
   T('It stops when both are released.','İkisi de bırakılırsa dursun.')],
  ['OR'],['START','REMOTE'],['MOTOR']),
 def(T('Motor Start / Stop','Motor başlat / durdur'),1,
  T('Start the motor of a production conveyor with START. The motor keeps running after you release the button.','Bir üretim bandının motorunu START ile çalıştır. Butonu bıraktığında motor çalışmaya devam etsin.'),
  [T('START must start the motor.','START motoru çalıştırmalı.'),
   T('The motor must hold its state when START is released.','START bırakıldığında motor durumunu korumalı.'),
   T('STOP must stop the motor; if it is given together with START, STOP has priority.','STOP motoru durdurmalı; START ile aynı anda verilirse STOP öncelikli.'),
   T('OVERLOAD must stop the motor and block a new start.','OVERLOAD motoru durdurmalı ve yeni başlatmayı engellemeli.'),
   T('When the fault clears, the motor must not restart by itself.','Arıza kalktığında motor kendiliğinden başlamamalı.')],
  ['Seal-in','Interlocks'],['START','STOP','OVERLOAD'],['MOTOR']),
 def(T('Motor seal-in','Motor mühürleme'),1,
  T('A pump motor is to be kept running by a short START pulse.','Bir pompa motoru kısa START darbesi ile sürekli çalıştırılacak.'),
  [T('MOTOR keeps running after START is released.','START bırakıldığında MOTOR çalışmaya devam etsin.'),
   T('STOP and OVERLOAD break the seal-in.','STOP ve OVERLOAD mühürlemeyi kessin.'),
   T('A new START is required after the fault is cleared.','Arıza giderildiğinde yeniden START gereksin.')],
  ['Seal-in'],['START','STOP','OVERLOAD'],['MOTOR']),
 def(T('Emergency stop','Acil durdurma'),1,
  T('Review the stop logic in the control software of a test cell.','Bir test hücresinin kontrol yazılımındaki durdurma mantığını incele.'),
  [T('Seal in with START.','START ile mühürle.'),
   T('MOTOR drops out while E_STOP or STOP is active.','E_STOP veya STOP aktifken MOTOR kapansın.'),
   T('There must be no automatic restart when E_STOP is released.','E_STOP kalkınca otomatik yeniden çalışma olmasın.')],
  ['Interlocks','Safety'],['START','STOP','E_STOP'],['MOTOR']),
 def(T('Forward / reverse interlock','İleri / geri kilitleme'),2,
  T('A drive motor can run in two directions. The two contactors must never pull in together.','Bir tahrik motoru iki yönde çalışabilir. İki kontaktör birlikte çekmemelidir.'),
  [T('FORWARD seals in with FWD_CMD; REVERSE seals in with REV_CMD.','FWD_CMD ile FORWARD mühürlensin; REV_CMD ile REVERSE mühürlensin.'),
   T('While one direction is running, the other direction must not be selected.','Karşı yön çalışırken diğer yöne geçilmesin.'),
   T('If both commands are given together, both outputs stay off.','İki komut birlikte verilirse iki çıkış da kapalı kalsın.'),
   T('STOP stops both directions.','STOP iki yönü durdursun.')],
  ['Interlocks','Seal-in'],['FWD_CMD','REV_CMD','STOP'],['FORWARD','REVERSE']),
 def(T('TON motor delay','TON motor gecikmesi'),2,
  T('The fan contactor must pull in only after START has been held down continuously.','Fan kontaktörü START sürekli basılı kaldıktan sonra çekmelidir.'),
  [T('MOTOR runs once START has been continuously TRUE for {delay} ms.','START kesintisiz {delay} ms TRUE olduğunda MOTOR çalışsın.'),
   T('When START is released, the output and the timer reset.','START bırakılınca çıkış ve timer sıfırlansın.'),
   T('While OVERLOAD is active, the timer and the motor stay off.','OVERLOAD aktifken timer ve motor kapalı olsun.')],
  ['Timers'],['START','OVERLOAD'],['MOTOR']),
 def(T('TOF fan','TOF fan'),2,
  T('A ventilation fan keeps cooling for a while after the command is removed.','Havalandırma fanı komut kesildikten sonra bir süre soğutmaya devam eder.'),
  [T('FAN runs immediately with START.','START ile FAN hemen çalışsın.'),
   T('FAN stops {delay} ms after START is removed.','START kesildikten {delay} ms sonra FAN dursun.'),
   T('If START is given again, the off-delay restarts.','Tekrar START verilirse kapanma gecikmesi sıfırlansın.')],
  ['Timers'],['START'],['FAN']),
 def(T('TP pulse','TP darbe'),2,
  T('A marking valve runs for a fixed time on the trigger edge.','Bir işaretleme valfi tetikleme kenarında sabit süre çalışır.'),
  [T('VALVE is active for {delay} ms on the rising edge of START.','START yükselen kenarında VALVE {delay} ms aktif olsun.'),
   T('The pulse completes even if START is released early.','START erken bırakılsa da darbe tamamlansın.'),
   T('The pulse must not repeat while START is held down.','START basılı tutulduğunda darbe tekrarlanmasın.')],
  ['Timers','Edges'],['START'],['VALVE']),
 def(T('Product counter','Ürün sayacı'),2,
  T('A packaging line notifies the operator when the target product count is reached.','Paketleme hattı hedef ürün sayısına ulaşınca operatöre haber verir.'),
  [T('Count the rising edges of SENSOR.','SENSOR yükselen kenarlarını say.'),
   T('DONE becomes active at {preset} products.','{preset} üründe DONE aktif olsun.'),
   T('While SENSOR stays TRUE, only one count must occur.','SENSOR sürekli TRUE iken yalnızca bir sayım olsun.'),
   T('RESET clears the counter and the DONE output.','RESET sayacı ve DONE çıkışını sıfırlasın.')],
  ['Counters','Edges'],['SENSOR','RESET'],['DONE']),
 def(T('Conveyor sensor','Konveyör sensörü'),2,
  T('When a product on the belt reaches the inspection station, the movement is interrupted.','Bant üzerindeki ürün kontrol istasyonuna geldiğinde hareket kesilir.'),
  [T('CONVEYOR seals in with START.','START ile CONVEYOR mühürlensin.'),
   T('The conveyor stops while SENSOR is TRUE and resumes automatically once the sensor clears.','SENSOR TRUE olduğunda conveyor dursun, sensör temizlenince otomatik devam etsin.'),
   T('STOP and OVERLOAD stop all movement.','STOP ve OVERLOAD bütün hareketi durdursun.')],
  ['Seal-in','Interlocks'],['START','STOP','SENSOR','OVERLOAD'],['CONVEYOR']),
 def(T('Conveyor + cylinder','Konveyör + silindir'),3,
  T('The belt stops when a product is detected; after a delay a pusher ejects the product and the belt restarts.','Ürün algılanınca bant duracak; gecikmeli itici ürünü ayırıp bandı yeniden başlatacak.'),
  [T('The conveyor runs with START; STOP and OVERLOAD cut all movement.','START ile conveyor çalışsın; STOP ve OVERLOAD bütün hareketi kessin.'),
   T('The belt stops on the rising edge of SENSOR.','SENSOR yükselen kenarında bant dursun.'),
   T('Wait {delay} ms; then PUSHER is active for 500 ms.','{delay} ms bekle; PUSHER 500 ms aktif olsun.'),
   T('When PUSHER drops out, the belt runs again.','PUSHER kapanınca bant yeniden çalışsın.'),
   T('If SENSOR stays stuck at TRUE, no second pulse may occur.','SENSOR takılı TRUE kalırsa ikinci darbe oluşmasın.')],
  ['Timers','Sequence','Edges'],['START','STOP','SENSOR','OVERLOAD'],['CONVEYOR','PUSHER']),
 def(T('Traffic lights','Trafik lambaları'),3,
  T('Build a three-lamp cycle for one-way traffic inside the factory.','Fabrika içi tek yönlü geçiş için üç lambalı çevrim oluştur.'),
  [T('The cycle seals in with START; STOP turns all lamps off.','START ile çevrim mühürlensin; STOP ile bütün lambalar kapansın.'),
   T('GREEN, AMBER and RED light up in turn, {delay} ms each.','GREEN {delay} ms, AMBER {delay} ms, RED {delay} ms sırayla yansın.'),
   T('The cycle repeats; only one lamp is lit at a time.','Çevrim tekrarlansın; aynı anda tek lamba yansın.')],
  ['Timers','Sequence'],['START','STOP'],['GREEN','AMBER','RED']),
 def(T('Tank filling','Tank doldurma'),3,
  T('A tank is filled starting at the low-level switch, up to the high level.','Tank alt seviye şalterinden başlayarak üst seviyeye kadar doldurulacak.'),
  [T('VALVE opens when LOW is TRUE and HIGH is FALSE.','LOW TRUE ve HIGH FALSE ise VALVE açılsın.'),
   T('Filling continues even after the LOW signal drops out.','LOW sinyali kalksa da dolum devam etsin.'),
   T('VALVE closes when HIGH or FAULT becomes TRUE.','HIGH veya FAULT TRUE olunca VALVE kapansın.')],
  ['Seal-in','Interlocks'],['LOW','HIGH','FAULT'],['VALVE']),
 def(T('Tank drain','Tank boşaltma'),3,
  T('When the tank reaches the high level, it is drained down to the low level.','Tank üst seviyeye ulaştığında alt seviyeye kadar boşaltılacak.'),
  [T('PUMP runs when HIGH is TRUE and EMPTY is FALSE.','HIGH TRUE ve EMPTY FALSE ise PUMP çalışsın.'),
   T('PUMP keeps running even after HIGH drops out.','HIGH kalksa da PUMP çalışmaya devam etsin.'),
   T('PUMP stops when EMPTY or FAULT is active.','EMPTY veya FAULT aktifse PUMP dursun.')],
  ['Seal-in','Interlocks'],['HIGH','EMPTY','FAULT'],['PUMP']),
 def(T('Pump dry-run protection','Pompa kuru çalışma koruması'),2,
  T('The transfer pump must not run when there is no water.','Transfer pompası su yokken çalışmamalı.'),
  [T('PUMP seals in with START and WATER_OK.','START ve WATER_OK ile PUMP mühürlensin.'),
   T('Loss of WATER_OK or STOP stops the pump.','WATER_OK kaybı veya STOP pompayı durdursun.'),
   T('When the water returns, the pump must not run without START.','Su geri geldiğinde START olmadan çalışmasın.')],
  ['Interlocks','Safety'],['START','STOP','WATER_OK'],['PUMP']),
 def(T('Temperature heater','Sıcaklık kontrollü ısıtıcı'),4,
  T('A 0–10 V temperature transmitter maps the 0–150 °C range to raw values 0–27648.','0–10 V sıcaklık vericisi 0–150 °C aralığını 0–27648 ham değere dönüştürür.'),
  [T('Scale the RAW value to TEMP (REAL) in °C.','RAW değerini TEMP (REAL) °C değerine ölçekle.'),
   T('HEATER turns on when TEMP < 70.','TEMP < 70 olduğunda HEATER açılsın.'),
   T('HEATER turns off when TEMP > 75; between 70 and 75 it keeps its previous state.','TEMP > 75 olduğunda HEATER kapansın; 70–75 aralığında önceki durumu korusun.'),
   T('HEATER turns off when the raw value is outside 0–27648 or FAULT is TRUE.','Ham değer 0–27648 dışında veya FAULT TRUE ise heater kapansın.')],
  ['Analog','Hysteresis'],['FAULT'],['HEATER']),
 def(T('Analog scaling','Analog ölçekleme'),4,
  T('Convert the raw value of a temperature transmitter to an engineering unit.','Bir sıcaklık vericisinin ham değerini mühendislik birimine dönüştür.'),
  [T('Scale RAW 0–27648 to TEMP 0–150 °C.','RAW 0–27648 değerini TEMP 0–150 °C aralığına ölçekle.'),
   T('A raw value of 18432 must give 100 °C.','18432 ham değer için 100 °C hesaplanmalı.'),
   T('Keep REAL precision for intermediate values.','Ara değerlerde REAL hassasiyetini koru.')],
  ['Analog'],[],[]),
 def(T('Star-delta starter','Yıldız-üçgen yolverici'),5,
  T('The motor starts in star and, after an open-transition wait, runs in delta.','Motor başlangıçta yıldız, açık geçiş beklemesinden sonra üçgen çalışır.'),
  [T('The main MOTOR seals in with START; STOP and OVERLOAD cut all outputs.','START ile ana MOTOR mühürlensin; STOP ve OVERLOAD bütün çıkışları kessin.'),
   T('STAR is active for the first {delay} ms.','STAR ilk {delay} ms aktif olsun.'),
   T('DELTA runs 100 ms after STAR has dropped out.','STAR kapandıktan 100 ms sonra DELTA çalışsın.'),
   T('STAR and DELTA must never be active together.','STAR ve DELTA hiçbir zaman birlikte aktif olmasın.')],
  ['Timers','Interlocks','Sequence'],['START','STOP','OVERLOAD'],['MOTOR','STAR','DELTA']),
 def(T('Conveyor sorting','Konveyör ayıklama'),3,
  T('Large products on the belt are separated out by a pusher.','Bant üzerindeki büyük ürünler itici ile ayrılır.'),
  [T('Seal in the run permissive with START.','START ile çalışma iznini mühürle.'),
   T('While SENSOR and LARGE are both active, CONVEYOR stops and PUSHER runs.','SENSOR ve LARGE birlikte aktifken CONVEYOR dursun ve PUSHER çalışsın.'),
   T('For small products the conveyor keeps running and PUSHER stays off.','Küçük ürünlerde conveyor devam etsin; PUSHER kapalı kalsın.'),
   T('STOP or OVERLOAD cuts all movement.','STOP veya OVERLOAD bütün hareketi kessin.')],
  ['Interlocks','AND'],['START','STOP','SENSOR','OVERLOAD','LARGE'],['CONVEYOR','PUSHER']),
 def(T('Water tank · fill and transfer','Su tankı · dolum ve transfer'),3,
  T('Fill one batch of water up to the high level, then drain the tank. The switches come from the tank’s real simulated level.','Bir parti suyu üst seviyeye kadar doldur, ardından tankı boşalt. Şalterler tankın gerçek simülasyon seviyesinden gelir.'),
  [T('The cycle seals in with START; STOP or FAULT aborts the cycle.','START ile çevrim mühürlensin; STOP veya FAULT çevrimi iptal etsin.'),
   T('First fill with VALVE up to the HIGH level; then drain with PUMP down to the EMPTY level.','Önce VALVE ile HIGH seviyesine kadar doldur; sonra PUMP ile EMPTY seviyesine kadar boşalt.'),
   T('VALVE and PUMP must not run at the same time.','VALVE ve PUMP aynı anda çalışmasın.'),
   T('When draining is finished, DONE stays on. RESET clears the completion flag; a new START is required.','Boşaltma bitince DONE kalıcı yansın. RESET tamamlandı bilgisini temizlesin; yeni START gereksin.')],
  ['Sequence','Seal-in','Interlocks'],['START','STOP','RESET','FAULT','LOW','HIGH','EMPTY'],['VALVE','PUMP','DONE']),
 def(T('Paint mixing · two-component batch','Boya karıştırma · iki bileşenli parti'),4,
  T('Dose components A and B through separate valves. When both targets are reached, mix with the lid closed, then drain the product.','A ve B bileşenlerini ayrı valflerle dozajla. Hedefler tamamlanınca kapalı kapakta karıştır, sonra ürünü boşalt.'),
  [T('The cycle starts with START and LID_CLOSED; STOP, FAULT or an opened lid stops all outputs.','START ve LID_CLOSED ile çevrim başlasın; STOP, FAULT veya kapak açılması bütün çıkışları durdursun.'),
   T('DOSE_A runs until A_READY, DOSE_B runs until B_READY.','A_READY olana kadar DOSE_A, B_READY olana kadar DOSE_B çalışsın.'),
   T('When both components are complete, MIXER runs for {delay} ms; the dosing valves stay closed.','İki bileşen tamamlanınca MIXER {delay} ms çalışsın; dozaj valfleri kapalı kalsın.'),
   T('When mixing is finished, DRAIN opens. EMPTY latches DONE and all actuators stop.','Karıştırma bitince DRAIN açılsın. EMPTY ile DONE kalıcı yansın ve bütün aktüatörler dursun.'),
   T('RESET clears the completion flag. When the lid closes, there must be no restart without START.','RESET tamamlandı bilgisini temizlesin. Kapak kapanınca START olmadan yeniden çalışma olmasın.')],
  ['Sequence','Timers','Interlocks'],['START','STOP','RESET','FAULT','LID_CLOSED','A_READY','B_READY','EMPTY'],['DOSE_A','DOSE_B','MIXER','DRAIN','DONE']),
 def(T('Nut roasting · heating and cooling','Çerez kavurma · ısıtma ve soğutma'),5,
  T('Rotate the loaded drum to reach the 120 °C target, hold, cool and discharge. The training model is not a real product recipe.','Yüklü tamburu döndürerek 120 °C hedefine ulaş, beklet, soğut ve boşalt. Eğitim modeli gerçek ürün reçetesi değildir.'),
  [T('DRUM runs with START and LID_CLOSED; STOP, FAULT or an open lid aborts the cycle.','START ve LID_CLOSED ile DRUM çalışsın; STOP, FAULT veya açık kapak çevrimi iptal etsin.'),
   T('HEATER turns on while HOT is FALSE. The {delay} ms roasting time is counted from the first HOT signal.','HOT FALSE iken HEATER açılsın. İlk HOT sinyalinden itibaren {delay} ms kavurma süresi sayılsın.'),
   T('When the time is over, HEATER turns off; FAN runs until COOL while DRUM keeps rotating.','Süre sonunda HEATER kapansın; COOL olana kadar FAN çalışsın ve DRUM dönmeye devam etsin.'),
   T('With COOL, DISCHARGE opens; EMPTY latches DONE and the outputs stop.','COOL ile DISCHARGE açılsın; EMPTY ile DONE kalıcı yansın ve çıkışlar dursun.'),
   T('RESET clears the DONE flag. When the fault clears, there must be no restart without START.','RESET DONE bilgisini temizlesin. Arıza kalkınca START olmadan yeniden çalışma olmasın.')],
  ['Sequence','Timers','Interlocks','Temperature'],['START','STOP','RESET','FAULT','LID_CLOSED','HOT','COOL','EMPTY'],['DRUM','HEATER','FAN','DISCHARGE','DONE']),
 def(T('Two pumps · alternating duty','İki pompa · dönüşümlü çalışma'),4,
  T('Share the run count by selecting the other pump on every new demand. If the selected pump is faulty, use the healthy one.','Her yeni talepte diğer pompayı seçerek çalışma sayısını paylaş. Seçilen pompa arızalıysa sağlam pompayı kullan.'),
  [T('On the first DEMAND request PUMP_A runs. When the request ends, the next selection is B; the selection changes after every completed request.','İlk DEMAND talebinde PUMP_A çalışsın. Talep bitince sonraki seçim B olsun; her tamamlanan talepte seçim değişsin.'),
   T('While the demand stays TRUE, the selection must not change. Only one pump runs at a time.','Talep sürekli TRUE iken seçim değişmesin. Aynı anda yalnızca bir pompa çalışsın.'),
   T('FAULT_A or FAULT_B blocks the selected pump; the healthy pump takes over. With both faults, and with STOP, both outputs turn off.','FAULT_A veya FAULT_B seçilen pompayı engellesin; sağlam pompa devralsın. İki arızada ve STOP ile iki çıkış da kapansın.')],
  ['Edges','Interlocks','Alternation'],['DEMAND','STOP','FAULT_A','FAULT_B'],['PUMP_A','PUMP_B']),
 def(T('Conveyor · jam monitoring','Konveyör · sıkışma gözetimi'),4,
  T('If the photocell stays blocked for a long time on a running belt, a product may be jammed. When the time is up, raise a latched alarm.','Çalışan bantta fotosel uzun süre kapalı kalırsa ürün sıkışmış olabilir. Süre dolunca kilitli alarm üret.'),
  [T('CONVEYOR seals in with START; STOP and OVERLOAD cut the movement.','START ile CONVEYOR mühürlensin; STOP ve OVERLOAD hareketi kessin.'),
   T('If SENSOR stays active without interruption for {delay} ms during RUN, ALARM latches and CONVEYOR stops within the same scan.','RUN sırasında SENSOR kesintisiz {delay} ms aktif kalırsa ALARM kalıcı yansın ve CONVEYOR aynı scan içinde dursun.'),
   T('The alarm must not clear by itself when SENSOR clears. RESET clears the alarm only while SENSOR is FALSE.','SENSOR temizlenince alarm kendiliğinden silinmesin. RESET yalnızca SENSOR FALSE iken alarmı temizlesin.'),
   T('After the alarm reset, a new START is required.','Alarm resetinden sonra yeni START gereksin.')],
  ['Timers','Diagnostics','Seal-in'],['START','STOP','RESET','OVERLOAD','SENSOR'],['CONVEYOR','ALARM']),
 def(T('Motor · contactor feedback monitoring','Motor · kontaktör geri bildirim gözetimi'),4,
  T('When the motor command is given, the auxiliary contact FEEDBACK is expected. Detect a contactor that does not pull in, or feedback that is lost.','Motor komutu verildiğinde yardımcı kontaktan FEEDBACK beklenir. Çekmeyen kontaktörü veya kaybolan geri bildirimi algıla.'),
  [T('MOTOR runs with START; STOP or OVERLOAD stops it.','START ile MOTOR çalışsın; STOP veya OVERLOAD durdursun.'),
   T('If FEEDBACK stays missing without interruption for {delay} ms while RUN is active, ALARM latches and MOTOR stops.','RUN aktifken FEEDBACK kesintisiz {delay} ms gelmezse ALARM kalıcı yansın ve MOTOR dursun.'),
   T('If the feedback arrives in time, no alarm may occur; losing it during operation is supervised with the same time.','Geri bildirim zamanında gelirse alarm oluşmasın; çalışma sırasında kaybolması aynı süreyle denetlensin.'),
   T('RESET clears the alarm only while START is released. There must be no restart without a new START.','RESET yalnızca START bırakılmışken alarmı temizlesin. Yeni START olmadan yeniden çalışma olmasın.')],
  ['Timers','Diagnostics','Interlocks'],['START','STOP','RESET','OVERLOAD','FEEDBACK'],['MOTOR','ALARM']),
 def(T('4–20 mA · scaling and sensor diagnostics','4–20 mA · ölçekleme ve sensör teşhisi'),4,
  T('Convert the current CURRENT, given in engineering units, to a 0–100 % level. Check the module’s WIRE_BREAK diagnostic and the measuring range.','Mühendislik birimindeki CURRENT akımını 0–100% seviyeye çevir. Modülün WIRE_BREAK teşhisini ve ölçüm aralığını kontrol et.'),
  [T('Calculate LEVEL so that 4 mA → 0 %, 12 mA → 50 %, 20 mA → 100 %.','4 mA → %0, 12 mA → %50, 20 mA → %100 olacak şekilde LEVEL hesapla.'),
   T('VALID is active if CURRENT is within 4–20 mA and WIRE_BREAK is FALSE.','CURRENT 4–20 mA aralığındaysa ve WIRE_BREAK FALSE ise VALID aktif olsun.'),
   T('Outside the range, or when WIRE_BREAK is TRUE, ALARM lights up; LEVEL keeps its last valid value.','Aralık dışında veya WIRE_BREAK TRUE olduğunda ALARM yansın; LEVEL son geçerli değerini korusun.'),
   T('In this exercise CURRENT is given directly in mA; the raw encoding of a physical analog module is not used.','Bu alıştırmada CURRENT doğrudan mA cinsindedir; fiziksel analog modül ham kodlaması kullanılmaz.')],
  ['Analog','Diagnostics'],['WIRE_BREAK'],['VALID','ALARM']),
];

const entries=(lang:Lang)=>definitions.map((d,i)=>({id:i+1,title:pick(d.title,lang),level:d.level,concepts:d.concepts}));
export type CatalogEntry=ReturnType<typeof entries>[number];
// Catalog tables are built once per language so callers get a stable identity (cheap to use in memo dependencies).
const catalogs:Record<Lang,CatalogEntry[]>={en:entries('en'),tr:entries('tr')};
// English catalog, kept for code that does not care about the display language.
export const catalog=catalogs.en;
// i18n contract: concept ids stay stable English keys (stored in attempts, used for matching); only titles and concept labels are localized.
export const catalogFor=(lang:Lang):CatalogEntry[]=>catalogs[lang]??catalogs.en;

const conceptNames:Record<string,Text>={
 'AND':T('AND','AND'),
 'OR':T('OR','OR'),
 'Seal-in':T('Seal-in','Mühürleme'),
 'Interlocks':T('Interlocks','Kilitlemeler'),
 'Safety':T('Safety','Güvenlik'),
 'Timers':T('Timers','Zamanlayıcılar'),
 'Edges':T('Edges','Kenarlar'),
 'Counters':T('Counters','Sayıcılar'),
 'Sequence':T('Sequence','Sıralı kontrol'),
 'Analog':T('Analog','Analog'),
 'Hysteresis':T('Hysteresis','Histerezis'),
 'Temperature':T('Temperature','Sıcaklık'),
 'Alternation':T('Alternation','Dönüşümlü çalışma'),
 'Diagnostics':T('Diagnostics','Tanılama'),
};
// Display label of a concept id; an unknown id is shown as it is.
export const conceptLabel=(concept:string,lang:Lang)=>{const name=conceptNames[concept];return name?pick(name,lang):concept;};
// Every concept id used by the catalog (stable English ids, in first-use order).
export const conceptIds:readonly string[]=[...new Set(definitions.flatMap(d=>d.concepts))];

const commentInput=T('Digital input — TRUE: active','Dijital giriş — TRUE: aktif');
const commentOutput=T('Digital output','Dijital çıkış');
const commentMemory=T('Program memory','Program belleği');
const commentRaw=T('Simulated analog module · 0–27648','Simüle analog modül · 0–27648');
const commentTemp=T('Scaled value (°C)','Ölçeklenmiş değer (°C)');
const commentLevel=T('Process level (%)','Proses seviyesi (%)');
const commentProcessTemp=T('Process temperature (°C)','Proses sıcaklığı (°C)');
const commentCurrent=T('Current (mA), training value','Akım (mA), eğitim değeri');
const commentValidLevel=T('Valid level (%)','Geçerli seviye (%)');

// Three staged hints: the first asks a question, the second points at the technique, the third at the “Show Next Step” helper.
const hintSets:Record<'seal'|'timer'|'analog'|'general',[Text,Text]>={
 seal:[T('After the start button is released, which element can hold the run state?','Başlatma butonu bırakıldıktan sonra çalışma bilgisini hangi eleman koruyabilir?'),
  T('Parallel paths can let another condition keep conducting once the start condition drops out. Consider stop priority separately.','Paralel yollar, başlatma koşulu kalktığında başka bir koşulun iletimi sürdürmesine yardımcı olabilir. Durdurma önceliğini ayrıca değerlendir.')],
 timer:[T('Should the output follow the input immediately, or depend on the elapsed time?','Çıkış girişle hemen mi değişmeli, yoksa geçen zamana mı bağlı?'),
  T('TON represents the time of a continuous TRUE, TOF the time after the falling edge, TP a fixed pulse. Also check the reset condition.','TON sürekli TRUE süresini, TOF düşen kenardan sonraki süreyi, TP sabit darbeyi temsil eder. Reset koşulunu da incele.')],
 analog:[T('Which fraction of the raw range corresponds to the same fraction of the engineering range?','Ham aralığın hangi oranı, mühendislik aralığındaki aynı orana karşılık gelir?'),
  T('First find the ratio RAW / 27648.0; then multiply it by 150.0.','Önce RAW / 27648.0 oranını bul; sonra 150.0 ile çarp.')],
 general:[T('For each output, write down the enabling and the blocking conditions separately.','Her çıkış için izin veren ve engelleyen koşulları ayrı ayrı yaz.'),
  T('AND expresses all permissives; OR alternative paths; NC the inverse of a blocking condition.','AND bütün izinleri; OR alternatif yolları; NC engelleyici koşulun tersini ifade eder.')],
};
const hintStep=T('The Show Next Step button loads only one network of the reference program. Then test again.','Sonraki adım düğmesi referans programın yalnızca bir network’ünü yükler. Ardından yeniden test et.');

export function challenge(id:number,seed=0,lang:Lang='en'):Challenge{
 if(!Number.isInteger(id)||id<1||id>definitions.length||!Number.isInteger(seed)||seed<0||seed>999999)throw Error('Invalid challenge or seed');
 const d=definitions[id-1],{concepts,ins,outs}=d;const delay=(id===22?5000:id===23?8000:1000)+(seed%3)*500,preset=3+(seed%4);
 const params={delay,preset},say=(text:Text)=>pick(text,lang,params);
 const tags:Tag[]=[...ins.map((name,i)=>({name,type:'BOOL' as const,address:`%I${Math.floor(i/8)}.${i%8}`,initial:false,inputMode:(['START','STOP','RESET'].includes(name)?'momentary':'toggle') as 'momentary'|'toggle',comment:say(commentInput)})),...outs.map((name,i)=>({name,type:'BOOL' as const,address:`%Q0.${i}`,initial:false,comment:say(commentOutput)}))];
 ['RUN','SEQ','WAIT_DONE','CYCLE_DONE','TRIGGER','T1_Q','T2_Q','T3_Q'].forEach((name,i)=>tags.push({name,type:'BOOL',address:`%M0.${i}`,initial:false,comment:say(commentMemory)}));
 tags.push({name:'RAW',type:'INT',address:'%IW64',initial:0,comment:say(commentRaw)},{name:'TEMP',type:'REAL',address:'%MD20',initial:0,comment:say(commentTemp)});
 if(id>=21&&id<=23)tags.push({name:'LEVEL',type:'REAL',address:'%ID68',initial:0,comment:say(commentLevel)},{name:'PROCESS_TEMP',type:'REAL',address:'%ID72',initial:20,comment:say(commentProcessTemp)});
 if(id===27)tags.push({name:'CURRENT',type:'REAL',address:'%ID76',initial:4,comment:say(commentCurrent)},{name:'LEVEL',type:'REAL',address:'%MD24',initial:0,comment:say(commentValidLevel)});
 const hintSet=hintSets[concepts.includes('Seal-in')?'seal':concepts.includes('Timers')?'timer':concepts.includes('Analog')?'analog':'general'];
 return {id,seed,title:say(d.title),level:d.level,scenario:say(d.scenario),objectives:d.rules.map(say),concepts:[...concepts],tags,delay,preset,plant:id===21?'water':id===22?'mixer':id===23?'roaster':[11,12,20,25].includes(id)?'conveyor':[14,15,17,18].includes(id)?'tank':'motor',hints:[...hintSet.map(say),say(hintStep)]};
}
export function emptyProgram(c:Challenge):Program{return {version:1,cpu:'CPU 1214C DC/DC/DC',tags:c.tags,blocks:[{id:'OB1',kind:'OB',networks:[]},{id:'OB100',kind:'OB',networks:[]}]};}
