// Server-side (API, evaluator) text. Exercise text and test-step reasons carry both languages inline in
// src/challenges/private.ts; everything else the API says is in this dictionary.
import {defineDict} from '../core';
export const serverDict=defineDict({
 // API errors (app/api/lab/route.ts)
 errOrigin:'Origin mismatch',
 errSize:'Program size limit exceeded',
 errBody:'The request body is not valid JSON.',
 errChallenge:'Invalid challenge or seed',
 errAction:'Unknown action',
 errIndex:'Invalid network step',
 errHints:'Invalid hint count',
 errContract:'The challenge I/O contract cannot be changed: {name}. Restore its address, type and initial value.',
 // Evaluator: test results and feedback
 passMessage:'Input sequence and timing limits verified.',
 why:'At {at} ms, {tag} was expected to be {expected} but was {actual}.',
 whyError:'The program could not be executed to the end of this test.',
 impactSafety:'In a real plant this could cause unexpected motion or equipment damage.',
 impactProcess:'The work sequence, product quality or cycle time could be affected.',
 okWhat:'The program passed all behavior and fault sequences.',
 okWhy:'The scan order and the time-dependent expectations were met.',
 okImpact:'You can carry the same concept over to a different industrial problem.',
 okQuestion:'How would you adapt this control logic for a pump or a fan?',
 // Solution reveal
 solNetwork:'{n}. {title}. Networks run from top to bottom; values written by an earlier network can be read by a later network in the same scan.',
 solScan:'Inputs are copied into the process image. The OB1 networks are executed in order. Timer and counter states are evaluated when the instruction is called; outputs are written to the process at the end of the scan.',
 solWhy:'This reference passed every start-up, transition, time-limit and fault scenario.'
},{
 errOrigin:'İstek kaynağı eşleşmiyor',
 errSize:'Program boyutu sınırı aşıldı',
 errBody:'İstek gövdesi geçerli bir JSON değil.',
 errChallenge:'Challenge/seed geçersiz',
 errAction:'Bilinmeyen işlem',
 errIndex:'Network adımı geçersiz',
 errHints:'İpucu sayısı geçersiz',
 errContract:'Challenge I/O sözleşmesi değiştirilemez: {name}. Adres, tür ve başlangıç değerini geri yükle.',
 passMessage:'Giriş sırası ve zaman sınırları doğrulandı.',
 why:'{at} ms anında {tag} beklenen={expected}, gerçekleşen={actual}.',
 whyError:'Program bu testin sonuna kadar çalıştırılamadı.',
 impactSafety:'Gerçek bir sistemde beklenmeyen hareket veya ekipman hasarı doğurabilir.',
 impactProcess:'İş sırası, ürün kalitesi veya çevrim süresi bozulabilir.',
 okWhat:'Program tüm davranış ve arıza dizilerini geçti.',
 okWhy:'Scan sırası ve zamana bağlı beklentiler sağlandı.',
 okImpact:'Aynı kavramı farklı bir endüstriyel probleme taşıyabilirsin.',
 okQuestion:'Bu kontrol mantığını bir pompa veya fan için nasıl uyarlarsın?',
 solNetwork:'{n}. {title}. Network’ler yukarıdan aşağı çalışır; önceki network yazıları aynı scan içinde sonraki network tarafından okunabilir.',
 solScan:'Girişler process image içine alınır. OB1 network’leri sırayla yürütülür. Timer/counter durumları çağrıda hesaplanır; çıkışlar scan sonunda prosese uygulanır.',
 solWhy:'Bu referans, başlangıç, geçiş, zaman sınırı ve arıza senaryolarının tamamını geçti.'
});
export type ServerKey=keyof typeof serverDict.en;
