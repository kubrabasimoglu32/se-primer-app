Sınav tasarımı: benimle uyumlanan bir vize sorusu
Soru (senaryo)

SE Primer v2'de zorluk modeli iki yerde çalışıyor: test kahini (oracle) olarak Python (onnxruntime) ve uygulamada tarayıcı (onnxruntime-web). Diferansiyel testin hata toleransı 1e-4, karar eşiği 0.5 (p ≥ 0.5 → zor soru). Bir öğrenci profili için Python 0.50003, tarayıcı 0.49997 veriyor.

a) Diferansiyel test bu girdide geçer mi? Neden? (3 puan) b) Python ve uygulama bu öğrenciye hangi soruyu verir? Bu bir hata mı? (4 puan) c) Bu durumu yakalayacak ek bir test önerin. Hangi girdileri seçersiniz, neden? (4 puan) d) Ekipten biri "Tolerans 1e-2 olsun, testler hiç kalmasın" diyor. Katılır mısınız? (4 puan) e) Parite testi 5/5 geçti. Bu, modelin öğrencilere doğru zorlukta soru verdiğini gösterir mi? (5 puan)

Ölçtüğü kavramlar

Diferansiyel test ve test kahini, hata toleransı, sınır değer analizi, doğrulama ve geçerleme (V&V) ayrımı.

Beklenen cevabın özü
a) Fark 6·10⁻⁵ < 10⁻⁴, test geçer. Olasılıklar float32 hassasiyetinde aynı kabul edilir.
b) Python zor, uygulama kolay soru verir. Olasılık paritesi geçti ama karar paritesi bozuldu. Kod hatası değil (float32 hesap sırası farkı), yine de kullanıcının gördüğü davranış farklılaşıyor.
c) Olasılığın yanında kararı da karşılaştıran bir test ve bilerek eşiğe yakın seçilmiş girdiler (|p − 0.5| < 0.01). Rastgele 300 girdi bu dar bölgeyi kaçırabilir; sınır değerleri bilerek seçmek gerekir.
d) Hayır. Tolerans testin geçmesi için değil, float32'nin gerçek hassasiyetine göre seçilir. 10⁻⁴ zaten geniş bir pay. 10⁻² yapmak gerçek bir dönüşüm hatasını (ör. özellik sırası kayması) gizleyebilir.
e) Hayır. Parite doğrulamadır ("sistemi doğru mu kurduk?": iki çalıştırma aynı mı). Modelin öğrenciye uygun soru vermesi geçerlemedir ("doğru sistemi mi kurduk?"). Bunu gerçek veri gösterir. Bizde gerçek satırlarda AUC 0.60 ve ezber yapan öğrenci hızlı ama başarılı çıktı. Bu gerçek kullanımda (Shadow) ölçülür, parite testiyle değil.
Çeldiriciler
"Fark çok küçük, sorun yok": (a)'da doğru, (b)'de yanlış. Küçük fark eşikte büyük sonuç doğurur.
"Python doğrudur, tarayıcı yanlıştır": Kahin bir referanstır, mutlak doğru değildir. İkisi birlikte de yanılabilir.
"Toleransı büyütelim": Testi yeşile boyar, hatayı yakalama gücünü azaltır.
"Testler geçiyorsa model iyidir": Doğrulamayı geçerleme sanmak.
Neden bu soru ezberi değil anlayışı ölçer?

Tanımları ezberleyen öğrenci (a)'yı yapar ama (b)'de takılır, çünkü olasılık ile kararı ayırması gerekir. Alt sorular birbirinin üstüne kurulu: (a)'da "geçti, tamam" diyen öğrenciyi (b) yakalar. (b)'yi görüp "toleransı değiştirelim" diyen öğrenciyi (d) yakalar. Primer'in yanlış seçimden sonra aynı konuyu tekrar sorması gibi, soru öğrencinin verdiği cevaba göre bir sonraki adımda onu sınar. Puan sonuca değil gerekçeye verilir.