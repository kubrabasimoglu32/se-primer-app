# Veri sözlüğü — `data/oturumlar.csv`

Her satır **bir karar**dır: bir öğrencinin bir oturumda bir soruya verdiği cevap. Bir oturum 3 satır üretir.
Veri, uygulama `?veri=1` ile açıldığında (Veri Toplama Modu) toplanır ve Projem ekranındaki
"Veriyi CSV indir" düğmesiyle dışa aktarılır. Ayrıntılı kurallar: `spec.md` Bölüm 10.

**Kişisel veri yoktur.** Ad, e-posta, telefon, cihaz kimliği, konum, IP ve serbest metin (gerekçe, not,
proje açıklaması) toplanmaz. Kimlikler rastgele üretilen UUID'lerdir; kişiden türetilmez.

Sütunlar CSV'deki sırayla verilmiştir.

| # | Sütun | Tür / birim | Açıklama |
|---|---|---|---|
| 1 | `proje_id` | UUID | Proje oluşturulurken `crypto.randomUUID` ile üretilir ve proje kartına kaydedilir. Aynı kişinin (aynı projenin) oturumlarını gruplamak içindir. Eğitimde bölme bu gruba göre yapılır (`StratifiedGroupKFold`, 5 katlama; spec §10.6): aynı kişi hem eğitimde hem testte olmaz. Sentetik oyuncuların da kendi `proje_id`'si vardır. Model girdisi **değildir**. |
| 2 | `oturum_id` | UUID | Her oturumda yeniden üretilir. Model girdisi değildir. |
| 3 | `soru_id` | metin | Soru bankasındaki kimlik (ör. `V-01`). |
| 4 | `konu` | metin | `kapsam`, `mimari`, `veriTabani`, `dosyaDuzeni`, `test`, `guvenlik`, `dagitim`, `rapor`. |
| 5 | `slot` | 1 / 2 / 3 | Oturumdaki sıra: 1 = aşama sorusu, 2 = değişiklik tetikli soru, 3 = zayıf konu sorusu. |
| 6 | `seviye` | 0 / 1 / 2 | **Girdi 1.** 0 = Yeni başladım, 1 = Biraz deneyimim var, 2 = Deneyimliyim. Tanınmayan metin → 0. |
| 7 | `konu_beceri_puani` | 0–5 | **Girdi 2.** Oturum başında, sorulan konunun beceri puanı. |
| 8 | `konudaki_onceki_soru_sayisi` | adet | **Girdi 3.** Bu konuda önceki oturumlarda cevaplanan soru sayısı. |
| 9 | `konudaki_onceki_riskli_sayisi` | adet | **Girdi 4.** Bu konuda önceki oturumlarda yapılan orta/yüksek riskli seçim sayısı. |
| 10 | `son_karar_suresi_sn` | saniye | **Girdi 5.** Bir önceki sorudaki karar süresi. Oturumun 1. sorusunda önceki oturumun son sorusu; ölçüm yoksa 0. |
| 11 | `son_gerekce_uzunlugu` | karakter | **Girdi 6.** Bir önceki sorudaki "Neden bunu seçtin?" metninin uzunluğu (metnin kendisi kaydedilmez). |
| 12 | `oturum_no` | 1, 2, … | **Girdi 7.** Oturumun sıra numarası. |
| 13 | `soru_zorlugu` | 0 / 1 | Gerçekte gösterilen sorunun zorluğu: 0 = kolay, 1 = zor. Eval yalnız `soru_zorlugu = 1` satırlarında yapılır. |
| 14 | `zorluk_kaynagi` | metin | `yazitura` (veri modunda yazı-tura), `model` (modelin seçimi), `kural` (2. soru ya da model yok), `yedek` (istenen zorlukta uygun soru yoktu, diğeri gösterildi). |
| 15 | `karar_suresi_sn` | saniye | Soru ekrana geldiği an → son seçenek seçildiği an. Bu satırın kendi süresi; bu satır için girdi **değildir** (sızıntı), sonraki satırın `son_karar_suresi_sn`'i olur. |
| 16 | `basari` | 0 / 1 | **Etiket.** Karar sorusunda düşük riskli seçenek = 1; kontrol sorusunda "Evet" = 1; diğerleri 0. |
| 17 | `kaynak` | metin | `gercek` (uygulamada gerçek kişi) ya da `sentetik` (üretici betik; kural ve tohum README'de). |
| 18 | `p_model` | 0–1 ya da boş | Model devredeyken tahmin edilen `p(basari)`. Veri toplama modunda boştur. |

Model girdileri yalnızca 6–12 numaralı 7 sütundur (spec §10.2), bu sırayla. Hepsi soru gösterilmeden önce bilinir.
