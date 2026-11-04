# Sürüm notları — SE Primer zorluk modeli

## v2.0 — 4 Kasım 2026

| | |
|---|---|
| Hugging Face reposu | https://huggingface.co/Kubra37/se-primer-zorluk |
| Etiket | `v2.0` |
| Commit | `28818c9b19f5ab928c1292ba930096f43def4446` |
| Sabit model URL'si | https://huggingface.co/Kubra37/se-primer-zorluk/resolve/28818c9b19f5ab928c1292ba930096f43def4446/model.onnx |
| Sabit config URL'si | https://huggingface.co/Kubra37/se-primer-zorluk/resolve/28818c9b19f5ab928c1292ba930096f43def4446/config.json |
| Uygulamadaki kaynak | `src/primer/modelKaynak.ts` (`MODEL_SURUM`, `MODEL_COMMIT`, `MODEL_URL`, `CONFIG_URL`) |
| Model kartı | `model/README.md` (Hub'daki README ile aynı) |

### Ne değişti?

- **v1 (sabit kural):** Hangi konunun sorulacağına `konuSec` karar veriyordu ve o konudaki soru da kuralla
  seçiliyordu. Sorunun kolay mı zor mu olacağı öğrenciye göre değişmiyordu.
- **v2.0 (zorluk modeli):** Konuyu yine `konuSec` seçer. Model yalnız 1. soru (aşama) ve 3. soru (zayıf konu) için
  o konudan **kolay mı zor mu** soru geleceğine karar verir. `p(basari) >= 0.5` ise zor soru gelir (spec §10.3).
  2. soru (değişiklik tetikli) eski kuralla seçilir.
- Model: `StandardScaler → LogisticRegression(random_state=13)`, 7 girdi (spec §10.2), ONNX.
- Eval kapısı (spec §10.6) eğitimden önce yazıldı: `StratifiedGroupKFold(5)`, grup `proje_id`, ortalama
  ROC-AUC >= 0.65. Sonuç **0.7693** (std 0.0738), kapı geçti. Ayrıntılar ve sınırlar model kartında.
- Yayınlama: `scripts/yayinla.py`. Doğrulama: sabit commit'ten indirilen `model.onnx`, `config.json`'daki örnek
  girdiyle yerel `model/model.onnx` ile aynı olasılığı veriyor (0.19479504, fark 0; dosya md5'leri aynı).
  Tekrar denemek için: `.venv\Scripts\python scripts/yayinla.py --dogrula`.
- **Uygulamada:** `src/primer/model.ts` modeli açılışta bir kez, `modelKaynak.ts`'teki commit'e sabit URL'den
  onnxruntime-web ile yükler. Sorular seçilirken model en fazla ~3 sn beklenir; hazır değilse ya da `config.json`'daki
  özellik sırası koddakiyle aynı değilse eski `konuSec` çalışır (spec §10.5). `?veri=1`'de seçim yazı-turayla
  sürer; model yalnız `p_model`'e yazar (Shadow). Cypress: spec §10.7 örnek 8, 9, 10 (`e2e/cypress/e2e/model.cy.js`).

### Bilinen sınırlar

- **Yeni öğrenci, beceri puanı 2 olan konularda zor soru alır.** Tanışmadaki varsayılanlarla (seviye 0, ilk oturum)
  model 8 konunun 4'ünde `p >= 0.5` veriyor: beceri 2 olan konularda p ≈ 0.59, beceri 1'de ≈ 0.44, beceri 0'da
  ≈ 0.31. Bu, modelin çıktısıdır; eşik ya da model sonradan ayarlanmadı. Kesin değerler model kartında ve
  `config.json` → `metrics.bilgi_varsayilan_yeni_oyuncu`'da.
- **3. soru için eğitim–sunum farkı (training-serving skew).** Sorular oturum başında seçilir (spec §10.3). Bu yüzden
  uygulamada 3. sorunun p'si `son_karar_suresi_sn` ve `son_gerekce_uzunlugu` için **önceki oturumun son cevabını**
  kullanır. Eğitim verisinde ise 3. satırın bu iki girdisi **aynı oturumdaki 2. cevaptan** gelir; çünkü veri modunda
  özellikler soru gösterilirken ölçülür. 1. soru ve diğer 5 girdi iki durumda da aynıdır.
  - Ölçüm (`config.json` → `metrics.bilgi_egitim_sunum_farki`): 254 satırlık 3. soru verisinde p ortalama 0.072
    (en fazla 0.31) değişiyor; 26 satırda zorluk kararı değişiyor (19 gerçek satırın 1'inde).
  - Veri modundaki `p_model` her satırın kendi gösterim anındaki girdileriyle hesaplanır, yani eğitimle tutarlıdır.
    Bu yüzden Shadow değerlendirmesi ("model zor dediğinde öğrenci başardı mı") geçerlidir.
  - Eğitimde ve sunumda özelliklerin aynı değeri vermesi ML Test Score'da ayrı bir kontroldür (Breck vd., 2017).
  - **v3 için not:** 3. soru 2. cevaptan sonra seçilirse fark ortadan kalkar. Bunun bedeli, 3. sorunun oturum başında
    hazırlanamaması (soru uyarlama isteği oturum ortasına kayar).

## Geri alma (rollback)

1. **Önceki sürüme dönmek:** `src/primer/modelKaynak.ts`'te `MODEL_COMMIT`, `MODEL_URL` ve `CONFIG_URL` önceki
   sürümün commit hash'ine çevrilir. Bu değişiklik commit'lenip push'lanınca Pages yeniden yayınlanır.
   Hub'da hiçbir şeyin silinmesi ya da yeniden yüklenmesi gerekmez.
2. **Model hiç yüklenemezse:** spec §10.5'teki yedek zaten devrede. Ağ hatası, dosya yok ya da çıkarım hatası
   olursa eski `konuSec` kuralı değişmeden çalışır; uygulama çökmez, kullanıcıya hata gösterilmez. Modeli
   tamamen kapatmak için de aynı yol kullanılır: model yüklenmezse uygulama v1 davranışına döner.

**Neden `main`'e değil commit'e sabitliyoruz?** Hugging Face model reposu bir git reposudur. Yeni bir yükleme yeni
bir commit oluşturur; eski commit'ler ve dosyaları silinmez, `resolve/<commit>/` URL'leri çalışmaya devam eder.
(İstisna: repo silinirse ya da geçmiş bilerek sıkıştırılırsa, örn. `super_squash_history`. Bu repoda ikisi de
yapılmaz.)

- `resolve/main/` kullanılsaydı, Hub'a yapılan her yükleme uygulamaya **habersizce** girerdi. Hangi kullanıcının
  hangi modeli çalıştırdığı bilinemez, kötü bir sürüme "geri dönmek" için de Hub'ı yeniden düzenlemek gerekirdi.
- Commit'e sabitlendiğinde, uygulamanın kullandığı model sürümü uygulamanın kendi git geçmişinde (`modelKaynak.ts`)
  kayıtlı olur. Kod ile model birlikte sürümlenir (konfigürasyon yönetimi; Sommerville Bl. 25). Geri dönüş tek
  satırlık bir değişikliktir ve her zaman aynı dosyayı indirir.
- `v2.0` etiketi insanlar için okunur bir addır. Uygulama yine de etikete değil commit hash'ine bağlanır, çünkü
  etiket taşınabilir ama commit hash'i değişmez.

## Yeni sürümü güvenle devreye alma

Uygulamanın sunucusu ve kullanıcı hesabı yok, telemetri de toplanmıyor (KVKK; spec kapsam dışı). Bu yüzden ölçüm,
gönüllülerin **Veri Toplama Modu**'nda (`?veri=1`) indirip gönderdiği anonim CSV'lerle yapılır (`data/ham/`,
`scripts/birlestir.py`). Model kullanıldığında `p_model` sütunu doldurulur.

### 1. Shadow (gölge)

- `?veri=1`'de zorluk **yazı-turayla** seçilmeye devam eder (spec §10.4). Model çalışır ama karar vermez; yalnız
  tahminini `p_model` sütununa yazar.
- Öğrenciye gösterilen soru modelden etkilenmediği için, gerçek veride "model zor dediğinde öğrenci başardı mı"
  yansız olarak kıyaslanabilir:
  - zor satırlarda `p_model` ile `basari` arasındaki ROC-AUC (kapıdaki 0.65 ile aynı ölçü),
  - `p_model >= 0.5` olan zor satırlarda başarı oranı ile `p_model < 0.5` olanlardaki başarı oranı.
- **Geçiş koşulu:** yeni gerçek veride (en az 15 oturum, birden çok oyuncu) shadow AUC >= 0.65 ve iki grubun başarı
  oranı beklenen yönde ayrışıyor. Sağlanmazsa model devreye girmez; yazı-tura/kural devam eder.

### 2. Canary (kanarya, ~%6)

- Normal modda, **`oturum_id`'nin ilk hex karakteri `0` olan** oturumlar yeni modeli kullanır: 16'da 1, yaklaşık
  %6. `oturum_id` her oturumda rastgele üretildiği için atama kişiden bağımsızdır ve yeni bir kimlik gerektirmez.
- Diğer oturumlar önceki sürümle (v2.0'dan önce eski kural) çalışır. `MODEL_COMMIT` sabit kaldığı için iki grup
  arasındaki tek fark modeldir.
- Not: aynı öğrenci bir oturumda kanaryada, sonrakinde değil olabilir. Bu, oturum düzeyinde kıyas için yeterlidir.

### 3. Progressive (aşamalı geçiş)

| Adım | Yeni modeli kullanan oturumlar (`oturum_id`'nin ilk hex karakteri) | Pay |
|---|---|---|
| Canary | `0` | %6,25 |
| %25 | `0`–`3` | %25 |
| %50 | `0`–`7` | %50 |
| %100 | hepsi | %100 |

**Her adımda izlenenler** (yeni model grubu ve eski kural grubu ayrı ayrı):

- zor soru başarı oranı (`soru_zorlugu = 1` satırlarda `basari` ortalaması),
- oturum terk oranı: başlayıp 3. soru cevaplanmadan bırakılan oturumlar (veri modunda yalnız tamamlanan oturumlar
  satır ürettiği için bu sayaç ayrıca eklenmeli),
- modelin yüklenememe ya da çıkarım hatası oranı (yedeğe düşme sayısı),
- `p_model` ile `basari` arasındaki AUC ve `p_model`'in dağılımı (hep 0.5'in altı ya da hep üstü ise model fiilen tek
  zorluk seçiyordur).

**Geri alma (rollback) koşulları:**

- yeni model grubunda zor soru başarı oranı eski kural grubuna göre belirgin düşüyor (ör. 10 puandan fazla),
- oturum terk oranı artıyor,
- yükleme/çıkarım hataları sık (yedek devrede olsa da yeni sürüm fiilen çalışmıyor demektir),
- yeni gerçek veride `p_model` AUC'si kapı eşiğinin (0.65) altına iniyor.

Geri alma, bir önceki adımın hex aralığına dönmek ya da `MODEL_COMMIT`'i önceki sürüme çevirmektir.

## Mimari dağıtım kararı ve ödünleşim matrisi

| | Tarayıcı (onnxruntime-web, GitHub Pages) | Mobil cihaz içi (Expo, gömülü ONNX) | Kendi sunucu (Render / Rails / Express) |
|---|---|---|---|
| **1. Ağ zorunlu mu, gecikme nasıl?** | İlk açılışta `model.onnx` ve onnxruntime-web indirilir (ilk yükleme gecikmesi). **Ölçülmüş örnek:** onnxruntime-web'in wasm dosyası 14.8 MB (gzip 3.9 MB); `model.onnx` yalnız 573 B. Sorular seçilirken model en fazla ~3 sn beklendiği için yavaş bağlantıda ilk oturum eski kurala düşer, sonraki oturumlar (dosya önbellekte) modeli kullanır. Sonra tahmin yereldir, ağ gerekmez. Ağ yoksa §10.5 yedeği çalışır. | İnternetsiz çalışır. Model uygulamayla gelir, gecikme en düşük. Yeni model için uygulama güncellemesi gerekir. | Her tahmin bir ağ isteğidir. Ağ gecikmesi ve ücretsiz katmanda uyuyan sunucunun ilk istekte uyanma gecikmesi var. Ağ yoksa tahmin yok. |
| **2. Veri cihazdan çıkar mı? (KVKK)** | Çıkmaz. 7 girdi tarayıcıda hesaplanır ve orada kalır. | Çıkmaz. | Çıkar. Öğrencinin davranış verisi (beceri puanı, karar süresi, riskli seçim sayısı) her istekte sunucuya gider; saklama, erişim ve aydınlatma yükümlülüğü doğar. |
| **3. Model gizli kalır mı? (REA riski)** | Kalmaz; `model.onnx` istemciye iner ve açılıp okunabilir. | Kalmaz; uygulama paketinden çıkarılabilir. | Dosya gizli kalır, ama istek-yanıt üzerinden çok sayıda sorgu ile model taklit edilebilir (tersine mühendislik). |

**Seçim: tarayıcı (onnxruntime-web).**

- **Öğrenci verisi cihazdan çıkmaz.** Bu, v1'deki "hesap ve bulut kaydı yok" kararıyla tutarlıdır: SE Primer'de
  proje kartı ve oturumlar zaten yalnız tarayıcının `localStorage`'ında tutuluyor. Sunucu seçeneği bu kararı bozar ve
  KVKK yükümlülüğü getirirdi.
- **Model gizliliği kaybı yok.** Model zaten public Hugging Face reposunda; tarayıcıya inmesi yeni bir sızıntı değil.
  Bu modelde gizlenecek bir ticari değer de yok: 7 katsayılı bir lojistik regresyon ve katsayıları model kartında
  yazılı.
- **Uygulama zaten GitHub Pages'te statik.** Sunucu gerekmez, ücretsiz kalır. Model yüklenemezse §10.5 yedeği
  çalışır.
- **Bedeli:** ilk açılıştaki indirme gecikmesi (wasm 14.8 MB, gzip 3.9 MB) ve modelin herkese açık olması.
  Daha küçük bir derleme yok: uygulama zaten yalnız WebAssembly arka ucunu (`onnxruntime-web/wasm`, WebGPU/WebGL yok)
  ve onun en küçük wasm'ını kullanıyor; diğer varyantlar daha büyük (jspi 17.9 MB, asyncify 28.7 MB, jsep 29.5 MB). Mobil (Expo) seçeneği internetsiz
  çalışırdı ama her model sürümü için mağaza güncellemesi gerektirir. Ayrıca bu projede mobil uygulama yok.

## Kaynaklar

- Amershi, S. vd. (2019). *Software Engineering for Machine Learning: A Case Study.* ICSE-SEIP 2019.
  (Makine öğrenmesi yaşam döngüsünün veri toplamadan izlemeye dönen döngüsel yapısı.)
- Shankar, S. vd. (2022). *Operationalizing Machine Learning: An Interview Study.* arXiv:2209.09125.
  (Üretimdeki üç ana dert: Velocity, Validation, Versioning — 3V.)
- Mitchell, M. vd. (2019). *Model Cards for Model Reporting.* FAT* 2019. (Model kartı: `model/README.md`.)
- Breck, E. vd. (2017). *The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction.*
  IEEE BigData 2017. (Eval kapısı, ONNX ↔ sklearn eşdeğerlik ve parite testi, geri alma.)
- Sommerville, I. *Software Engineering*, 10. baskı, Bölüm 25: Configuration Management.
  (Model sürümünün kodla birlikte `modelKaynak.ts`'te sürümlenmesi, etiketler, geri dönüş.)
