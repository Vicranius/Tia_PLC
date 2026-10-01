import {defineDict} from '../core';

// UI strings of the Learning view and the exercise panel. Exercise/curriculum text itself lives in the data
// (src/challenges/catalog.ts, src/learning/curriculum.ts) as {en,tr} pairs.
export const learningDict=defineDict({
 'learning.title':'Learning path',
 'learning.flow':'Theory → guided exercise → independent problem → industrial exercise → debugging',
 'learning.openExercise':'Open the ladder exercise →',
 'learning.attempts.one':'{count} attempt','learning.attempts.other':'{count} attempts',
 'learning.module':'MODULE {n}',
 'learning.note':'First write down the expected input and output sequence. Then build the ladder; check your assumption with Single Scan and Why mode.',
 'learning.guided':'Open guided exercise','learning.variant':'Independent variant','learning.industrial':'Industrial exercise','learning.debug':'Debugging exercise',
 'exercise.heading':'Exercise {n} — {title}','exercise.list':'Exercises','exercise.io':'Inputs / Outputs','exercise.behavior':'Required behavior',
 'exercise.run':'▷ Start Simulation','exercise.test':'✓ Test Solution','exercise.reset':'↶ Reset exercise',
},{
 'learning.title':'Öğrenme yolu',
 'learning.flow':'Teori → rehberli alıştırma → bağımsız problem → endüstriyel alıştırma → hata ayıklama',
 'learning.openExercise':'Ladder alıştırmasını aç →',
 'learning.attempts.one':'{count} deneme','learning.attempts.other':'{count} deneme',
 'learning.module':'MODÜL {n}',
 'learning.note':'Önce beklenen giriş ve çıkış dizisini yaz. Sonra Ladder’ı kur; Tek tarama ve Why moduyla varsayımını kontrol et.',
 'learning.guided':'Rehberli alıştırmayı aç','learning.variant':'Bağımsız varyant','learning.industrial':'Endüstriyel alıştırma','learning.debug':'Hata ayıklama alıştırması',
 'exercise.heading':'Alıştırma {n} — {title}','exercise.list':'Alıştırmalar','exercise.io':'Girişler / Çıkışlar','exercise.behavior':'Beklenen davranış',
 'exercise.run':'▷ Simülasyonu başlat','exercise.test':'✓ Çözümü test et','exercise.reset':'↶ Alıştırmayı sıfırla',
});
