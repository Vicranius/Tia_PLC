# PLC Lab Web – S7-1200 Industrial Trainer

Ladder üzerinden çalışan, TIA Portal çalışma düzeninden esinlenmiş bağımsız PLC eğitim MVP’si. Siemens ürünü değildir; Siemens arayüz görselleri veya marka assetleri kullanılmaz.

## Çalışan kapsam

- TIA tarzı Portal view başlangıç ekranı: Start (proje aç, endüstriyel alıştırmadan yeni proje, First steps), Devices & networks, PLC programming, Visualization, Online & Diagnostics; Project view ile sol alttaki ◂ Portal view düğmesi arasında geçiş.
- Online izleme TIA program status kuralını izler: yeşil düz = koşul sağlandı, mavi kesikli = sağlanmadı, gri = son scan’de çalışmadı.
- Gri engineering workspace: Project / Edit / View / Insert / Online / Tools / Help menüleri, Project tree, OB1/OB100, Instructions ağacı, Properties ve alt araç panelleri.
- Üst komut paneli ve sağ instruction ağacından NO, NC, COIL, SET, RESET, R_TRIG, F_TRIG, TON, TOF, TP, CTU ve compare ekleme.
- Seri/paralel AST düzenleme, kontak taşıma, network sıralama/silme, açıklama, tag atama, undo/redo.
- MOVE, aritmetik, conversion, NORM_X/SCALE_X operand editörü.
- Web Worker içinde 10 ms deterministik scan; RUN, STOP, Pause, Single Scan ve hız seçenekleri.
- Online monitor, instruction trace, Why, scan öncesi/sonrası bellek, timer ET/PT/Q, counter CV/PV/Q.
- I/Q/M adres aliasları, big-endian BYTE/WORD/DWORD, signed INT/DINT, REAL, TIME ve BOOL.
- Conveyor ve tank için PLC çıkışlarıyla değişen proses, otomatik sensör geri beslemesi, takılı sensör seçimi.
- 20 challenge ailesi, parametrik gecikme/sayaç varyantları, sunucuda saklı zaman dizileri, referans doğrulaması.
- Kademeli ipucu, ağ bazında sonraki adım, tam referans, hata nedenleri, puanlama, transfer sorusu ve 17 modüllü öğrenme yolu.
- SQLite uyumlu D1 üzerinde proje ve deneme kaydı. Proje manuel Save ile saklanır; challenge değiştirirken mevcut çalışma da kaydedilir. Aynı tarayıcıdaki anonim HttpOnly oturum çerezi kaydı geri bulur. Çerez silinirse eski anonim kayda erişim kaybolur; JSON dışa aktarma taşınabilir yedektir.

## İlk motor devresini elle kurma

1. Üst panelden NC ekle. Kontağa tıkla; Properties içinden STOP tag’ini seç.
2. İkinci NC ekle, OVERLOAD ata.
3. NO ekle, START ata.
4. START kontağı seçiliyken Paralel düğmesine tıkla. Yeni NO kontağa MOTOR ata.
5. Bobinin MOTOR olduğundan emin ol. Compile → RUN.
6. Proses sekmesinden START’ı aç/kapat; mühürlemenin durumunu gözle. STOP veya OVERLOAD ile durdur.
7. Test et. İpucu kullanılmadığında doğru motor devresi beş testi geçer ve 100/100 alır.

Timer/CTU eklerken IN ve R kontaklarını ayrıca seçip tag atayın. Bobine tıklayarak çıkış tag’ini değiştirin. MOVE için sayısal hedef ve operand ağacını Properties içinde düzenleyin. Program RUN durumundayken düzenleme kilitlenir. Düzenleme simülasyon belleğini sıfırlar; kullanıcı bu sayede yeni programı temiz durumda başlatır.

## Geliştirme

Node.js >= 22.13.0 gerekir. Kaynak React + strict TypeScript, Vite/Vinext, Cloudflare Worker uyumlu server API ve D1 kullanır. UI state React hook’larıyla yönetilir; simülasyon React state’inden bağımsızdır.

```powershell
npm install
npm run db:local
npm run dev
```

Terminalin yazdığı yerel adresi açın. İlk yerel database kurulumu `db:local` ile yapılır. Mevcut geliştirme veritabanını yeniden oluşturmayın. `npm run db:generate` yeni şema değişikliği için migration üretir.

```powershell
npm run typecheck
npm test
# Yerel sunucu çalışırken:
npm run test:api
npm run build
```

`docs/TIA_FIDELITY_PLAN.md`: TIA Portal benzerliği için eksik analizi ve fazlı yol haritası.

`ARCHITECTURE.md`: mimari diyagramı, veri modelleri, AST, challenge/test formatları ve MVP listesi.

## Doğrulama

- 94 runtime/model testi: 20 challenge × 4 parametre seti, yanlış mühürleme/STOP, deterministik tekrar, timer sınırları, CTU edge/reset, memory alias, compiler, sıralı OB100, force, seri/paralel ekleme ve sürükleme.
- API entegrasyonu: bütün referansları sunucuda değerlendirme; saklı materyalin GET cevabında olmaması; save/restore; oturum izolasyonu; bozuk AST; değiştirilmiş I/O sözleşmesi; cross-origin red; açık çözüm isteği.
- Strict TypeScript ve production build.
- Tarayıcı ekran görüntüsü / otomatik tıklama testi yapılmadı. İstenen referans görsele göre UI oluşturuldu; bu bir görsel QA geçti iddiası değildir.
- İsteğe bağlı `inspect_ladder_program` WebMCP aracı feature detection ile kayıt olur. Bu ortamda desteklenen WebMCP doğrulama bağlamı bulunmadığından kayıt/çağrı tarayıcı içinde doğrulanmadı.

## Bilinçli MVP sınırları

- Donanım/firmware emülatörü değildir. CPU seçimi eğitim profili etiketidir; gerçek modelin bütün modül sınırları uygulanmaz. `%IW64` sanal analog modül adresidir.
- Çıkışlar eğitim amaçlı scan sonunda prosese aktarılır. Gerçek S7-1200 varsayılan cyclic image işlemesinin aşama sınırları birebir taklit edilmez. Timer durumu çağrıldığında sanal zamanla hesaplanır; CPU kesmeleri, iletişim yükü ve gerçek zaman garantileri yoktur.
- OB100 yalnızca runtime’ın ilk scan’inde yürür. OB30 preemption, FC/FB çağrıları, instance DB, UDT, RETAIN/TEMP arayüzleri ve PID sonraki fazlardır.
- CTD/CTUD ve tam sayısal instruction kapsamı henüz yoktur. LAD tek düzenleme dilidir. TIA `.ap*` import/export ve fiziksel PLC bağlantısı yoktur.
- Eğitmen ve problem generator doğrulanabilir kural/şablon tabanlıdır; harici LLM bağlı değildir. Tam güvenlik analizi veya her olası state-space için biçimsel ispat yapılmaz.
- E-Stop ve diğer emniyet örnekleri kontrol mantığı öğretir. Gerçek makinede safety PLC / safety relay ve uygun standartlara göre bağımsız emniyet tasarımı gerekir.

## Teknik referanslar

[Siemens scan cycle](https://docs.tia.siemens.cloud/r/simatic_s7_1200_manual_collection_enus_20/plc-concepts/execution-of-the-user-program/processing-the-scan-cycle-in-run-mode), [Siemens CTU](https://docs.tia.siemens.cloud/r/en-us/v21/scl-s7-1200-s7-1500-s7-1200-g2/counter-operations-s7-1200-s7-1500-s7-1200-g2/ctu-count-up-s7-1200-s7-1500-g2), [S7-1200 functional safety manual](https://support.industry.siemens.com/dl/files/552/104547552/att_896075/v1/s71200_f_user_manual_en-US_en-US.pdf).
