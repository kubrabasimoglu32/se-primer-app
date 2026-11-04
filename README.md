# SE Primer

> YZM301 · Kişiye uyum sağlayan kitap, yazılım mühendisi için.

SE Primer, yazılım mühendisliği öğrencisinin kendi projesini tanıyan ve proje büyüdükçe ona projesi hakkında
sorular soran bir öğrenme asistanı. Her girişte "Ne değişti?" diye sorar. Projenin aşamasına, yapılan
değişikliklere ve öğrencinin zayıf olduğu konulara göre 3 soru seçer. Cevabı söylemez: seçenek sunar, seçilen
yolun sonucunu ve nedenini gösterir. Proje bitene kadar öğrencinin gelişimini kaydeder. **v2'de** küçük bir model,
öğrencinin davranışından sorunun kolay mı zor mu olacağına karar verir.

İlham: Neal Stephenson, *The Diamond Age*. Okuyan çocuğa göre kendini yeniden yazan kitap.

## Linkler

| | |
|---|---|
| GitHub repo | https://github.com/kubrabasimoglu32/se-primer-app |
| **Canlı uygulama (GitHub Pages)** | https://kubrabasimoglu32.github.io/se-primer-app/ |
| Veri Toplama Modu · Parite sayfası | https://kubrabasimoglu32.github.io/se-primer-app/?veri=1 · https://kubrabasimoglu32.github.io/se-primer-app/?parite=1 |
| Hugging Face model sayfası | https://huggingface.co/Kubra37/se-primer-zorluk |
| Hugging Face model (v2.0.1, commit'e sabit) | https://huggingface.co/Kubra37/se-primer-zorluk/resolve/576e42b0e833d418d13c3fe9e528e4194466b8f5/model.onnx |
| Demo videosu (v2) | _eklenecek_ |
| Uygulama (AI Studio, ikincil) | https://ai.studio/apps/8074a940-e9fe-4c74-96fc-ff23a83151f5?fullscreenApplet=true |
| v1 demo videosu (geçen hafta) | https://youtu.be/ScYtHzTFs4Q |

> GitHub Pages'te sunucu yoktur: yapay zekâ (Gemini) çağrıları çalışmaz, uygulama soru bankası ve yedek metinlerle
> çalışır. Zorluk modeli tarayıcıda çalıştığı için Pages'te de devrededir. AI Studio linki bazı Google hesaplarında
> (yaş doğrulaması / şartların kabulü) açılmayabilir.

## Kurulum (Windows, en fazla 3 komut)

Gerekenler: Node.js 24, Python 3.12, Chrome. Proje kökünde, PowerShell'de:

```powershell
npm ci; npm --prefix e2e ci                                                        # 1. uygulama + Cypress
py -3.12 -m venv .venv; .venv\Scripts\python -m pip install -r requirements.txt    # 2. Python (.venv)
npm test                                                                           # 3. 15 uçtan uca test
```

`npm test` sunucuyu kendisi açar (`npm run dev`, localhost:3000), Cypress testlerini çalıştırır ve sunucuyu kapatır.

### Ayrıntılı komutlar

| Ne | Komut |
|---|---|
| Uygulamayı çalıştır | `npm run dev` → http://localhost:3000 (`?veri=1` Veri Toplama Modu, `?parite=1` parite sayfası) |
| Sentetik veri üret | `.venv\Scripts\python scripts/sentetik.py` → `data/sentetik.csv` (her çalıştırmada aynı dosya) |
| Gerçek + sentetik veriyi birleştir | `.venv\Scripts\python scripts/birlestir.py` → `data/oturumlar.csv` |
| Eğit, ölç, paketle | `.venv\Scripts\python train.py` → `model/` (eval kapısı geçilmezse hata koduyla durur, `model/`'e yazmaz) |
| Hugging Face'e yayınla | `.venv\Scripts\python scripts/yayinla.py --surum … --mesaj … [--onceki …]` (önce `.venv\Scripts\hf auth login`) |
| Parite kahini | `.venv\Scripts\python tests/parite.py` → `tests/parite.json` |
| Tek bir Cypress dosyası | `cd e2e; npx cypress run --browser chrome --spec cypress/e2e/parite.cy.js` (sunucu açıkken) |
| Demo videosu | `cd e2e; npx cypress run --browser chrome --spec cypress/e2e/demo.cy.js` |

macOS/Linux'ta `.venv\Scripts\python` yerine `.venv/bin/python` kullanılır. Python 3.12 seçildi: başlangıç reposuyla
aynı, ayrıca Python 3.15 için onnxruntime paketi yok.

## Repo yapısı

Ödevde beklenen dosyalar önce, sonra diğerleri. **Cypress testleri `e2e/cypress/` altındadır** (kendi `package.json`'ı
olan ayrı bir klasör); kökte `cypress/` yoktur.

```
spec.md                        Problem, kapsam, soru seçme kuralları, kabul örnekleri; §10: zorluk modeli, eval kapısı
data/
  oturumlar.csv                Eğitim verisi: gerçek + sentetik (birlestir.py üretir)
  SOZLUK.md                    Veri sözlüğü (18 sütun) ve gerçek veriyle ilgili notlar
  ham/                         Gerçek oyuncuların indirdiği ham CSV'ler (veri modu → "Veriyi CSV indir")
  sentetik.csv                 Sentetik oyuncular (sentetik.py üretir)
train.py                       Eğitim + eval kapısı (spec §10.6) + ONNX paketi + model kartı
model/
  model.onnx                   Zorluk modeli
  config.json                  Sözleşme: özellik adları ve sırası, sınıflar, eşik, metrikler
  README.md                    Model kartı: amaç, veri, metrikler, katsayılar, sınırlar
RELEASE.md                     Sürümler (v2.0, v2.0.1), geri alma, Shadow/Canary/aşamalı geçiş, ödünleşim matrisi
tests/
  parite.py                    Diferansiyel test kahini (Python + onnxruntime)
  parite.json                  5 referans girdi ve Python'un p(basari) değerleri
e2e/                           Cypress (ödevdeki "cypress/")
  cypress.config.js
  cypress/e2e/primer.cy.js     7 regresyon testi (v1)
  cypress/e2e/veri.cy.js       4 test: Veri Toplama Modu
  cypress/e2e/model.cy.js      3 test: spec §10.7 kabul örnekleri 8, 9, 10
  cypress/e2e/parite.cy.js     1 test: diferansiyel (Python ↔ tarayıcı)
  cypress/e2e/demo.cy.js       Altyazılı demo senaryosu
  cypress/fixtures/            model.onnx ve config.json kopyası (testler ağa çıkmaz), test proje kartı
  cypress/support/e2e.js       Hugging Face isteklerini fixture'a yönlendirir
SINAV_TASARIMI.md              Sınav tasarımı (düşünce egzersizi)
README.md                      Bu dosya

src/                           Uygulama (React + Vite)
  primer/konuSec.ts            Soru seçme kuralı (saf fonksiyon)
  primer/model.ts              Zorluk modeli: yükleme (commit'e sabit), çıkarım (onnxruntime-web), yedek
  primer/modelKaynak.ts        Model sürümü ve commit'e sabit URL'ler (yayinla.py üretir)
  primer/veriToplama.ts        Veri Toplama Modu: özellik hesabı, satır, CSV
  components/PariteScreen.tsx  ?parite=1: parite girdileri uygulamanın model.ts'iyle
  data/soruBankasi.json        Soru bankası (docs/soru-bankasi.json ile aynı)
scripts/
  sentetik.py                  Sentetik veri üreticisi (seed = 13)
  birlestir.py                 data/ham/*.csv + data/sentetik.csv → data/oturumlar.csv
  yayinla.py                   model/ → Hugging Face (etiket, commit'e sabit URL, sha256 ve olasılık doğrulaması)
  e2e.mjs                      npm test: sunucuyu aç → Cypress → kapat
docs/
  soru-bankasi.json            8 konu, 23 soru: tetik koşulları, seçenekler, risk, sonuç, neden, derinleş
  eval/tutor-eval.md           Tutor değerlendirmesi (v1)
.github/workflows/pages.yml    main'e push → vite build → GitHub Pages
requirements.txt               Python 3.12 bağımlılıkları (sürümler sabit)
server.ts                      Yerel geliştirme sunucusu (Vite + Gemini API uçları)
DESIGN.md                      Tasarım sistemi (Stitch)
ODEV.md                        Ödev metni
```

## v2 özeti: zorluk modeli

**Ne değişti?** v1'de hangi konunun sorulacağına da, o konudaki sorunun hangisi olacağına da sabit bir kural karar
veriyordu. v2'de konuyu yine kural (`konuSec`) seçer; **model yalnız 1. soru (aşama) ve 3. soru (zayıf konu) için o
konudan kolay mı zor mu soru geleceğine karar verir.** 2. soru (değişiklik tetikli) eski kuralla gelir. Model
yüklenemezse eski kural değişmeden çalışır (spec §10.5).

**Model neye karar veriyor?** Öğrencinin bu konudaki **zor** soruyu düşük riskli cevaplama olasılığı `p(basari)`.
`p >= 0.5` ise zor soru gelir ve ekranda "Primer seni zorluyor" yazar; cevaptan sonra bir derinleş sorusu gelir.
`p < 0.5` ise kolay soru gelir ve ekranda "Primer temelden alıyor" yazar. Girdi, soru gösterilmeden önce bilinen 7
değerdir (spec §10.2): seviye, konunun beceri puanı, o konudaki önceki soru ve riskli seçim sayısı, bir önceki
sorudaki karar süresi ve gerekçe uzunluğu, oturum no. Model `StandardScaler → LogisticRegression` (seed 13) ve
tarayıcıda onnxruntime-web ile çalışır.

**Eval sonucu** (spec §10.6; eşik eğitimden önce yazıldı): `StratifiedGroupKFold(5)`, grup = `proje_id`.

| | |
|---|---|
| 5 katlama ortalama ROC-AUC (kapı ≥ 0.65) | **0.7693 → geçti** |
| Katlama AUC'leri | 0.7962 · 0.8040 · 0.8181 · 0.8059 · 0.6225 (std 0.0738) |
| Yalnız gerçek satırlarda out-of-fold AUC (bilgi) | 0.60 (26 zor satır, 5'i `basari = 0`) |
| Veri | 7 gerçek oyuncu (19 oturum, 57 satır) + 45 sentetik oyuncu (705 satır) |
| Parite (Python ↔ tarayıcı) | maks \|fark\| 5.93e-8 (tolerans 1e-4) |

Model büyük ölçüde sentetik kuralı öğreniyor; sınırların tamamı [model kartında](model/README.md).

**En önemli bulgular:**

- **G-03 ters puanlanıyordu.** Kontrol sorusunda "Evet" anahtarın açıkta olduğu (riskli) durumdu ama +1 alıyordu.
  Bu, v2'nin etiketini (kontrol sorusunda "Evet" = başarı) bozacaktı; soru metni düzeltildi.
  → [Bilinen sorunlar](#bilinen-sorunlar--düzeltilenler)
- **Flaky test:** seçenekler iki kez karıştırılıyordu. Cypress "düşük riskli" sandığı kartı tıklarken başka bir
  seçeneği seçebiliyor, 1. test ara sıra kalıyordu. Artık seçenekler soru başına bir kez karıştırılıyor.
  → [Bilinen sorunlar](#bilinen-sorunlar--düzeltilenler),
  [commit 591808b](https://github.com/kubrabasimoglu32/se-primer-app/commit/591808b)
- **Hızlı karar veren gerçek oyuncular çoğunlukla başarılı.** Gerçek zor satırlarda önceki karar süresi kısa
  (medyan 5 sn) ve satırların çoğu başarılı. Bir oyuncuda 3. oturumdan sonra karar süresi 3 sn'nin altına iniyor ve
  aynı soru (V-01) her oturumda geliyor; bu ezber gibi duruyor. `son_karar_suresi_sn` katsayısı, sentetik formüldeki
  yönün tersine negatif çıktı. Teşhis: formüldeki etki çok küçük, bu veri miktarında gürültüden ayırt edilemiyor;
  katsayı yorumlanmamalı. → [model kartı](model/README.md) ("Katsayılar ve yorumu"), [data/SOZLUK.md](data/SOZLUK.md)
- **3. soru için eğitim–sunum farkı (training-serving skew).** Sorular oturum başında seçildiği için uygulamada
  3. sorunun girdileri önceki oturumun son cevabından, eğitimde ise aynı oturumun 2. cevabından geliyor. Bu fark
  254 satırın 26'sında kararı değiştiriyor. v3 için not: 3. soruyu 2. cevaptan sonra seçmek.
  → [RELEASE.md](RELEASE.md) ("Bilinen sınırlar")

## Sentetik veri

Üretici `scripts/sentetik.py`, **tohum `SEED = 13`** (tek bir `random.Random(13)`). **45 sahte oyuncu** var
(seviye 0/1/2'den 15'er). Her oyuncu 4–6 oturum oynar, her oturumda 3 soru, toplam **705 satır**. Her oyuncunun
tohumlu UUID'li kendi `proje_id`'si var; eğitimde ayrı bir grup sayılır.

- Sorular uygulamanın `konuSec` kuralıyla, gerçek soru bankasından seçilir. Slot 1 ve 3'te istenen zorluk
  yazı-turayla belirlenir; slot 2 bankadaki zorluğuyla gelir.
- Girdiler uygulamadaki mantıkla oyuncunun önceki satırlarından hesaplanır: beceri puanı (oturum sonunda +1/0/−1,
  0–5 arası), önceki soru ve riskli sayısı, son karar süresi ve gerekçe uzunluğu, oturum no.
- Etiket şu olasılıkla çekilir:

```
z = -0.4 + 0.5*seviye + 0.45*(konu_beceri_puani - 2.5) - 0.7*konudaki_onceki_riskli_sayisi
    + 0.15*oturum_no + 0.01*son_gerekce_uzunlugu - 0.04*max(0, 8 - son_karar_suresi_sn)
p(basari=1) = sigmoid(z)        zor satır
p(basari=1) = sigmoid(z + 1.2)  kolay satır
```

Kuralın tamamı (karar süresi ve gerekçe uzunluğu dağılımları dahil) `scripts/sentetik.py`'nin başındaki yorumdadır.
Gerçek veri: `?veri=1` ile toplanan 7 oyuncu, `data/ham/` (kişisel veri yok; bkz. [data/SOZLUK.md](data/SOZLUK.md)).

## Nasıl çalışır?

1. **Tanışma:** Seviye, rol, öğrenme hedefi ve proje bilgileri (aşama, teknoloji, veri tabanı, mimari, kişisel veri,
   klasör yapısı). Bunlardan **Proje Kartı** oluşur.
2. **Ne değişti?:** Sonraki girişlerde öğrenci yaptığı değişiklikleri işaretler (yeni özellik, veri tabanı, test,
   yayın, hata…).
3. **3 soru:** Hangi konunun sorulacağına **kod** karar verir (aşama, değişiklik, zayıf konu). 1. ve 3. sorunun
   zorluğuna **model** karar verir. Soru metnini **Gemini** öğrencinin projesine uyarlar; yapay zekâ çalışmazsa
   bankadaki orijinal soru kullanılır.
4. **Projem:** Oturum sonucu (Sağlıklı / Risk var), açık riskler, beceri haritası, karar kaydı. Proje bitince proje
   karnesi.

Seçimi koda, metni yapay zekâya bırakmanın nedeni: seçim açıklanabilir, test edilebilir ve yapay zekâ olmadan da
çalışır.

**Modelin davranışı (bilgi):** Tanışmadaki varsayılanlarla yeni bir öğrenci (seviye 0, ilk oturum), beceri puanı 2
olan konularda p ≈ 0.59 alır ve **zor** soru görür; beceri 0–1 olan konularda kolay soru görür (8 konunun 4'ünde zor).
Bu, modelin kendi çıktısıdır; eşik (0.5) ya da model buna göre ayarlanmadı.

## Testler

`npm test` ile 15 test çalışır. Testler ağa çıkmaz: yapay zekâ çağrıları 500 döndürür (uygulama soru bankasına
döner) ve model Hugging Face yerine `e2e/cypress/fixtures/` altındaki kopyadan gelir. Seçeneklerin sırası her soruda
karışık geldiği için testler seçeneği harfine göre değil, `data-risk` niteliğine (düşük / orta / yüksek) göre seçer.

| Dosya | Test | Ne kontrol eder |
|---|---|---|
| `primer.cy.js` | 7 | v1 regresyon testleri (aşağıda); model devredeyken de geçer |
| `veri.cy.js` | 4 | Veri Toplama Modu: seviye, `basari`, `proje_id` / `oturum_id`, "Toplanan veriyi sil" |
| `model.cy.js` | 3 | Spec §10.7: 8) p ≥ 0.5 → zor soru + derinleş, 9) veri tabanı değişikliği → V-01, 10) model 404 → eski kural |
| `parite.cy.js` | 1 | Python ↔ tarayıcı, 5 girdi, \|fark\| < 1e-4 ve aynı karar |

**Sonuç:** 15 / 15. (Parite testinden önceki 14 test art arda 3 koşuda da geçti; 15 test `npm test` ile ayrıca
çalıştırıldı.)

v1 regresyon testleri:

| # | Test |
|---|---|
| 1 | Hep düşük riskli seçim → yeni açık risk eklenmez |
| 2 | Riskli seçimler → "İncelenmesi Gereken Mimari Riskler Var" |
| 3 | Seçim yapılmadan "Devam" pasif, seçince aktif |
| 4 | "Veri tabanı yapısı değiştirildi" → V-01 sorusu gelir |
| 5 | Oturumdan sonra yeni oturum "Ne değişti?" ile başlar |
| 6 | Proje sayfa yenilenince kaybolmaz, tanışma tekrar gelmez |
| 7 | Seçimden önce risk ve puan bilgisi görünmez, seçimden sonra görünür (kullanıcı testinden eklendi) |

**Test sırasında bulunan bir sorun (v1):** İlk testte "hep düşük riskli seçim → sağlıklı" bekledik. Örnek proje
3 açık riskle başladığı için kurala göre sonuç "risk" çıktı. Test, spec'teki kuralı (açık risk sayısı azalmalı)
yanlış yorumluyordu. Beklenti "yeni risk eklenmez" olarak düzeltildi.

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

## Sınav tasarımı

Düşünce egzersizi ("Sizinle uyumlanan sınav tasarımı"): [SINAV_TASARIMI.md](SINAV_TASARIMI.md)

## Tutor eval özeti (v1)

- 20 öğrenci mesajı gizli eval sayfasıyla (`?eval=1`) tutora gönderildi.
- **20 yanıtın 20'si modelden değil, sabit yedek metinden geldi.** Gemini API, okul hesabına bağlı projede ücretsiz katman kapalı olduğu için 403 döndürdü. Model değişikliği sorunu çözmedi.
- Bu yüzden "cevabı ele verme" oranı ölçülemedi. Yedek metinler cevabı vermiyor ama hiçbir mesaja özel değil.
- En önemli bulgu: yedek mekanizması uygulamayı ayakta tuttu ama hatayı gizledi. Eval'e "kaynak" sütunu eklemeseydik tutorun çalışmadığını fark etmeyecektik.
- Ayrıntılar: [docs/eval/tutor-eval.md](docs/eval/tutor-eval.md)

## Gerçek kullanıcı testi (v1)

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
2. **Hesap ve bulut kaydı:** Tek kullanıcılı bir öğrenme aracında kişisel veri toplamayı gerektirir. JSON dışa / içe aktarma kaybı önlemeye yetiyor. (v2'de model de bu yüzden tarayıcıda çalışıyor: öğrenci verisi cihazdan çıkmıyor; bkz. [RELEASE.md](RELEASE.md) ödünleşim matrisi.)
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

- Tutor ve soru uyarlama şu an yapay zekâya ulaşamıyor (Gemini API 403, ücretsiz katman kapalı; Pages'te sunucu da
  yok). Uygulama yedek metin ve soru bankasıyla çalışıyor.
- onnxruntime-web'in wasm dosyası 14.8 MB (gzip 3.9 MB). Yavaş bağlantıda ilk açılışta model ~3 sn içinde hazır
  olmazsa ilk oturum eski kuralla geçer; sonraki açılışlar önbellekten gelir (ölçüm: [RELEASE.md](RELEASE.md)).
- AI Studio paylaşım linki bazı Google hesaplarında açılmıyor (yaş doğrulaması / şartların kabulü).
- Proje yalnızca tarayıcıda (localStorage) saklanıyor. Tarayıcı verisi silinirse proje kaybolur; bunu önlemek için dışa aktarma var.

## Kaynakça

1. Stephenson, N. (1995). *The Diamond Age: Or, A Young Lady's Illustrated Primer.* Bantam Spectra.
2. Sommerville, I. (2016). *Software Engineering* (10. baskı). Pearson. Bölüm 4 (gereksinimler), 5 (durum makineleri), 8 (test), 25 (konfigürasyon yönetimi).
3. GitHub (2025). *Spec Kit: spec-driven development.* github.com/github/spec-kit
4. Google Labs. *Stitch* (stitch.withgoogle.com) ve *Google AI Studio* (aistudio.google.com).
5. Cypress. *E2E testing, screenshots and videos.* docs.cypress.io
6. METR (2025). *Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity.*
7. 6698 sayılı Kişisel Verilerin Korunması Kanunu (2016), m.4, m.9, m.12. kvkk.gov.tr
8. Amershi, S. vd. (2019). *Software Engineering for Machine Learning: A Case Study.* ICSE-SEIP.
9. Shankar, S. vd. (2022). *Operationalizing Machine Learning: An Interview Study.* arXiv:2209.09125.
10. Mitchell, M. vd. (2019). *Model Cards for Model Reporting.* FAT\*.
11. Breck, E. vd. (2017). *The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction.* IEEE BigData.

## Yapay zekâ araçlarını nasıl kullandım

<!-- Bu bölümü ben yazacağım. -->
