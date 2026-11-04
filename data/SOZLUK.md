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
| 18 | `p_model` | 0–1 ya da boş | **Shadow** (v2.0'dan itibaren): veri toplama modunda model yüklüyse, modelin bu satırın kendi girdileriyle (6–12) tahmin ettiği `p(basari)`, 6 ondalık. Zorluk yine yazı-turayla seçilir; `p_model` karara girmez. Model yüklenemediyse ve v2.0'dan önce toplanan satırlarda boştur. Model girdisi **değildir**. |

Model girdileri yalnızca 6–12 numaralı 7 sütundur (spec §10.2), bu sırayla. Hepsi soru gösterilmeden önce bilinir.

## Birleştirme

Her oyuncunun indirdiği CSV `data/ham/` altına konur ve `python scripts/birlestir.py` ile `data/oturumlar.csv`'de
birleştirilir. Betik ayırıcıyı (virgül / noktalı virgül / sekme) ve Türkçe Excel'in ondalık virgülünü (`4,19`)
kendisi tanır. Aynı `(oturum_id, soru_id)` birden fazla kez gelirse ilk satırı tutar. `data/oturumlar.csv`'deki
sentetik satırlara dokunmaz. Sonunda gerçek oyuncu başına bir özet tablo yazdırır.

## Veriyle ilgili notlar (gerçek oyuncular)

- **İlk iki gerçek oyuncu örnek projeyle başladı.** Bu oyuncularda `oturum_no` 2'den başlar, çünkü örnek projenin
  hazır bir 1. oturumu vardır. Ayrıca beceri puanları ve önceki soru/riskli sayıları kendi kararlarından değil,
  örnek projenin hazır geçmişinden gelir. Bu durum sonradan düzeltildi: Veri Toplama Modu'nda (`?veri=1`)
  "Örnek projeyle dene" düğmesi gizlidir, sonraki oyuncular kendi projeleriyle `oturum_no = 1`'den başlar.
- **İkinci oyuncuda 3. oturumdan sonra dikkat düşüyor.** Karar süresi (`karar_suresi_sn`) 3 saniyenin altına iniyor
  ve sorular tekrar ediyor: `V-01` her oturumda geliyor. Bu satırlar okunmadan hızlıca tıklanmış olabilir.
- **Bu satırlar veriden ÇIKARILMAZ.** Veri olduğu gibi kalır. İki durum model kartına (`model/README.md`)
  **sınır** olarak yazılır (bkz. `spec.md` §10.8).
