# SE Primer

> YZM301 · Kişiye uyum sağlayan kitap, yazılım mühendisi için.

SE Primer, yazılım mühendisliği öğrencisinin kendi projesini tanıyan ve proje büyüdükçe ona projesi hakkında
sorular soran bir öğrenme asistanı. Her girişte "Ne değişti?" diye sorar. Projenin aşamasına, yapılan
değişikliklere ve öğrencinin zayıf olduğu konulara göre 3 soru seçer. Cevabı söylemez: seçenek sunar, seçilen
yolun sonucunu ve nedenini gösterir. Proje bitene kadar öğrencinin gelişimini kaydeder.

İlham: Neal Stephenson, *The Diamond Age*. Okuyan çocuğa göre kendini yeniden yazan kitap.

## Linkler

| | |
|---|---|
| Uygulama (AI Studio) | https://ai.studio/apps/8074a940-e9fe-4c74-96fc-ff23a83151f5?fullscreenApplet=true|
| Demo videosu (60 sn, Cypress) | https://youtu.be/ScYtHzTFs4Q |
| Hugging Face model (v2.0.1, commit'e sabit) | https://huggingface.co/Kubra37/se-primer-zorluk/tree/576e42b0e833d418d13c3fe9e528e4194466b8f5 |

> **Erişim notu:** Uygulama AI Studio'da paylaşıldı. Bazı Google hesaplarında yaş doğrulaması ya da AI Studio
> kullanım şartlarının kabul edilmemiş olması nedeniyle link açılmayabilir. Açılmazsa e-posta adresinizi
> bildirmeniz yeterli, erişim eklerim.

## Repo yapısı

```
spec.md                      Problem, kapsam, soru seçme kuralları, kabul örnekleri, akış şeması
DESIGN.md                    Stitch'ten dışa aktarılan tasarım sistemi (Tome & Terminal)
docs/
  ekranlar/                  Stitch ekran tasarımları
  soru-bankasi.json          8 konu, 23 soru: tetik koşulları, seçenekler, risk, sonuç, neden
  eval/tutor-eval.md         Tutor değerlendirmesi: 20 mesaj, etiketler, iki koşu
e2e/
  cypress.config.js
  cypress/e2e/primer.cy.js   7 uçtan uca test
  cypress/e2e/demo.cy.js     Altyazılı demo senaryosu
src/ ...                     AI Studio ile üretilen uygulama kodu
data/
  oturumlar.csv              Eğitim verisi (gerçek + sentetik), birlestir.py üretir
  sentetik.csv               Sentetik oyuncular, sentetik.py üretir
  ham/                       Oyunculardan gelen ham CSV'ler (veri modu → "Veriyi CSV indir")
  SOZLUK.md                  Veri sözlüğü
scripts/
  sentetik.py                Sentetik veri üreticisi (seed = 13)
  birlestir.py               data/ham/*.csv + data/sentetik.csv → data/oturumlar.csv
train.py                     Eğitim + eval kapısı (spec §10.6) + ONNX paketi
scripts/yayinla.py           model/ → Hugging Face (v2.0 etiketi, commit'e sabit URL, doğrulama)
src/primer/modelKaynak.ts    Uygulamanın kullandığı model sürümü ve commit'e sabit URL'ler
RELEASE.md                   Sürüm notları, geri alma, devreye alma planı, ödünleşim matrisi
tests/
  parite.py                  Diferansiyel test kahini (Python + onnxruntime) → parite.json
  parite.json                5 referans girdi ve Python'un p(basari) değerleri
src/components/PariteScreen.tsx  ?parite=1: aynı girdiler uygulamanın model.ts'iyle (onnxruntime-web)
requirements.txt             Python 3.12 bağımlılıkları (sürümler sabit)
model/
  model.onnx                 Zorluk modeli (train.py üretir)
  config.json                Özellik sırası, sınıflar, metrikler, eşik (sözleşme)
  README.md                  Model kartı
```

## Model (Python 3.12)

Kurulum ve eğitim (Windows, proje kökünde):

```
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python train.py
```

`train.py` eval kapısını geçemezse (`model/`'e hiçbir şey yazmadan) hata koduyla durur. macOS/Linux'ta
`.venv\Scripts\python` yerine `.venv/bin/python` kullanılır. Python 3.12 kullanılır
(başlangıç reposuyla aynı; Python 3.15 için onnxruntime paketi yok).

**Modelin davranışı (bilgi):** Tanışmadaki varsayılanlarla yeni bir öğrenci (seviye 0, ilk oturum), beceri puanı 2
olan konularda p ≈ 0.59 alır ve **zor** soru görür; beceri 0–1 olan konularda kolay soru görür (8 konunun 4'ünde zor).
Bu, modelin kendi çıktısıdır; eşik (0.5) ya da model buna göre ayarlanmadı. Ayrıntı ve diğer sınırlar: `model/README.md`
ve `RELEASE.md` → "Bilinen sınırlar".

## Veri

```
.venv\Scripts\python scripts/sentetik.py     # data/sentetik.csv (her çalıştırmada aynı dosya)
.venv\Scripts\python scripts/birlestir.py    # data/oturumlar.csv
```

**Sentetik veri:** üretici `scripts/sentetik.py`, **tohum `SEED = 13`** (tek bir `random.Random(13)`).
45 sahte oyuncu var (seviye 0/1/2'den 15'er). Her oyuncu 4–6 oturum oynar, her oturumda 3 soru, toplam 705 satır.
Sorular uygulamanın `konuSec` kuralıyla seçilir. Slot 1 ve 3'te istenen zorluk yazı-turayla belirlenir; slot 2
bankadaki zorluğuyla gelir. Girdiler (beceri puanı, önceki soru ve riskli sayısı, son karar süresi ve gerekçe
uzunluğu, oturum no) uygulamadaki mantıkla oyuncunun önceki satırlarından hesaplanır. Etiket şu olasılıkla çekilir:

```
z = -0.4 + 0.5*seviye + 0.45*(konu_beceri_puani - 2.5) - 0.7*konudaki_onceki_riskli_sayisi
    + 0.15*oturum_no + 0.01*son_gerekce_uzunlugu - 0.04*max(0, 8 - son_karar_suresi_sn)
p(basari=1) = sigmoid(z)        zor satır
p(basari=1) = sigmoid(z + 1.2)  kolay satır
```

Kuralın tamamı (karar süresi ve gerekçe uzunluğu dağılımları dahil) `scripts/sentetik.py`'nin başındaki yorumdadır.

## Nasıl çalışır?

1. **Tanışma:** Seviye, rol, öğrenme hedefi ve proje bilgileri (aşama, teknoloji, veri tabanı, mimari, kişisel veri, klasör yapısı). Bunlardan **Proje Kartı** oluşur.
2. **Ne değişti?:** Sonraki girişlerde öğrenci yaptığı değişiklikleri işaretler (yeni özellik, veri tabanı, test, yayın, hata…).
3. **3 soru:** Hangi konunun sorulacağına **kod** karar verir (aşama, değişiklik, zayıf konu), soru metnini **Gemini** öğrencinin projesine uyarlar. Yapay zekâ çalışmazsa bankadaki orijinal soru kullanılır.
4. **Projem:** Oturum sonucu (Sağlıklı / Risk var), açık riskler, beceri haritası, karar kaydı. Proje bitince proje karnesi.

Seçimi koda, metni yapay zekâya bırakmanın nedeni: seçim açıklanabilir, test edilebilir ve yapay zekâ olmadan da çalışır.

## Testleri çalıştırma

```bash
# 1. pencere: uygulama
npm install --legacy-peer-deps
npm run dev

# 2. pencere: testler
cd e2e
npm install
npx cypress run --browser chrome                                   # 6 test
npx cypress run --browser chrome --spec cypress/e2e/demo.cy.js     # demo videosu
```

Testlerde yapay zekâ çağrıları hata döndürecek şekilde sabitlenir. Uygulama soru bankasına döner, böylece her koşu aynı sonucu verir. Seçeneklerin sırası her soruda karışık geldiği için testler seçeneği harfine göre değil, `data-risk` niteliğine (düşük / orta / yüksek) göre seçer.

**Sonuç:** 7 / 7 test geçti.

| # | Test |
|---|---|
| 1 | Hep düşük riskli seçim → yeni açık risk eklenmez |
| 2 | Riskli seçimler → "İncelenmesi Gereken Mimari Riskler Var" |
| 3 | Seçim yapılmadan "Devam" pasif, seçince aktif |
| 4 | "Veri tabanı yapısı değiştirildi" → V-01 sorusu gelir |
| 5 | Oturumdan sonra yeni oturum "Ne değişti?" ile başlar |
| 6 | Proje sayfa yenilenince kaybolmaz, tanışma tekrar gelmez |
| 7 | Seçimden önce risk ve puan bilgisi görünmez, seçimden sonra görünür (kullanıcı testinden eklendi) |

**Test sırasında bulunan bir sorun:** İlk testte "hep düşük riskli seçim → sağlıklı" bekledik. Örnek proje 3 açık riskle başladığı için kurala göre sonuç "risk" çıktı. Test, spec'teki kuralı (açık risk sayısı azalmalı) yanlış yorumluyordu. Beklenti "yeni risk eklenmez" olarak düzeltildi.

## Diferansiyel test (parite)

Aynı model dosyası iki farklı ortamda aynı girdilere aynı cevabı vermeli.

- **Test kahini (oracle):** Python + onnxruntime (`tests/parite.py`). Modeli Hugging Face'teki sabit commit'ten
  (`modelKaynak.ts`) indirir. sha256'sını `model/model.onnx` ve Cypress fixture'ı ile karşılaştırır; farklıysa durur.
  5 referans girdinin `p(basari)` değerini `tests/parite.json`'a yazar.
- **Test edilen:** tarayıcı. `?parite=1` sayfası aynı 5 girdiyi uygulamanın kendi çıkarım koduyla çalıştırır
  (`src/primer/model.ts` → onnxruntime-web; soru seçerken kullanılan fonksiyonun aynısı, ayrı bir kopya değil) ve
  `data-cy="p-0".."p-4"` ile 8 ondalık gösterir.
- **Kontrol** (`e2e/cypress/e2e/parite.cy.js`): her girdide `|p_tarayıcı − p_python| < 1e-4` ve 0.5 eşiğindeki
  karar (zor/kolay) aynı.

```
.venv\Scripts\python tests/parite.py                                  # kahin → tests/parite.json
cd e2e && npx cypress run --browser chrome --spec cypress/e2e/parite.cy.js
```

**Sonuç** (model v2.0.1, `576e42b0`; maks |fark| = **5.93e-8**):

| Girdi (spec §10.2 sırası) | Neden | Python | Tarayıcı | \|fark\| | Karar |
|---|---|---|---|---|---|
| `[0, 1, 0, 0, 0, 0, 1]` | demo profili A | 0.4432462156 | 0.44324622 | 4.4e-9 | kolay |
| `[2, 1, 0, 0, 0, 0, 1]` | demo profili B | 0.5629031062 | 0.56290311 | 3.8e-9 | zor |
| `[1, 3, 2, 2, 5, 20, 2]` | eşiğe çok yakın | 0.5000209212 | 0.50002092 | 1.2e-9 | zor |
| `[0, 0, 12, 12, 0.5, 0, 10]` | uç değer (çok riskli geçmiş) | 0.0003167093 | 0.00031665 | 5.9e-8 | kolay |
| `[0, 0, 0, 0, 0, 0, 1]` | sıfır geçmişli ilk soru | 0.3054673374 | 0.30546734 | 2.6e-9 | kolay |

- **Neden tolerans 1e-4:** Model girdisi ve çıktısı **float32**. float32'nin göreli duyarlılığı ~1e-7. Python
  onnxruntime (yerel CPU) ile onnxruntime-web (WebAssembly) aynı işlemleri farklı sırayla ya da farklı matematik
  kütüphaneleriyle yapabilir (ör. `exp`); son basamaklar farklı çıkabilir. 1e-4, bu yuvarlama farklarından
  binlerce kat büyük ama ürün açısından anlamlı her farktan (yanlış ağırlık, yanlış özellik sırası, yanlış
  ölçekleme) küçük. Bu hatalar p'yi yüzde düzeyinde değiştirir.
- **Ölçülen farklar:** Dört girdide fark ≤ 5e-9; bu yalnız ekrandaki 8 ondalığa yuvarlamadır. Uç değerde
  (p ≈ 0.0003) gerçek bir float32 farkı var: 5.9e-8 mutlak (göreli ~2e-4). p sıfıra yaklaştıkça göreli fark büyür;
  bu yüzden kontrol mutlak farkla yapılır.
- **Neden eşiğe yakın bir girdi:** Uygulama p'yi değil, `p >= 0.5` kararını kullanır. p eşikten uzaktaysa küçük bir
  sayısal fark kararı hiç değiştirmez; test yalnız sayıyı ölçmüş olur. p = 0.50002 olan girdide eşiğe uzaklık
  (2.1e-5) toleransın altında. Böyle bir girdide iki ortamın **kararı** da aynı olmalı; test bunu ayrıca kontrol eder.

## Tutor eval özeti

- 20 öğrenci mesajı gizli eval sayfasıyla (`?eval=1`) tutora gönderildi.
- **20 yanıtın 20'si modelden değil, sabit yedek metinden geldi.** Gemini API, okul hesabına bağlı projede ücretsiz katman kapalı olduğu için 403 döndürdü. Model değişikliği sorunu çözmedi.
- Bu yüzden "cevabı ele verme" oranı ölçülemedi. Yedek metinler cevabı vermiyor ama hiçbir mesaja özel değil.
- En önemli bulgu: yedek mekanizması uygulamayı ayakta tuttu ama hatayı gizledi. Eval'e "kaynak" sütunu eklemeseydik tutorun çalışmadığını fark etmeyecektik.
- Ayrıntılar: [docs/eval/tutor-eval.md](docs/eval/tutor-eval.md)

## Gerçek kullanıcı testi

Uygulamayı 29 Ekim'de bir sınıf arkadaşım telefonunda denedi.

- **Olumsuz / takıldığı yer:**
  - "Sokratik danışman hep aynı cevabı veriyor." Eval'de bulduğumuz sorunun aynısı: tutor Gemini'ye ulaşamıyor (403), her seferinde yedek metne düşüyor.
  - "Seçeneklerde düşük risk / yüksek risk yazıyor, ben de ona göre seçiyorum. Kimse yüksek riski seçmez." Uygulama cevabı söylemiyor ama seçenekler cevabı ele veriyordu: kontrol sorularında düğmelerin altında "Hazır (+1)" / "Riskli (0)" yazıyordu ve iyi seçenek hep A'ydı. Arkadaşımın önerisi: "Özgür bırak ya da sadece açıklama olsun."
- **Buna göre yaptığım değişiklik:** Risk etiketleri ve puan ipuçları artık yalnızca seçimden sonra görünüyor; seçeneklerin sırası her soruda karışık geliyor. Bunu spec.md'ye kabul örneği, Cypress'e 7. test olarak ekledim.

**Geliştirme sırasındaki kendi denemelerim:**
- "Sonraki Soruya Geç" düğmesine bastığımda hiçbir şey olmadı. Seçenek seçmeden düğmenin pasif kaldığını anlamadım. Bunu spec.md'ye kabul örneği ve Cypress'e 3. test olarak ekledim.
- İlk sürümde açık uçlu sorular vardı ve "SE Beklentisi" kutusu cevabın ipucunu öğrenciye gösteriyordu. Bütün soruları seçenekli yaptım, beklenti metnini yalnızca tutora gönderdim.

## Ürün kararı: yapmadığım 3 özellik

1. **GitHub'a bağlanıp kodu otomatik okumak:** Öğrencinin kodunu dış bir servise göndermek güvenlik ve KVKK yükü getirir. Ayrıca amaç kodu analiz etmek değil, öğrenciyi kararları üzerine düşündürmek.
2. **Hesap ve bulut kaydı:** Tek kullanıcılı bir öğrenme aracında kişisel veri toplamayı gerektirir. JSON dışa / içe aktarma kaybı önlemeye yetiyor.
3. **"Doğru cevabı göster" düğmesi:** Tutorun temel sözünü bozar. Öğrenci doğru yolu, seçiminin sonucunu görerek ve sonraki oturumlarda aynı konuyla tekrar karşılaşarak öğrenir.

## Bilinen sorunlar / düzeltilenler

**Düzeltildi (v2): G-03 v1'de ters puanlanıyordu.** Soru "Tarayıcıya giden kodda görünüyorlar mı?" diye soruyordu.
Burada "Evet", anahtarın açıkta olduğu (riskli) durumdu. Ama kod kontrol sorularında "Evet"e +1 verip riski
kapatıyordu. Sonuç olarak anahtarı açıkta olduğunu dürüstçe söyleyen öğrenci ödüllendiriliyordu. Soru metni
"Evet = iyi" olacak şekilde yeniden yazıldı: "API anahtarların yalnızca sunucuda ya da ortam değişkeninde mi
duruyor, yani tarayıcıya giden kodda görünmüyorlar mı?" `evetSonuc` ve `hayirRisk` metinleri zaten bu yöne
uygundu. Bu hata v2 modelinin etiketini de bozacaktı (kontrol sorusunda etiket "Evet" = başarı).

**Düzeltildi (v2): Seçenekler iki kez karıştırılıyordu.** Soru ekranı açılınca seçenekler bir kez karıştırılıyor,
hemen ardından bir effect onları ikinci kez karıştırıyordu. Kartlar A/B/C harfiyle eşlendiği için aynı kartın içine
bir anlığına başka bir seçenek geliyordu; bu yüzden Cypress "düşük risk" sandığı kartı tıklarken yüksek riskli seçeneği
seçebiliyor ve 1. test ara sıra kalıyordu. Artık seçenekler soru başına yalnız bir kez karıştırılıyor ve kart seçeneğin
kendisine bağlı; sıra yine her soruda karışık.

**Bilinen sorunlar:**

- Tutor ve soru uyarlama şu an yapay zekâya ulaşamıyor (Gemini API 403, ücretsiz katman kapalı). Uygulama yedek metin ve soru bankasıyla çalışıyor.
- AI Studio paylaşım linki bazı Google hesaplarında açılmıyor (yaş doğrulaması / şartların kabulü).
- Proje yalnızca tarayıcıda (localStorage) saklanıyor. Tarayıcı verisi silinirse proje kaybolur; bunu önlemek için dışa aktarma var.

## Kaynakça

1. Stephenson, N. (1995). *The Diamond Age: Or, A Young Lady's Illustrated Primer.* Bantam Spectra.
2. Sommerville, I. (2016). *Software Engineering* (10. baskı). Pearson. Bölüm 4 (gereksinimler), 5 (durum makineleri), 8 (test).
3. GitHub (2025). *Spec Kit: spec-driven development.* github.com/github/spec-kit
4. Google Labs. *Stitch* (stitch.withgoogle.com) ve *Google AI Studio* (aistudio.google.com).
5. Cypress. *E2E testing, screenshots and videos.* docs.cypress.io
6. METR (2025). *Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity.*
7. 6698 sayılı Kişisel Verilerin Korunması Kanunu (2016), m.4, m.9, m.12. kvkk.gov.tr
