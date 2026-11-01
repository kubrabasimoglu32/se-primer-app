NEDEN

Geçen hafta The Primer'ı yaptınız: girişteki 3 soruya göre uyum sağlayan, kararlarla ilerleyen bir hikâye. O uyum sabit kurallara dayanıyordu. Bu hafta uyumu, oyuncunun davranışından öğrenen ve sizin eğitip yayınladığınız **küçük, göreve özel (dikey) bir modele** bağlıyoruz.

Derste konuştuğumuz çerçeveyi hatırlayın:
- **Andrew Ng'nin 4 Başlığı:** (1) Yazılım mühendisliği temelleri (test, doğrulama, mimari), (2) Coding agent yönetim becerisi, (3) Yapay zekâda **Development · Deployment · Inference** üçlüsünü uçtan uca paket olarak uygulayabilme, (4) **Vizyon Mühendisliği** (zamanın %90'ını problemin gerçek özünü anlamaya ayırmak).
- **Neden küçük, göreve özel model?** Çıkarım (inference) maliyetleri 2022–2024 arasında 300 kat düştü (Stanford AI Index 2025) ve 2027'ye kadar göreve özel küçük modellerin genel amaçlı LLM'lerden 3 kat daha fazla kullanılacağı öngörülüyor (Gartner 2025).
- **Yaşayan ML Yaşam Döngüsü ve 3V:** Makine öğrenmesi yaşam döngüsü düz bir çizgi değil, veri toplamadan sürekli gözleme (monitoring) dönen canlı bir sistemdir (Amershi vd., 2019). Üretimdeki üç temel mühendislik derdi (**3V**) olan **Velocity (Hız)**, **Validation (Doğrulama)** ve **Versioning (Sürümleme)** kaslarını bu ödevde bizzat deneyimleyeceksiniz.

Derste gördüğümüz üç aşamanın her biri somut bir teslime dönüşüyor:
- **Development:** gerçek kullanıcı verisi, tekrarlanabilir eğitim, eval eşiği (kabul kriteri), somut ve taşınabilir **artefakt** (`model.onnx` + sözleşme niteliğinde `config.json` + model kartı)
- **Deployment:** Hugging Face model reposu, commit'e sabitlenmiş sürüm, mimari ödünleşim (trade-off) kararı, güvenli devreye alma (Shadow / Canary) ve geri alma (rollback) planı
- **Inference & Diferansiyel Test:** modelin uygulamada (mobil ve/veya web arayüzünde) çalışması ve iki farklı ortamda (Test Kahini / Oracle olarak Python ile hedef uygulama) hata toleransı dahilinde aynı sonucu verdiğinin **diferansiyel testle (parite testi)** kanıtı


NE YAPACAKSINIZ

Bir hedef seçin. Başlangıç reposundaki örnek ("Bu oyuncunun şu sahnede ipucuna ihtiyacı var mı?" — girdiler: `seviye`, `karar_suresi_sn`, `onceki_yanlis_sayisi`, `ipucu_sayisi`, `sahne_no`) yalnızca **taban (minimum)** örnektir. Bunu olduğu gibi kopyalamayın; TikTok veya Netflix gibi uyarlamalı sistemlerden ilham alarak *"Yazılım mühendisi olmak isteyen bir insanla maksimum uyumlanan yapay zekâ destekli bir Primer nasıl olurdu?"* sorusuna özgün bir yanıt arayın (ör. tereddüt/bekleme süresi, karar değiştirme, el titremesi/tıklama hızı, seçilen dal/hap, hata örüntüsü, zorluk seviyesi, kötü sona gitme riski).

Koşul: tabular veri, küçük model (lojistik regresyon, küçük karar ağacı vb.), `sklearn → ONNX`. Modelin çıktısı oyunun davranışını gerçekten değiştirmeli: eşik geçilirse tutor ipucu verir, süre baskısı kalkar, anlatım derinliği değişir vb.

Altı adım (artı vize hazırlık düşünce egzersizi), bu sırayla:

1. Spec güncelle
`spec.md`'ye model gereksinimini, eval metriğini ve kabul eşiğini (altın standart), 3 yeni kabul örneğini ekleyin. Eşik eğitimden **ÖNCE** yazılır; eşiği geçmeyen model yayınlanmaz.

2. Veri topla
`data/oturumlar.csv`: her karar bir satır. Veri sözlüğü (`data/SOZLUK.md`) yazın (her sütun ne demek, birimi ne).
- **Gerçek oturumlar (Veri Toplama Modu):** Uygulamanızı veri toplama niyetiyle gerçek insanlara (arkadaşlarınıza) kullandırın. En az **15 gerçek oturum** (örneğin **3 farklı kişiye 5'er oturum** oynatarak çeşitlendirebilirsiniz).
- Sentetik veri serbest; üretici kuralı ve tohumu `README.md`'de yazılı olmalı. Yalnız sentetik veriyle yapılan ödevde Veri kaleminin yarısı alınır.
- `kaynak` sütunu zorunlu: `gercek` | `sentetik`
- **KVKK ve Veri Gizliliği ("Bu çağın madeni veridir"):** Kişilerin hassas alt detayları (ad, e-posta, cihaz kimliği, konum vb.) kesinlikle toplanmaz; oturum kimliği rastgele üretilir.

3. Eğit ve ölç (Tekrarlanabilir Eğitim ve Eval Kapısı)
`train.py` tek komutla çalışır, sabit tohum (`random_state`) kullanır (başka bir ortamda çalıştırıldığında da birebir aynı doğruluğu üretmelidir), metrikleri `config.json`'a yazar. Metrik belirlediğiniz kabul eşiğinin altındaysa betik hata vererek durur ve artefakt yayınlanmaz.

4. Paketle (Somut Artefakt ve Sözleşme)
`model.onnx` + `config.json` (özellik adları ve sırası, sınıf etiketleri, metrikler — aynı zamanda uç nokta/istemci için bir **sözleşme ve JSON şeması** işlevi görür) + `model/README.md` (model kartı: amaç, veri, metrikler, sınırlar, kullanılmaması gereken durumlar). ONNX çıktısının `sklearn` ile farkı `1e-4`'ü geçmemeli; başlangıç reposundaki `onnx_aktar` fonksiyonu bunu kontrol ediyor.

5. Yayınla (Mimari Karar, Ödünleşim ve Sürümleme)
Hugging Face'te public bir model reposu açın (ücretsiz). Tüketiciler modeli `main` dalından değil, commit'e sabitlenmiş URL'den indirir:
`https://huggingface.co/<kullanici>/<repo>/resolve/<commit>/model.onnx`
`RELEASE.md` dosyasında şunları belgelendirin:
- `v2.0`'da ne değişti, hangi commit'e sabitlendi ve sorun çıkarsa bir önceki sürüme nasıl dönülür (**Rollback**).
- **Yeni Sürümü Güvenle Devreye Alma:** Yeni modelin doğrudan herkese açılması yerine **Shadow Deployment (Gölge Dağıtım)** (gerçek veride sessizce çalıştırıp mevcut sürümle kıyaslama), **Canary Deployment (Kanarya Dağıtımı)** (trafiğin %5'ine açma) ve **Progressive Rollout (Aşamalı Geçiş)** (%25 → %50 → %100) adımlarının sizin senaryonuzda nasıl işleyeceği.
- **Mimari Dağıtım Kararı ve Ödünleşim (Trade-off / Feragat) Matrisi:** Modeli nerede çalıştırdığınızın (Tarayıcı `onnxruntime-web`, Cihaz İçi Mobil `React Native / Expo` gömülü ONNX veya Kendi Sunucunuz `Render.com / Rails API`) dersteki 3 temel soruya göre değerlendirmesi:
  1. *İnternet/ağ zorunlu mu ve gecikme (latency) nasıl davranır?* (Cihaz içi mobilde internetsiz çalışır; tarayıcıda ilk indirme gecikmesi vardır; sunucuda her istekte ağ gecikmesi vardır.)
  2. *Veri cihazdan çıkar mı?* (Gizlilik / KVKK açısından değerlendirme.)
  3. *Model gizli kalır mı?* (İstemciye inen modelin açıklığı vs. sunucu tarafında istek-yanıt üzerinden tersine mühendislik / REA riski.)

6. Tüket ve test et (Mobil / Web Çıkarımı, Diferansiyel Test ve Regresyon Testi)
- **Uygulama İçi Çıkarım (Mobil ve/veya Web):** Primer uygulaması modeli **mobil uygulamada (`React Native / Expo` — `onnxruntime-react-native`, cihaz içinde gömülü veya uzaktan)** ve/veya **tarayıcıda (AI Studio / GitHub Pages — `onnxruntime-web`)** çalıştırır. (Derste vurgulandığı üzere başlangıç reposundaki mobil React Native / Expo veya web örneğinden yararlanarak en az bir ortamda uçtan uca çalıştırmanız beklenir.)
- **İkinci Tüketici (Test Kahini / Oracle):** Aynı `model.onnx`'i çalıştıran Python referans betiği (`tests/parite.py`).
- `tests/parite.json`: 5 referans girdi ve Python'un (Oracle) verdiği olasılık.
- **Otomatik Testler (Cypress / Test Süiti):**
  - **(a) Diferansiyel Test (Parite Testi) ve Hata Toleransı:** İki farklı sistemin (Python Oracle vs. Uygulama içi ONNX çıkarımı) aynı referans girdilere verdiği cevapların uyuşmasını kontrol eder. Uygulamadaki olasılık (`data-cy="p"` veya mobil/test çıktısı) ile Python referans olasılığı arasındaki fark **hata toleransı** olan `1e-4`'ten ($10^{-4}$) küçük olmalıdır.
  - **(b) Regresyon Testi:** Geçen haftaki E2E testleri yeni model devreye girdiğinde de kırılmadan geçmelidir (ilk 20 adım geçerken 21. adımda veya önceki adımlarda bozulma olmamalıdır).
- **60–90 saniyelik demo video:** Aynı sahnede modelin iki farklı karar verdiği iki oyuncu (mobil veya web ekran kaydı).

7. Düşünce Egzersizi: "Sizinle Uyumlanan Sınav Tasarımı" (Vizeye Hazırlık)
Derste yaptığımız kapalı kitap klasik sınav provasını (300 girdilik diferansiyel test, test kahini/oracle, karakterizasyon testi, regresyon testi, hata toleransı, doğrulama vs. geçerleme) hatırlayın.
- `SINAV_TASARIMI.md` (veya `README.md` altında ayrı bir bölüm) içinde **1 sayfayı geçmeyecek şekilde** şu soruya yanıt verin: *"Bu sınavı siz olsanız nasıl tasarlardınız? The Primer kullanıcıyla uyumlanan bir sistemdi; peki sizinle uyumlanan, ezberi değil kavramların gerçek özünü ve gerekçesini ölçen 1 sayfalık klasik vize sınav sorusu nasıl olurdu?"*
- Kendi özgün senaryo sorunuzu ve beklediğiniz temel kavramları/çeldiricileri kısaca yazın.


KAPSAM DIŞI

- LLM ince ayarı (fine-tune)
- Ücretli barındırma (Hugging Face Space PRO, ücretli GPU vb.). Ödev tamamen ücretsiz araçlarla (Hugging Face Hub ücretsiz katman, GitHub Pages, AI Studio, Expo, Render.com ücretsiz katman vb.) yapılır.
- Gerçek kişisel veri ya da hasta verisi
- Kullanıcı hesabı, giriş


TESLİM

Teslim formunu doldurun: https://forms.gle/pr9QVEfLJuaFiXw39
Formu doldurmadan önce şu dört linki hazırlayın:
1. GitHub repo linki
2. Hugging Face model linki (commit'li)
3. Canlı uygulama linki (AI Studio / GitHub Pages web linki ve/veya Mobil Expo / APK linki)
4. Demo video linki

Linklerin giriş yapmadan açıldığını gizli pencerede kontrol edin.

Repoda beklenen yapı:
`spec.md` · `data/oturumlar.csv` · `data/SOZLUK.md` · `train.py` · `model/` (`model.onnx`, `config.json`, `README.md`) · `RELEASE.md` · `tests/parite.json` · `tests/parite.py` · `cypress/` · `SINAV_TASARIMI.md` (veya `README.md` içinde) · `README.md` (kurulum en fazla 3 komut)


PUANLAMA (100 puan + 10 bonus)

- Spec ve kabul örnekleri (eşik eğitimden önce tanımlı): 10
- Veri (en az 15 gerçek oturum), veri sözlüğü, `kaynak` sütunu: 10
- Tekrarlanabilir eğitim ve eval kapısı (tek komut, eşik altı sürüm durur): 15
- Somut artefakt (`model.onnx`, sözleşme `config.json`) ve model kartı: 10
- Yayın (HF reposu, commit'e sabit URL, `RELEASE.md` içinde ödünleşim matrisi, Shadow/Canary ve rollback planı): 15
- Uygulamada çıkarım (mobil ve/veya web uygulamasında model kararı oyunun davranışını değiştiriyor): 15
- Diferansiyel test (parite + hata toleransı) ve regresyon E2E testleri (Cypress): 15
- Demo video, `README.md` ve vize sınav tasarımı düşünce egzersizi: 10
- **Bonus +10:** Kendi sunucunuzda çalışan tüketici (ör. **Render.com üzerinde Rails API / `onnxruntime` gem** veya FastAPI) aynı referans girdilerde aynı sonucu (`< 1e-4` tolerans) veriyor.

Model doğruluğu tek başına puan getirmez. Düşük doğruluklu ama dürüstçe ölçülmüş, eşiği ve sınırları kartında yazılı bir model, iyi ama ölçülmemiş bir modelden daha çok puan alır.


KURALLAR VE ÖZEN ("AI SLOP" UYARISI)

- **Coding Agent'ı Yöneten Mühendis Sizsiniz:** Yapay zekâ kodlama ajanlarını (Cursor, Claude Code, Antigravity vb.) kullanmak serbest ve teşvik ediliyor, ancak beyan etmek zorunlu. Ödevi doğrudan ajana yapıştırıp "enter"a basarak herkesinkiyle aynı olan ("iki resim arasındaki farkı bulun") çıktılar üretmeyin. Süreci siz yönetin; geçen her kavramı (diferansiyel test, doğrulama vs. geçerleme, tolerans, gölge dağıtım, ödünleşim) araştırıp öğrenmek için zaman ayırın. `README.md`'nin sonunda hangi aracı hangi adımda kullandığınızı ve hangi çıktıyı elle düzelttiğinizi 3–5 maddeyle yazın.
- **LinkedIn Paylaşımı Zorunlu Değildir:** Sıradan, kopyala-yapıştır ve özensiz içerikleri (**AI slop / çöp**) kesinlikle LinkedIn'de paylaşmayın. Yalnızca emek harcadığınız, özgünleştirdiğiniz ve arkasında durabildiğiniz nitelikli çalışmayı paylaşmak isterseniz paylaşın.
- **Orijinal Kaynaklara İnin:** Bir fikri arkadaşınızdan, bir makaleden ya da yapay zekâdan aldıysanız nereden aldığınızı yazın. Aşağıdaki kaynakların orijinallerini inceleyip `README.md` veya `RELEASE.md` içindeki mimari tartışmalarınızda referans verin.


KAYNAKLAR

- Ders sunumu ve kayıt notları: *Modelden Ürüne: Yapay Zekâ* & *Yazılım Testi Tartışması* (30 Ekim 2026)
- `huggingface-hello-web`: `hf_cli.py` (`train`, `push-model`), `web/index.html` (`onnxruntime-web` ile tarayıcıda çıkarım), mobil (`React Native / Expo` cihaz içi gömülü ONNX) ve sunucu (`Rails API` / Render.com) örnekleri
- Sommerville, *Software Engineering* (10. baskı): Bl. 8 Yazılım Testi (Doğrulama ve Geçerleme / V&V), Bl. 17 Dağıtık Yazılım Mühendisliği, Bl. 18 Servis Odaklı Mimariler, Bl. 25 Konfigürasyon Yönetimi
- Amershi vd. (2019), *Software Engineering for Machine Learning: A Case Study* (Microsoft — yaşayan ML yaşam döngüsü)
- Shankar vd. (2022), *Operationalizing Machine Learning: An Interview Study* (Üretimde ML mühendisliğinin 3V problemi: Velocity, Validation, Versioning)
- Mitchell vd. (2019), *Model Cards for Model Reporting*
- Breck vd. (2017), *The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction*
- Stanford HAI (2025), *AI Index Report* (Çıkarım maliyetlerindeki 300x düşüş) & Gartner (2025), *Küçük Göreve Özel (Dikey) Modeller 2027 Öngörüsü*
- Hugging Face Hub belgeleri (`revision`, `resolve` URL) · ONNX Runtime (`onnxruntime-web`, `onnxruntime-react-native`) · `skl2onnx` · Cypress
