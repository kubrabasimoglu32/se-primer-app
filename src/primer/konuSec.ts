/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BankSoru, Konu, KonuZorlukHaritasi, ProjeKarti, SecilmisSoru, Zorluk, ZorlukTercihi } from "../types/sePrimer";
import soruBankasiData from "../data/soruBankasi.json";

const ASAMA_KONULARI: Record<string, Konu[]> = {
  fikir: ["kapsam"],
  tasarim: ["mimari", "veriTabani"],
  kodlama: ["dosyaDuzeni", "veriTabani", "test"],
  test: ["test", "guvenlik"],
  teslim: ["dagitim", "rapor", "guvenlik"],
  bitti: ["rapor", "dagitim", "test"],
};

const DEGISIKLIK_HARITASI: Record<string, { konu: Konu; soruId?: string }> = {
  yeniOzellik: { konu: "kapsam", soruId: "K-01" },
  plan: { konu: "kapsam", soruId: "K-01" },
  veriTabani: { konu: "veriTabani", soruId: "V-01" },
  testEkledim: { konu: "test", soruId: "T-01" },
  yayinaAldim: { konu: "dagitim", soruId: "Y-01" },
  hataCikti: { konu: "rapor", soruId: "R-03" },
};

/** Değişiklik tetikli 2. soruda gösterilen not (spec §10.7 örnek 9). */
const DEGISIKLIK_NOTLARI: Record<string, string> = {
  yeniOzellik: "Yeni bir özellik ya da API eklediğini söyledin.",
  plan: "Kapsamın ya da teslim planının değiştiğini söyledin.",
  veriTabani: "Veri tabanı yapını değiştirdiğini söyledin.",
  testEkledim: "Test yazdığını söyledin.",
  yayinaAldim: "Projeyi yayına aldığını söyledin.",
  hataCikti: "Kritik bir hata çıkıp düzeltildiğini söyledin.",
};

export const SORU_IPUCLARI: Record<string, string> = {
  "K-01": "Kapsam dışı listesi hazırlamak, demoda yarım kalan özelliklerin bozulmasını önler.",
  "K-02": "İyi bir kabul kriteri somut bir girdi ve gözlenebilir bir çıktı içerir (ör. 'Giriş yapınca ana sayfa açılır').",
  "M-01": "Tarayıcıdaki JavaScript koduna kullanıcı müdahale edebilir; kritik veri yazma kuralları sunucuda olmalıdır.",
  "M-02": "Trafik patlamasında ezbere sunucu büyütmek yerine, önce en yavaş çalışan veritabanı sorgusunu tespit edin.",
  "M-03": "Parçalar arası bağımlılık şeması, yapacağınız bir değişikliğin nereleri bozacağını görmenizi sağlar.",
  "V-01": "Veritabanı yapısı değiştiğinde eski kayıtların bozulmaması için bir migration (taşıma) planı şarttır.",
  "V-02": "KVKK gereği silinen kullanıcının kişisel verileri temizlenmeli ya da anonimleştirilmelidir.",
  "V-03": "Firestore kurallarında 'allow read, write: if true;' kalırsa herkes tüm veritabanını silebilir.",
  "V-04": "Geri yüklemesi test edilmemiş bir yedek, gerçekte var olmayan bir yedektir.",
  "D-01": "Birlikte değişen dosyaların aynı klasörde olması bakım ve arama maliyetini azaltır.",
  "D-02": "API anahtarlarını (.env) repoya göndermemek için .gitignore'a eklemek temel güvenlik kuralıdır.",
  "D-03": "Klasör adları işlevi yansıtmalıdır; iyi bir mimari yeni ekip üyesine kendini anlatır.",
  "T-01": "Kısıtlı sürede kullanıcının en çok canını yakacak ana akışı (happy path) test etmek en yüksek faydayı sağlar.",
  "T-02": "Kritik akışın çöktüğünü kullanıcılardan önce anlamanın yolu otomatik izleme ve testlerdir.",
  "T-03": "Yapay zekânın ürettiği testler sahte nesneleri deneyebilir; kendi gerçek kabul örneğinizle doğrulayın.",
  "G-01": "Toplanma amacı kalmayan kişisel veriyi tutmamak, sızıntı anındaki yasal riski sıfırlar.",
  "G-02": "Hata ayıklarken gerçek kişi verisi yerine yapısını koruyan sahte (maskelenmiş) veri kullanın.",
  "G-03": "İstemciye (tarayıcıya) giden bundle içine gizli API anahtarları asla konmamalıdır.",
  "Y-01": "Canlıya çıkarken her zaman önceki çalışan kararlı sürüme 5 dakikada dönebilecek bir plan yapın.",
  "Y-02": "Hızlı geri dönüş (rollback) yolu olmayan bir dağıtım kumar oynamaktır.",
  "R-01": "README'de gereksinimler, ortam değişkenleri ve 3 adımlı çalıştırma komutu yer almalıdır.",
  "R-02": "Teknik kararların ve nedenlerini yazılı tutmak, ekibin hafızasını korur.",
  "R-03": "Düzeltilen bir hatanın ardından onu yakalayan bir test yazılmazsa hata iki hafta sonra geri gelebilir.",
};

/**
 * Metindeki {proje}, {veriTabani}, {onYuz}, {arkaUc} gibi yer tutucuları doldurur.
 */
function metinDoldur(soru: BankSoru, kart: ProjeKarti): string {
  let hamMetin = soru.metin;

  // V-03 özel koşul metinleri
  if (soru.id === "V-03") {
    const vt = (kart.teknoloji.veriTabani || "").toLowerCase();
    if (vt.includes("fire") && soru.metinFirebase) {
      hamMetin = soru.metinFirebase;
    } else if (vt.match(/(sql|postgres|mysql|sqlite)/) && soru.metinSql) {
      hamMetin = soru.metinSql;
    }
  }

  // Klasör ve dosya sayısı varsayılanları
  let enKalabalikKlasor = "src/components";
  let dosyaSayisi = "12";
  if (kart.dosyaYapisi) {
    if (kart.dosyaYapisi.includes("components")) enKalabalikKlasor = "src/components";
    else if (kart.dosyaYapisi.includes("services")) enKalabalikKlasor = "src/services";
  }

  return hamMetin
    .replace(/{proje}/g, kart.ad || "Proje")
    .replace(/{veriTabani}/g, kart.teknoloji.veriTabani || "veri tabanı")
    .replace(/{onYuz}/g, kart.teknoloji.onYuz || "ön yüz")
    .replace(/{arkaUc}/g, kart.teknoloji.arkaUc || "arka uç")
    .replace(/{enKalabalikKlasor}/g, enKalabalikKlasor)
    .replace(/{dosyaSayisi}/g, dosyaSayisi);
}

/**
 * Sorunun tetik koşullarının proje kartıyla uyuşup uyuşmadığını doğrular (Kural 6)
 */
function soruTetikUyarMi(
  soru: BankSoru,
  kart: ProjeKarti,
  degisiklikler: string[]
): boolean {
  const { tetik } = soru;
  if (!tetik) return true;
  if (tetik.her) return true;

  // 1. Aşama kontrolü
  if (tetik.asama && !tetik.asama.includes(kart.asama)) {
    return false;
  }

  // 2. Değişiklik kontrolü (eğer soruda özellikle değişiklik şartı varsa)
  if (tetik.degisiklik) {
    const eslesme = tetik.degisiklik.some((d) => degisiklikler.includes(d));
    if (!eslesme) return false;
  }

  // 3. Mimari kontrolü
  if (tetik.mimari) {
    const mimariStr = (kart.mimari || "").toLowerCase();
    const eslesme = tetik.mimari.some(
      (m) =>
        mimariStr.includes(m.toLowerCase()) ||
        (m === "bilmiyorum" && kart.bilmedigiKonu === "mimari")
    );
    if (!eslesme) return false;
  }

  // 4. Veritabanı türü kontrolü
  if (tetik.veriTabani) {
    const vtStr = (kart.teknoloji.veriTabani || "").toLowerCase();
    const eslesme = tetik.veriTabani.some((v) => vtStr.includes(v.toLowerCase()));
    if (!eslesme) return false;
  }

  // 5. Dosya yapısı var mı?
  if (tetik.dosyaYapisiVar !== undefined) {
    const varMi = Boolean(kart.dosyaYapisi && kart.dosyaYapisi.trim().length > 0);
    if (tetik.dosyaYapisiVar !== varMi) return false;
  }

  // 6. Test durumu
  if (tetik.test) {
    const testPuani = kart.beceri.test;
    const testHicMi =
      testPuani <= 1 ||
      kart.aciklama.toLowerCase().includes("test: hiç") ||
      kart.acikRiskler.some((r) => r.toLowerCase().includes("test"));
    const eslesme =
      (tetik.test.includes("hic") && testHicMi) ||
      (tetik.test.includes("biraz") && testPuani >= 1 && testPuani <= 3);
    if (!eslesme) return false;
  }

  // 7. Kişisel veri durumu
  if (tetik.kisiselVeri) {
    const kv = (kart.kisiselVeri || "").toLowerCase();
    const kvVar = kv.includes("evet") || !kv.includes("hayır");
    const eslesme = tetik.kisiselVeri.some((k) =>
      k === true ? kvVar : k === "bilmiyorum" ? kv.includes("bilmiyorum") : false
    );
    if (!eslesme) return false;
  }

  return true;
}

/**
 * Son 3 oturumda sorulmuş soru ID'lerini döndürür (Kural 7)
 */
function getSonOturumSoruIdleri(kart: ProjeKarti): Set<string> {
  const set = new Set<string>();
  const sonOturumlar = kart.oturumlar.slice(-3);
  sonOturumlar.forEach((oturum) => {
    oturum.sorular.forEach((s) => set.add(s.soruId));
  });
  return set;
}

/**
 * Eski kuralın uygun bulduğu adaylar içinden istenen zorluktakini seçer.
 * Zorluk tercihi yoksa ya da o zorlukta aday yoksa eski kural gibi ilk adayı döndürür.
 */
function zorlugaGoreSec(adaylar: BankSoru[], istenenZorluk?: Zorluk): BankSoru {
  if (istenenZorluk) {
    const eslesen = adaylar.find((s) => s.zorluk === istenenZorluk);
    if (eslesen) return eslesen;
  }
  return adaylar[0];
}

/**
 * Belirli bir konudan kart koşullarına en uygun soruyu seçer.
 * istenenZorluk yalnızca aynı öncelik basamağındaki adaylar arasında tercih yapar;
 * eski kuralların (öncelikli soru, tetik, son 3 oturum) önüne geçmez.
 */
function konudanSoruBul(
  konu: Konu,
  kart: ProjeKarti,
  degisiklikler: string[],
  sonSoruIdleri: Set<string>,
  haricIdler: Set<string>,
  oncelikliSoruId?: string,
  istenenZorluk?: Zorluk
): BankSoru | null {
  const banka = (soruBankasiData.sorular as unknown) as BankSoru[];
  const konununSorulari = banka.filter((s) => s.konu === konu);

  // Eğer öncelikli bir soru ID'si istenmişse (örneğin V-01 veya Y-01)
  if (oncelikliSoruId) {
    const ozelSoru = konununSorulari.find((s) => s.id === oncelikliSoruId);
    if (ozelSoru && !haricIdler.has(ozelSoru.id)) {
      return ozelSoru;
    }
  }

  // 1. Tercih: Koşullara uyan VE son 3 oturumda sorulmamış
  const tazeVeUyan = konununSorulari.filter(
    (s) =>
      !haricIdler.has(s.id) &&
      !sonSoruIdleri.has(s.id) &&
      soruTetikUyarMi(s, kart, degisiklikler)
  );
  if (tazeVeUyan.length > 0) return zorlugaGoreSec(tazeVeUyan, istenenZorluk);

  // 2. Tercih: Koşullara uyan (son 3 oturumda sorulmuş olsa bile alternatif yoksa)
  const uyan = konununSorulari.filter(
    (s) => !haricIdler.has(s.id) && soruTetikUyarMi(s, kart, degisiklikler)
  );
  if (uyan.length > 0) return zorlugaGoreSec(uyan, istenenZorluk);

  // 3. Fallback: Konudaki herhangi bir soru
  const herhangi = konununSorulari.filter((s) => !haricIdler.has(s.id));
  return herhangi.length > 0 ? zorlugaGoreSec(herhangi, istenenZorluk) : null;
}

/**
 * SE Primer Ana Seçim Algoritması:
 * konuSec(kart, degisiklikler, zorlukTercihi?) → 3 soru.
 *
 * Saf bir fonksiyon olarak çalışır: rastgelelik (yazı-tura) ya da model çağrısı burada yapılmaz,
 * zorluk tercihi dışarıdan parametre olarak gelir (spec §10). Tercih yalnız 1. ve 3. soruya uygulanır;
 * 2. soru (değişiklik tetikli) her zaman eski kuralla seçilir. Tercih verilmezse davranış v1 ile aynıdır.
 *
 * İki tür tercih var:
 * - zorlukTercihi: slot başına (Veri Toplama Modu'nda yazı-tura).
 * - konuZorluk: konu başına (zorluk modeli, spec §10.3). Slot 1 ve 3'ün konusu bu fonksiyonda belirlendiği için
 *   model 8 konunun hepsi için karar verir, burada o slotun konusuna ait değer kullanılır.
 * İkisi birden verilirse slot tercihi önce gelir.
 */
export function konuSec(
  kart: ProjeKarti,
  degisiklikler: string[] = [],
  zorlukTercihi: ZorlukTercihi = {},
  konuZorluk: KonuZorlukHaritasi = {}
): SecilmisSoru[] {
  const istenen = (slot: 1 | 3, konu: Konu): Zorluk | undefined => zorlukTercihi[slot] ?? konuZorluk[konu];
  const banka = (soruBankasiData.sorular as unknown) as BankSoru[];
  const sonSoruIdleri = getSonOturumSoruIdleri(kart);
  const secilenKonular = new Set<Konu>();
  const secilenSoruIdleri = new Set<string>();
  const secilmisSorular: SecilmisSoru[] = [];

  const tumKonular: Konu[] = [
    "kapsam",
    "mimari",
    "veriTabani",
    "dosyaDuzeni",
    "test",
    "guvenlik",
    "dagitim",
    "rapor",
  ];

  // ==========================================
  // KURAL 5: İLK OTURUM KURALI
  // 1) öğrenmek istediği konu
  // 2) "bilmiyorum" dediği bir konu
  // 3) aşama sorusu
  // ==========================================
  if (kart.oturumlar.length === 0) {
    // 1. Öğrenmek istediği konu
    const ogrenmekIstedigi: Konu =
      kart.ogrenmekIstedigiKonu ||
      (kart.asama === "fikir" ? "kapsam" : "mimari");
    secilenKonular.add(ogrenmekIstedigi);

    const s1 = konudanSoruBul(ogrenmekIstedigi, kart, degisiklikler, sonSoruIdleri, secilenSoruIdleri, undefined, istenen(1, ogrenmekIstedigi));
    if (s1) {
      secilenSoruIdleri.add(s1.id);
      secilmisSorular.push({
        ...s1,
        metin: metinDoldur(s1, kart),
        secimNedeni: `İlk Oturum: Öncelikli öğrenmek/netleştirmek istediğin konu (${ogrenmekIstedigi})`,
      });
    }

    // 2. "Bilmiyorum" dediği bir konu
    const bilmedigiAdaylar: Konu[] = [
      kart.bilmedigiKonu,
      "guvenlik",
      "veriTabani",
      "test",
      "mimari",
    ].filter(Boolean) as Konu[];

    const bilmedigiKonu =
      bilmedigiAdaylar.find((k) => !secilenKonular.has(k)) ||
      tumKonular.find((k) => !secilenKonular.has(k))!;

    secilenKonular.add(bilmedigiKonu);
    const s2 = konudanSoruBul(bilmedigiKonu, kart, degisiklikler, sonSoruIdleri, secilenSoruIdleri);
    if (s2) {
      secilenSoruIdleri.add(s2.id);
      secilmisSorular.push({
        ...s2,
        metin: metinDoldur(s2, kart),
        secimNedeni: `İlk Oturum: Henüz netleştirilmemiş veya 'bilmiyorum' dediğin alan (${bilmedigiKonu})`,
      });
    }

    // 3. Aşama sorusu
    const asamaAdaylari = (ASAMA_KONULARI[kart.asama] || ["mimari", "test"]).sort(
      (a, b) => (kart.beceri[a] ?? 0) - (kart.beceri[b] ?? 0)
    );
    const asamaKonu =
      asamaAdaylari.find((k) => !secilenKonular.has(k)) ||
      tumKonular.find((k) => !secilenKonular.has(k))!;

    secilenKonular.add(asamaKonu);
    const s3 = konudanSoruBul(asamaKonu, kart, degisiklikler, sonSoruIdleri, secilenSoruIdleri, undefined, istenen(3, asamaKonu));
    if (s3) {
      secilenSoruIdleri.add(s3.id);
      secilmisSorular.push({
        ...s3,
        metin: metinDoldur(s3, kart),
        secimNedeni: `${kart.asama.toUpperCase()} aşamasının kritik değerlendirme konusu (${asamaKonu})`,
      });
    }

    return slotlariIsaretle(secilmisSorular, zorlukTercihi, konuZorluk);
  }

  // ==========================================
  // KURAL 2: SORU 1 (AŞAMA SORUSU)
  // kartın aşamasına uyan konular içinden beceri puanı en düşük konu.
  // fikir→kapsam; tasarim→mimari, veriTabani; kodlama→dosyaDuzeni, veriTabani, test;
  // test→test, guvenlik; teslim→dagitim, rapor, guvenlik.
  // ==========================================
  const asamaAdayKonular = (ASAMA_KONULARI[kart.asama] || ["mimari"]).sort(
    (a, b) => (kart.beceri[a] ?? 0) - (kart.beceri[b] ?? 0)
  );

  const soru1Konu = asamaAdayKonular[0] || "kapsam";
  secilenKonular.add(soru1Konu);

  const soru1 = konudanSoruBul(
    soru1Konu,
    kart,
    degisiklikler,
    sonSoruIdleri,
    secilenSoruIdleri,
    undefined,
    istenen(1, soru1Konu)
  );
  if (soru1) {
    secilenSoruIdleri.add(soru1.id);
    secilmisSorular.push({
      ...soru1,
      metin: metinDoldur(soru1, kart),
      secimNedeni: `Aşama sorusu: ${kart.asama.toUpperCase()} aşamasında ${soru1Konu} becerin en düşük (${kart.beceri[soru1Konu] || 0}/5)`,
    });
  }

  // ==========================================
  // KURAL 3: SORU 2 (DEĞİŞİKLİK SORUSU)
  // işaretlenen değişikliğin tetiklediği soru.
  // yeniOzellik/plan→kapsam, veriTabani→V-01, testEkledim→test, yayinaAldim→Y-01 veya G-03,
  // hataCikti→R-03 veya G-02. Değişiklik yoksa açık risklerden birinin konusu.
  // ==========================================
  let soru2Konu: Konu | null = null;
  let soru2OzelId: string | undefined = undefined;
  let soru2Nedeni = "Son oturumdan bu yana yapılan değişiklik";
  let soru2Notu: string | undefined = undefined;

  // Eşleşen bir değişiklik var mı?
  for (const deg of degisiklikler) {
    const eslesme = DEGISIKLIK_HARITASI[deg];
    if (eslesme && !secilenKonular.has(eslesme.konu)) {
      soru2Konu = eslesme.konu;
      soru2OzelId = eslesme.soruId;
      soru2Nedeni = `İşaretlediğin '${deg}' değişikliği tetikledi`;
      soru2Notu = DEGISIKLIK_NOTLARI[deg];
      break;
    }
  }

  // Değişiklik yoksa veya seçilen konu zaten kullanıldıysa: açık risklerden birinin konusu
  if (!soru2Konu) {
    // Açık risklerden konu çıkarımı
    const riskKonulari: Konu[] = [];
    kart.acikRiskler.forEach((risk) => {
      const r = risk.toLowerCase();
      if (r.includes("test")) riskKonulari.push("test");
      else if (r.includes("veri") || r.includes("firestore")) riskKonulari.push("veriTabani");
      else if (r.includes("kvkk") || r.includes("güvenlik") || r.includes("api anahtar")) riskKonulari.push("guvenlik");
      else if (r.includes("mimari") || r.includes("şema")) riskKonulari.push("mimari");
      else if (r.includes("dosya") || r.includes("klasör")) riskKonulari.push("dosyaDuzeni");
      else if (r.includes("yayın") || r.includes("dağıtım")) riskKonulari.push("dagitim");
      else if (r.includes("readme") || r.includes("rapor")) riskKonulari.push("rapor");
    });

    const riskAdayi = riskKonulari.find((k) => !secilenKonular.has(k));
    if (riskAdayi) {
      soru2Konu = riskAdayi;
      soru2Nedeni = `Açık risk analizi: Projende ${riskAdayi} alanında açık risk devam ediyor`;
    } else {
      // Kalan konulardan en düşük puanlı olan
      const kalanKonular = tumKonular
        .filter((k) => !secilenKonular.has(k))
        .sort((a, b) => (kart.beceri[a] ?? 0) - (kart.beceri[b] ?? 0));
      soru2Konu = kalanKonular[0] || "veriTabani";
      soru2Nedeni = `Geliştirme kontrolü: ${soru2Konu} alanındaki mevcut durum`;
    }
  }

  secilenKonular.add(soru2Konu);
  const soru2 = konudanSoruBul(
    soru2Konu,
    kart,
    degisiklikler,
    sonSoruIdleri,
    secilenSoruIdleri,
    soru2OzelId
  );
  if (soru2) {
    secilenSoruIdleri.add(soru2.id);
    secilmisSorular.push({
      ...soru2,
      metin: metinDoldur(soru2, kart),
      secimNedeni: soru2Nedeni,
      ...(soru2Notu ? { degisiklikNotu: soru2Notu } : {}),
    });
  }

  // ==========================================
  // KURAL 4: SORU 3 (ZAYIF KONU & GEÇMİŞ YÜKSEK RİSK TAKİBİ)
  // beceri puanı en düşük konu. Eğer daha önce "yuksek" riskli
  // bir seçim yapılmışsa ve üzerinden en az 2 oturum geçmişse, o konunun
  // sorusunu tekrar sor ve başına "Geçen sefer ... seçmiştin" notu ekle.
  // ==========================================
  let soru3Konu: Konu | null = null;
  let soru3OncekiNot: string | undefined = undefined;
  let soru3Nedeni = "";
  let soru3TekrarId: string | undefined = undefined;

  // Geçmiş yüksek riskli seçimleri incele (üzerinden en az 2 oturum geçmişse)
  const toplamOturum = kart.oturumlar.length;
  for (let i = 0; i <= toplamOturum - 2; i++) {
    const gecmisOturum = kart.oturumlar[i];
    for (const sc of gecmisOturum.sorular) {
      if (
        (sc.riskDerecesi === "yuksek" || (sc.risk && sc.risk.length > 0)) &&
        tumKonular.includes(sc.konu as Konu) &&
        !secilenKonular.has(sc.konu as Konu)
      ) {
        soru3Konu = sc.konu as Konu;
        soru3TekrarId = sc.soruId;
        soru3OncekiNot = `Geçen sefer '${sc.cevap}' seçmiştin.`;
        soru3Nedeni = `Geçmiş risk takibi: Oturum #${gecmisOturum.no}'de ${soru3Konu} konusunda yüksek riskli tercih yapılmıştı`;
        break;
      }
    }
    if (soru3Konu) break;
  }

  // Eğer geçmiş yüksek risk yoksa veya konu zaten kullanıldıysa: kalan konulardan beceri puanı en düşük olan
  if (!soru3Konu) {
    const kalanZayifKonular = tumKonular
      .filter((k) => !secilenKonular.has(k))
      .sort((a, b) => (kart.beceri[a] ?? 0) - (kart.beceri[b] ?? 0));
    soru3Konu = kalanZayifKonular[0] || "test";
    soru3Nedeni = `Zayıf konu analizi: Beceri puanı en düşük olan ${soru3Konu} alanı (${kart.beceri[soru3Konu] || 0}/5)`;
  }

  secilenKonular.add(soru3Konu);
  const soru3 = konudanSoruBul(
    soru3Konu,
    kart,
    degisiklikler,
    sonSoruIdleri,
    secilenSoruIdleri,
    soru3TekrarId,
    istenen(3, soru3Konu)
  );
  if (soru3) {
    secilenSoruIdleri.add(soru3.id);
    secilmisSorular.push({
      ...soru3,
      metin: metinDoldur(soru3, kart),
      secimNedeni: soru3Nedeni,
      oncekiSecimNotu: soru3OncekiNot,
    });
  }

  // 3 sorunun tam olarak 3 farklı konudan oluşmasını garantile
  while (secilmisSorular.length < 3) {
    const kalan = tumKonular.find((k) => !secilenKonular.has(k)) || "kapsam";
    secilenKonular.add(kalan);
    const yedek = konudanSoruBul(kalan, kart, degisiklikler, sonSoruIdleri, secilenSoruIdleri);
    if (yedek) {
      secilenSoruIdleri.add(yedek.id);
      secilmisSorular.push({
        ...yedek,
        metin: metinDoldur(yedek, kart),
        secimNedeni: `Gelişim alanı: ${kalan} konusu kontrolü`,
      });
    } else {
      break;
    }
  }

  return slotlariIsaretle(secilmisSorular, zorlukTercihi, konuZorluk);
}

/**
 * İpucunu doldurur, her soruya oturumdaki sırasını (slot) ve o slot için istenen zorluğu yazar.
 * Gösterilen sorunun gerçek zorluğu `zorluk` alanındadır; istenenle farklıysa kayıtta "yedek" sayılır.
 */
function slotlariIsaretle(
  sorular: SecilmisSoru[],
  zorlukTercihi: ZorlukTercihi,
  konuZorluk: KonuZorlukHaritasi
): SecilmisSoru[] {
  return sorular.map((s, idx) => {
    const slot = (idx + 1) as 1 | 2 | 3;
    const istenenZorluk = slot === 1 || slot === 3 ? zorlukTercihi[slot] ?? konuZorluk[s.konu] : undefined;
    return {
      ...s,
      ipucu: s.ipucu || SORU_IPUCLARI[s.id] || "Sistemin ölçeğini ve uzun vadeli bakımını göz önünde bulundurun.",
      slot,
      ...(istenenZorluk ? { istenenZorluk } : {}),
    };
  });
}
