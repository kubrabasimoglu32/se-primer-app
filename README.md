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
```

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

## Bilinen sorunlar

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
