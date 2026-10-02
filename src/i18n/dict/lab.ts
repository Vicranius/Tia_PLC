import {defineDict} from '../core';

// Status messages produced by the lab state hook (useLab).
export const labDict=defineDict({
 'start':'Select a path in Network 1 and insert your first contact from the Instructions task card.',
 'failed':'The operation could not be completed',
 'progress':'Progress could not be read: {error}','simulation':'The simulation could not be started: {error}',
 'restored':'Your saved LAD project was restored.','storage':'Storage service: {error}. You can keep editing the LAD program.',
 'compileErrors':'{n} compile error(s). See Info › Compile in the inspector window.',
 'saved':'LAD project saved. It is restored with this browser session.','loadTimeout':'Download failed: PLC_1 did not confirm the load.',
 'debug':'Debug exercise: STOP does not stop the motor in some cases. Find the faulty path and fix it.','ready':'New exercise ready. Build the LAD program with the Instructions task card.',
 'passed':'All tests passed. Now transfer this logic to another process.','failedTests':'Review the input sequence of the failing test and the logic explanation.',
 'nextStep':'A reference network was added. Examine its effect with Single scan.','allShown':'All networks of the reference are shown.','reference':'Reference LAD loaded. See the explanations in Info › Instructor.',
 'reset':'Exercise reset to one empty network. Undo brings back the previous program.',
},{
 'start':'Network 1’de bir yol seç ve ilk kontağını Komutlar görev kartından ekle.',
 'failed':'İşlem tamamlanamadı',
 'progress':'İlerleme okunamadı: {error}','simulation':'Simülasyon başlatılamadı: {error}',
 'restored':'Kaydedilmiş Ladder projen geri yüklendi.','storage':'Kayıt servisi: {error}. Ladder düzenlemeye devam edebilirsin.',
 'compileErrors':'{n} derleme hatası var. Denetçi penceresinde Bilgi › Derleme bölümünü incele.',
 'saved':'Ladder projesi kaydedildi. Bu tarayıcıdaki oturumla geri yüklenir.','loadTimeout':'Yükleme başarısız: PLC_1 yüklemeyi onaylamadı.',
 'debug':'Hata ayıklama alıştırması: STOP bazı koşullarda motoru durdurmuyor. Hatalı yolu bul ve onar.','ready':'Yeni alıştırma hazır. Ladder programını Komutlar görev kartıyla kur.',
 'passed':'Tüm testler geçti. Şimdi bu mantığı başka bir prosese taşı.','failedTests':'Başarısız testin giriş sırasını ve mantık açıklamasını incele.',
 'nextStep':'Bir referans network eklendi. Etkisini Tek tarama ile incele.','allShown':'Referansın tüm network’leri gösterildi.','reference':'Referans Ladder yüklendi. Açıklamaları Bilgi › Eğitmen bölümünde incele.',
 'reset':'Alıştırma boş bir network ile sıfırlandı. Geri al ile önceki programa dönebilirsin.',
});
