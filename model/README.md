---
library_name: sklearn
tags:
- onnx
- tabular-classification
- sklearn
- education
pipeline_tag: tabular-classification
---

# SE Primer v2 — zorluk modeli

Öğrencinin bir konudaki zor soruyu düşük riskli cevaplama olasılığı p(basari). SE Primer'de 1. ve 3. sorunun zorluğunu seçer. Öğrenciyi notlamak için KULLANILMAZ.

## Amaç

SE Primer'de bir konunun sorusu seçilirken, öğrencinin o konudaki **zor** soruyu düşük riskli cevaplama
olasılığını tahmin eder: `p(basari)`. Hangi konunun sorulacağına uygulamadaki kural (`konuSec`) karar verir.
Model yalnız 1. soru (aşama) ve 3. soru (zayıf konu) için o konudan **kolay mı zor mu** soru geleceğine karar verir:
`p >= 0.5` ise zor soru, değilse kolay soru gelir (spec §10.3). 2. soruya dokunmaz.

**Kullanılmaması gereken durumlar:** Bu model **öğrenciyi notlamak, sıralamak ya da değerlendirmek için
kullanılmaz.** Çıktısı bir başarı ölçüsü değil, yalnızca bir sonraki sorunun zorluğunu ayarlayan bir olasılıktır.
SE Primer dışındaki bir soru bankasında ya da başka bir öğrenci kitlesinde doğrulanmadı.

## Model

- sklearn `Pipeline(StandardScaler → LogisticRegression(random_state=13))`, seed = 13
- Eğitim ortamı: Python 3.12, scikit-learn 1.9.1
- Yayınlanan model, çapraz doğrulamadaki modellerden biri değil, **tüm veriyle yeniden eğitilen** modeldir (spec §10.6).
- `model.onnx`: girdi `input` (float32, `[n, 7]`, sıra aşağıdaki gibi), çıktılar `label` ve `probabilities`
  (`[n, 2]`, sütun 1 = `p(basari = 1)`). ONNX ↔ sklearn maks fark: 8.3e-08 (sınır 1e-4).

### Girdiler (spec §10.2, sıra sabit)

| # | Özellik | Anlamı |
|---|---|---|
| 1 | `seviye` | Seviye (0 = Yeni başladım, 1 = Biraz deneyimim var, 2 = Deneyimliyim) |
| 2 | `konu_beceri_puani` | Sorulacak konunun beceri puanı (0–5) |
| 3 | `konudaki_onceki_soru_sayisi` | Bu konuda önceki oturumlarda cevaplanan soru sayısı |
| 4 | `konudaki_onceki_riskli_sayisi` | Bu konuda önceki oturumlarda orta/yüksek riskli seçim sayısı |
| 5 | `son_karar_suresi_sn` | Bir önceki sorudaki karar süresi (sn) |
| 6 | `son_gerekce_uzunlugu` | Bir önceki sorudaki gerekçe uzunluğu (karakter) |
| 7 | `oturum_no` | Oturumun sıra numarası |

Hepsi soru gösterilmeden **önce** bilinir; sorulan sorunun cevabı, süresi ya da gerekçesi girdi değildir.

## Veri

- `data/oturumlar.csv`, yalnız zor satırlar (`soru_zorlugu = 1`): **418** satır,
  **52** grup (`proje_id`).
  - Gerçek: 26 zor satır (7 oyuncu); `basari = 0`: 5, `basari = 1`: 21.
  - Sentetik: 392 zor satır (45 sahte oyuncu; üretici `scripts/sentetik.py`, seed = 13).
- Bütün veri setinde (kolay + zor): 762 satır, 57 gerçek + 705 sentetik.
- Etiket `basari`: zor soruda düşük riskli seçenek (kontrol sorusunda "Evet") = 1, diğerleri 0 (spec §10.1).
- Zor satırlarda `zorluk_kaynagi`: `kural` = 123, `yazitura` = 208, `yedek` = 87. `yedek` = istenen zorlukta uygun soru yoktu, diğeri gösterildi.
- Kişisel veri yok (ad, e-posta, cihaz, konum, serbest metin tutulmaz). Ayrıntı: `data/SOZLUK.md`.

## Metrikler (spec §10.6)

`StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=13)`, grup = `proje_id`: aynı oyuncu hiçbir zaman hem
eğitimde hem testte olmaz.

| metrik | değer |
|---|---|
| **5 katlama ortalama ROC-AUC (kapı)** | **0.7693** (eşik 0.65 → GEÇTİ) |
| AUC standart sapma | 0.0738 |
| Yalnız gerçek satırlarda out-of-fold AUC (bilgi amaçlı) | 0.6 |

| katlama | test satır | test grup | test gerçek satır | sınıf 0 / 1 | AUC |
|---|---|---|---|---|---|
| 1 | 85 | 9 | 0 | 43 / 42 | 0.7962 |
| 2 | 83 | 11 | 13 | 42 / 41 | 0.804 |
| 3 | 81 | 10 | 8 | 42 / 39 | 0.8181 |
| 4 | 87 | 12 | 0 | 46 / 41 | 0.8059 |
| 5 | 82 | 10 | 5 | 41 / 41 | 0.6225 |

## Katsayılar ve yorumu

Katsayılar **ölçeklenmiş** girdiler içindir (StandardScaler sonrası): özellik 1 standart sapma arttığında
log-odds'taki değişim. İşaret, etkinin yönünü gösterir. Kesişim (intercept): -0.0840.

| # | Özellik | Katsayı | Yorum |
|---|---|---|---|
| 1 | `seviye` | +0.1999 | 1 std artış p(basari)'yı artırıyor (zayıf etki) |
| 2 | `konu_beceri_puani` | +0.7239 | 1 std artış p(basari)'yı artırıyor (güçlü etki) |
| 3 | `konudaki_onceki_soru_sayisi` | +0.1219 | 1 std artış p(basari)'yı artırıyor (zayıf etki) |
| 4 | `konudaki_onceki_riskli_sayisi` | -0.7480 | 1 std artış p(basari)'yı azaltıyor (güçlü etki) |
| 5 | `son_karar_suresi_sn` | -0.1640 | 1 std artış p(basari)'yı azaltıyor (zayıf etki) |
| 6 | `son_gerekce_uzunlugu` | +0.3580 | 1 std artış p(basari)'yı artırıyor (orta etki) |
| 7 | `oturum_no` | +0.0251 | 1 std artış p(basari)'yı artırıyor (zayıf etki) |

Bu katsayılar büyük ölçüde sentetik üreticinin kuralını yansıtır (bkz. Sınırlar). Nedensel bir ilişki olarak okunmamalıdır.

**Bilgi amaçlı: yalnız sentetik satırlarla eğitilen modelin katsayıları** (kapıyı etkilemez; yayınlanan model değildir):

| Özellik | Tüm veri | Yalnız sentetik |
|---|---|---|
| `seviye` | +0.1999 | +0.3712 |
| `konu_beceri_puani` | +0.7239 | +0.8481 |
| `konudaki_onceki_soru_sayisi` | +0.1219 | -0.0506 |
| `konudaki_onceki_riskli_sayisi` | -0.7480 | -0.5173 |
| `son_karar_suresi_sn` | -0.1640 | -0.1081 |
| `son_gerekce_uzunlugu` | +0.3580 | +0.4334 |
| `oturum_no` | +0.0251 | +0.0350 |

**`son_karar_suresi_sn` katsayısı yorumlanmamalı.** Tüm veride katsayı -0.1640
(negatif). Sentetik formülde ise bu girdinin etkisi **pozitif yönde ve zayıf**: önceki karar süresi
kısaldıkça logit düşüyor, ama en fazla 0.32 logit. Etki 392 sentetik zor
satırın 173 tanesinde sıfır (önceki süre formüldeki eşiğin üstünde); ortalaması
0.066 logit.

- **Yalnız sentetik veriyle eğitince de katsayı negatif** (-0.1081). Bu kadar
  küçük bir etki, bu veri miktarında gürültüden ayırt edilemiyor.
- **Gerçek veri eklenince katsayı -0.1081 → -0.1640.** Gerçek zor satırlarda önceki
  karar süresi kısa (medyan 5.0 sn; sentetikte 7.39 sn) ve satırların
  çoğu başarılı (26 satırın 21 tanesinde `basari = 1`). Gerçek oyuncular tek tek çıkarıldığında en büyük değişim `7200e59a` oyuncusunda: katsayı -0.1233 oluyor. 3. oturumdan sonra hızlanan (ezber şüpheli) oyuncu `5fe43686` çıkarılınca katsayı -0.1623 oluyor; yani bu oyuncu farkı tek başına açıklamıyor.
- **Sonuç:** bu katsayı yorumlanmamalı. Model ve sentetik üretici bu sonuca göre değiştirilmedi.

## Sınırlar

- **Az sayıda gerçek kişi, AUC oynak.** Gerçek veri az sayıda oyuncudan geliyor: **7 oyuncu,
  19 oturum, 57 satır** (sentetik: 45 oyuncu, 705 satır).
  Gerçek zor satır **26** ve bunların **5'inde `basari = 0`** var; bu yüzden
  yalnız gerçek satırlarda hesaplanan AUC **çok oynaktır**. Katlama bazında AUC'ler ve standart sapma bu oynaklığı
  gösterir; ortalama AUC kesin bir başarı ölçüsü olarak okunmamalıdır.
- **Katlamalar arasında fark var.** 5 katlamanın AUC standart sapması **0.0738**. 1 katlama eşiğin (0.65) altında: 5. katlama (0.6225).
  Kapı ortalamaya bakar; tek bir katlamanın sonucu o katlamaya hangi oyuncuların düştüğüne bağlıdır.
- **Model büyük ölçüde sentetik kuralı öğreniyor.** Zor satırların büyük çoğunluğu sentetik (%93.8). Sentetik etiket
  bilinen bir lojistik formülle üretildi (`scripts/sentetik.py`), bu yüzden lojistik regresyon o formülü kolayca geri
  buluyor. Kapıdaki AUC, gerçek öğrencilerdeki başarıdan çok bu kuralın ne kadar iyi geri bulunduğunu ölçer.
- **7 gerçek oyuncunun 7'sinde `seviye = 0`.** Tanışmadaki varsayılan seçim
  ("Yeni başladım") değiştirilmemiş. Gerçek oyuncuların seviye dağılımı: seviye 0: 7 oyuncu, seviye 1: 0 oyuncu, seviye 2: 0 oyuncu. Seviye etkisi
  büyük ölçüde **sentetik veriden** öğreniliyor; gerçek veride görülmeyen seviyeler için tahminler gerçek kullanıcılarda
  doğrulanmadı.
- **7 gerçek oyuncunun 2'si örnek projeyle başladı** (`oturum_no` 2'den
  başlıyor). Bu oyuncularda ilk girdiler örnek projenin hazır geçmişinden gelir. Satırlar veriden çıkarılmadı
  (bkz. `data/SOZLUK.md`).
- **1 gerçek oyuncuda 3. oturumdan sonra dikkat düşüyor.** 3. oturumdan sonraki karar
  sürelerinin medyanı 3 saniyenin altında ve sorular tekrar ediyor (bu oyuncularda en sık soru oturumların
  7'sinin 7'sinde `V-01`). Bu satırlar da veriden çıkarılmadı. Etiketin bir kısmı düşünülerek verilmiş bir
  karardan değil, hızlıca tıklamaktan geliyor olabilir.
- **Soru bankası küçük (23 soru).** Sorular tekrar ediyor ve ezberleniyor (yukarıdaki madde: 3. oturumdan
  sonra karar süresi 3 sn'nin altına iniyor). Sonraki oturumlardaki `basari`, konunun öğrenilmesinden çok cevabın
  hatırlanmasını yansıtıyor olabilir.

## Kullanım

```python
import numpy as np, onnxruntime as ort
oturum = ort.InferenceSession("model.onnx")
x = np.array([[0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 2.0]], dtype=np.float32)  # {"seviye": 0.0, "konu_beceri_puani": 0.0, "konudaki_onceki_soru_sayisi": 1.0, "konudaki_onceki_riskli_sayisi": 1.0, "son_karar_suresi_sn": 0.0, "son_gerekce_uzunlugu": 0.0, "oturum_no": 2.0}
p = oturum.run(["probabilities"], {"input": x})[0][0, 1]
zorluk = "zor" if p >= 0.5 else "kolay"
```
