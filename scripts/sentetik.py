"""Sentetik oyuncu verisi üretir → data/sentetik.csv (kaynak = "sentetik").

ÜRETİCİ KURALI (tohum: SEED = 13, tek bir random.Random(13) üretici; CLAUDE.md kural 4)
-------------------------------------------------------------------------------------------
- 45 sahte oyuncu. seviye 0/1/2 dengeli: her seviyeden 15 oyuncu (sıra karıştırılır).
- Her oyuncunun kendi proje_id'si var (tohumlu UUID v4). Her oturumun da tohumlu bir oturum_id'si var.
- Her oyuncu 4–6 oturum oynar; her oturumda 3 soru, yani her soru bir satır.
- Sorular uygulamadaki konuSec kuralıyla (src/primer/konuSec.ts, Python'a taşındı) gerçek soru bankasından
  (src/data/soruBankasi.json) seçilir. Slot 1 ve 3'te istenen zorluk yazı-turayla belirlenir; slot 2 bankadaki
  gerçek zorluğuyla gelir. Uygulamadaki gibi, istenen zorlukta uygun soru yoksa diğeri gösterilir:
  soru_zorlugu gösterilen sorunun zorluğudur ve zorluk_kaynagi = "yedek" olur.
- Özellikler uygulamadaki mantıkla, oyuncunun önceki satırlarından hesaplanır (src/primer/veriToplama.ts):
    konu_beceri_puani        : oturum başındaki beceri puanı. Başlangıç değerleri tanışma ekranındakiyle aynı.
                               Oturum sonunda konu başına puan farkı eklenir ve sonuç 0–5 aralığına sıkıştırılır.
                               Puan farkı: düşük risk +1, orta 0, yüksek −1; kontrol sorusunda Evet +1, Hayır/Emin değilim 0.
                               Tutor bonusu (+1, "yeterli") yok: Pages'te /api çalışmaz ve tutor hep "kismen" döner.
    konudaki_onceki_*        : bu konuda önceki oturumlardaki cevap sayısı ve orta/yüksek riskli cevap sayısı.
    son_karar_suresi_sn,
    son_gerekce_uzunlugu     : bir önceki sorunun değerleri. Oturumun 1. sorusunda önceki oturumun son sorusu
                               kullanılır; ölçüm yoksa 0.
    oturum_no                : önceki oturum sayısı + 1.
  Açık riskler de uygulamadaki gibi güncellenir: yüksek riskli seçim ve kontrolde Hayır/Emin değilim risk ekler,
  kontrolde Evet riski kapatır. Böylece konuSec'in 2. ve 3. soru kuralları da uygulamadaki gibi çalışır.
- Etiket (basari) aşağıdaki olasılıkla çekilir. Olasılık yalnız soru gösterilmeden önce bilinen girdilere bağlıdır:
      z = -0.4 + 0.5*seviye + 0.45*(konu_beceri_puani - 2.5) - 0.7*konudaki_onceki_riskli_sayisi
          + 0.15*oturum_no + 0.01*son_gerekce_uzunlugu - 0.04*max(0, 8 - son_karar_suresi_sn)
      zor satır   (soru_zorlugu = 1): p(basari = 1) = sigmoid(z)
      kolay satır (soru_zorlugu = 0): p(basari = 1) = sigmoid(z + 1.2)
  basari = 1 ise düşük riskli seçenek ya da "Evet" seçilir. basari = 0 ise kalan seçeneklerden biri eşit olasılıkla
  seçilir (karar sorusunda orta/yüksek; kontrol sorusunda Hayır = yüksek, Emin değilim = orta).
- Davranış ölçümleri (sonraki satırın son_* girdileri olur):
    karar_suresi_sn   : log-normal, medyanı 9 − 1.0*seviye sn, sigma 0.5; 1–90 sn arasına kırpılır, 2 ondalık.
    gerekçe uzunluğu  : (0.35 + 0.15*seviye) olasılıkla 15–140 karakter (tamsayı, düzgün dağılım); aksi hâlde 0.
                        Metin üretilmez, yalnız uzunluk tutulur.
- Proje kartı (tanışma) her oyuncu için rastgele seçilir: aşama, mimari, veri tabanı, kişisel veri,
  öğrenmek istediği konu ve bilmediği konu. 1. oturumun değişiklikleri ["plan"]dır (uygulamadaki gibi).
  Sonraki oturumlarda her değişiklik anahtarı 0.25 olasılıkla işaretlenir.

Kullanım:  python scripts/sentetik.py  →  data/sentetik.csv
Ardından:  python scripts/birlestir.py →  data/oturumlar.csv (gerçek + sentetik)
"""

from __future__ import annotations

import csv
import json
import math
import random
import uuid
from pathlib import Path

SEED = 13
OYUNCU_SAYISI = 45
OTURUM_ARALIGI = (4, 6)

KOK = Path(__file__).resolve().parent.parent
BANKA = json.loads((KOK / "src" / "data" / "soruBankasi.json").read_text(encoding="utf-8"))["sorular"]
CIKTI = KOK / "data" / "sentetik.csv"

# data/SOZLUK.md ve src/primer/veriToplama.ts CSV_SUTUNLARI ile aynı sıra.
SUTUNLAR = [
    "proje_id", "oturum_id", "soru_id", "konu", "slot", "seviye", "konu_beceri_puani",
    "konudaki_onceki_soru_sayisi", "konudaki_onceki_riskli_sayisi", "son_karar_suresi_sn",
    "son_gerekce_uzunlugu", "oturum_no", "soru_zorlugu", "zorluk_kaynagi", "karar_suresi_sn",
    "basari", "kaynak", "p_model",
]

TUM_KONULAR = ["kapsam", "mimari", "veriTabani", "dosyaDuzeni", "test", "guvenlik", "dagitim", "rapor"]

# --------------------------------------------------------------------------- konuSec.ts (Python'a taşındı)

ASAMA_KONULARI = {
    "fikir": ["kapsam"],
    "tasarim": ["mimari", "veriTabani"],
    "kodlama": ["dosyaDuzeni", "veriTabani", "test"],
    "test": ["test", "guvenlik"],
    "teslim": ["dagitim", "rapor", "guvenlik"],
    "bitti": ["rapor", "dagitim", "test"],
}

DEGISIKLIK_HARITASI = {
    "yeniOzellik": ("kapsam", "K-01"),
    "plan": ("kapsam", "K-01"),
    "veriTabani": ("veriTabani", "V-01"),
    "testEkledim": ("test", "T-01"),
    "yayinaAldim": ("dagitim", "Y-01"),
    "hataCikti": ("rapor", "R-03"),
}
DEGISIKLIK_ANAHTARLARI = ["veriTabani", "yeniOzellik", "plan", "testEkledim", "yayinaAldim", "hataCikti"]


def tetik_uyar_mi(soru: dict, kart: dict, degisiklikler: list[str]) -> bool:
    t = soru.get("tetik")
    if not t or t.get("her"):
        return True
    if t.get("asama") and kart["asama"] not in t["asama"]:
        return False
    if t.get("degisiklik") and not any(d in degisiklikler for d in t["degisiklik"]):
        return False
    if t.get("mimari"):
        m_str = kart["mimari"].lower()
        if not any(m.lower() in m_str or (m == "bilmiyorum" and kart["bilmedigiKonu"] == "mimari") for m in t["mimari"]):
            return False
    if t.get("veriTabani"):
        vt = kart["veriTabani"].lower()
        if not any(v.lower() in vt for v in t["veriTabani"]):
            return False
    if "dosyaYapisiVar" in t:
        if t["dosyaYapisiVar"] != bool(kart["dosyaYapisi"].strip()):
            return False
    if t.get("test"):
        tp = kart["beceri"]["test"]
        hic = tp <= 1 or "test: hiç" in kart["aciklama"].lower() or any("test" in r.lower() for r in kart["acikRiskler"])
        if not (("hic" in t["test"] and hic) or ("biraz" in t["test"] and 1 <= tp <= 3)):
            return False
    if t.get("kisiselVeri"):
        kv = kart["kisiselVeri"].lower()
        kv_var = "evet" in kv or "hayır" not in kv
        if not any((k is True and kv_var) or (k == "bilmiyorum" and "bilmiyorum" in kv) for k in t["kisiselVeri"]):
            return False
    return True


def son_oturum_soru_idleri(kart: dict) -> set[str]:
    return {c["soruId"] for o in kart["oturumlar"][-3:] for c in o["sorular"]}


def zorluga_gore_sec(adaylar: list[dict], istenen: str | None) -> dict:
    if istenen:
        for s in adaylar:
            if s["zorluk"] == istenen:
                return s
    return adaylar[0]


def konudan_soru_bul(konu, kart, degisiklikler, son_idler, haric, oncelikli=None, istenen=None):
    konunun = [s for s in BANKA if s["konu"] == konu]
    if oncelikli:
        ozel = next((s for s in konunun if s["id"] == oncelikli), None)
        if ozel and ozel["id"] not in haric:
            return ozel
    taze = [s for s in konunun if s["id"] not in haric and s["id"] not in son_idler and tetik_uyar_mi(s, kart, degisiklikler)]
    if taze:
        return zorluga_gore_sec(taze, istenen)
    uyan = [s for s in konunun if s["id"] not in haric and tetik_uyar_mi(s, kart, degisiklikler)]
    if uyan:
        return zorluga_gore_sec(uyan, istenen)
    herhangi = [s for s in konunun if s["id"] not in haric]
    return zorluga_gore_sec(herhangi, istenen) if herhangi else None


def beceriye_gore_sirala(liste: list[str], kart: dict) -> list[str]:
    """JS'deki gibi yerinde, kararlı sıralama (Array.prototype.sort ASAMA_KONULARI'nı da değiştirir)."""
    liste.sort(key=lambda k: kart["beceri"].get(k, 0))
    return liste


def konu_sec(kart: dict, degisiklikler: list[str], tercih: dict, asama_konulari: dict) -> list[dict]:
    son_idler = son_oturum_soru_idleri(kart)
    konular: set[str] = set()
    idler: set[str] = set()
    secilen: list[dict] = []

    def ekle(s):
        if s:
            idler.add(s["id"])
            secilen.append(s)

    if not kart["oturumlar"]:
        ogr = kart.get("ogrenmekIstedigiKonu") or ("kapsam" if kart["asama"] == "fikir" else "mimari")
        konular.add(ogr)
        ekle(konudan_soru_bul(ogr, kart, degisiklikler, son_idler, idler, None, tercih.get(1)))

        adaylar = [k for k in [kart.get("bilmedigiKonu"), "guvenlik", "veriTabani", "test", "mimari"] if k]
        bil = next((k for k in adaylar if k not in konular), None) or next(k for k in TUM_KONULAR if k not in konular)
        konular.add(bil)
        ekle(konudan_soru_bul(bil, kart, degisiklikler, son_idler, idler))

        asama_ad = beceriye_gore_sirala(asama_konulari.get(kart["asama"]) or ["mimari", "test"], kart)
        ak = next((k for k in asama_ad if k not in konular), None) or next(k for k in TUM_KONULAR if k not in konular)
        konular.add(ak)
        ekle(konudan_soru_bul(ak, kart, degisiklikler, son_idler, idler, None, tercih.get(3)))
        return slotlari_isaretle(secilen, tercih)

    # Soru 1: aşama konuları içinde beceri puanı en düşük olan
    asama_ad = beceriye_gore_sirala(asama_konulari.get(kart["asama"]) or ["mimari"], kart)
    k1 = asama_ad[0] if asama_ad else "kapsam"
    konular.add(k1)
    ekle(konudan_soru_bul(k1, kart, degisiklikler, son_idler, idler, None, tercih.get(1)))

    # Soru 2: değişiklik tetikli; değişiklik yoksa açık risk konusu; o da yoksa en zayıf kalan konu
    k2, ozel2 = None, None
    for d in degisiklikler:
        e = DEGISIKLIK_HARITASI.get(d)
        if e and e[0] not in konular:
            k2, ozel2 = e
            break
    if not k2:
        risk_konulari = []
        for risk in kart["acikRiskler"]:
            r = risk.lower()
            if "test" in r:
                risk_konulari.append("test")
            elif "veri" in r or "firestore" in r:
                risk_konulari.append("veriTabani")
            elif "kvkk" in r or "güvenlik" in r or "api anahtar" in r:
                risk_konulari.append("guvenlik")
            elif "mimari" in r or "şema" in r:
                risk_konulari.append("mimari")
            elif "dosya" in r or "klasör" in r:
                risk_konulari.append("dosyaDuzeni")
            elif "yayın" in r or "dağıtım" in r:
                risk_konulari.append("dagitim")
            elif "readme" in r or "rapor" in r:
                risk_konulari.append("rapor")
        k2 = next((k for k in risk_konulari if k not in konular), None)
        if not k2:
            kalan = sorted([k for k in TUM_KONULAR if k not in konular], key=lambda k: kart["beceri"].get(k, 0))
            k2 = kalan[0] if kalan else "veriTabani"
    konular.add(k2)
    ekle(konudan_soru_bul(k2, kart, degisiklikler, son_idler, idler, ozel2))

    # Soru 3: en az 2 oturum önceki yüksek riskli seçim varsa o soru tekrar; yoksa en zayıf kalan konu
    k3, tekrar_id = None, None
    for gecmis in kart["oturumlar"][: max(0, len(kart["oturumlar"]) - 1)]:
        for sc in gecmis["sorular"]:
            if (sc["riskDerecesi"] == "yuksek" or sc.get("risk")) and sc["konu"] in TUM_KONULAR and sc["konu"] not in konular:
                k3, tekrar_id = sc["konu"], sc["soruId"]
                break
        if k3:
            break
    if not k3:
        kalan = sorted([k for k in TUM_KONULAR if k not in konular], key=lambda k: kart["beceri"].get(k, 0))
        k3 = kalan[0] if kalan else "test"
    konular.add(k3)
    ekle(konudan_soru_bul(k3, kart, degisiklikler, son_idler, idler, tekrar_id, tercih.get(3)))

    while len(secilen) < 3:
        kalan = next((k for k in TUM_KONULAR if k not in konular), "kapsam")
        konular.add(kalan)
        s = konudan_soru_bul(kalan, kart, degisiklikler, son_idler, idler)
        if not s:
            break
        ekle(s)
    return slotlari_isaretle(secilen, tercih)


def slotlari_isaretle(sorular: list[dict], tercih: dict) -> list[dict]:
    sonuc = []
    for i, s in enumerate(sorular):
        slot = i + 1
        sonuc.append({**s, "slot": slot, "istenenZorluk": tercih.get(slot) if slot in (1, 3) else None})
    return sonuc


# --------------------------------------------------------------------------- oyuncu simülasyonu


def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def basari_olasiligi(f: dict, zor: bool) -> float:
    z = (-0.4 + 0.5 * f["seviye"] + 0.45 * (f["konu_beceri_puani"] - 2.5) - 0.7 * f["konudaki_onceki_riskli_sayisi"]
         + 0.15 * f["oturum_no"] + 0.01 * f["son_gerekce_uzunlugu"] - 0.04 * max(0.0, 8 - f["son_karar_suresi_sn"]))
    return sigmoid(z if zor else z + 1.2)


def yuvarla(x: float) -> float:
    return round(x * 100) / 100


def tohumlu_uuid(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def yeni_kart(rng: random.Random, seviye: int) -> dict:
    """Tanışma ekranının ürettiği kart (TanismaScreen.tsx; /api/kart yokken yerel kart)."""
    return {
        "seviye": seviye,
        "asama": rng.choice(["fikir", "tasarim", "kodlama", "kodlama", "kodlama", "test", "teslim"]),
        "mimari": rng.choice(["İstemci Ağırlıklı SPA + REST API", "Sunucusuz (Firebase)", "Monolit MVC", "Mikroservis", "Bilmiyorum"]),
        "veriTabani": rng.choice(["PostgreSQL", "Cloud Firestore", "Firebase", "MongoDB", "SQLite", "MySQL"]),
        "kisiselVeri": rng.choice(["Evet (Ad, e-posta)", "Hayır", "Bilmiyorum"]),
        "ogrenmekIstedigiKonu": rng.choice(TUM_KONULAR),
        "bilmedigiKonu": rng.choice(TUM_KONULAR),
        "aciklama": "Sentetik proje",
        "dosyaYapisi": "proje/\n├── src/\n│   ├── components/\n│   ├── services/\n│   ├── types/\n│   └── main.tsx\n└── package.json",
        "beceri": {"kapsam": 2, "mimari": 2, "veriTabani": 2, "dosyaDuzeni": 2, "test": 0, "guvenlik": 1, "dagitim": 1, "rapor": 1},
        "acikRiskler": [
            "Başlangıç Aşaması: Henüz mimari risk değerlendirmesi yapılmadı.",
            "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
        ],
        "oturumlar": [],
    }


def cevap_ver(rng: random.Random, soru: dict, basari: int) -> dict:
    """Seçeneği etikete göre seçer; puan, risk derecesi ve risk ekleme/kapatma uygulamadaki gibi (SoruScreen.tsx)."""
    konu_buyuk = soru["konu"].upper()
    if soru["tur"] == "kontrol":
        hayir_risk = soru.get("hayirRisk") or f"{konu_buyuk}: Kontrol adımı doğrulanmadı veya eksik."
        secim = "A" if basari else rng.choice(["B", "C"])
        if secim == "A":
            return {"riskDerecesi": "dusuk", "puan": 1, "risk": None, "ekle": None, "kapat": hayir_risk}
        if secim == "B":
            return {"riskDerecesi": "yuksek", "puan": 0, "risk": hayir_risk, "ekle": hayir_risk, "kapat": None}
        return {"riskDerecesi": "orta", "puan": 0, "risk": f"Belirsizlik: {hayir_risk}", "ekle": hayir_risk, "kapat": None}

    secenekler = soru["secenekler"]
    if basari:
        sec = next(s for s in secenekler if s["risk"] == "dusuk")
    else:
        sec = rng.choice([s for s in secenekler if s["risk"] != "dusuk"])
    puan = {"dusuk": 1, "orta": 0, "yuksek": -1}[sec["risk"]]
    ekle = f"{konu_buyuk}: {sec['metin']} - {sec['neden']}" if sec["risk"] == "yuksek" else None
    return {"riskDerecesi": sec["risk"], "puan": puan, "risk": sec["neden"] if sec["risk"] == "yuksek" else None,
            "ekle": ekle, "kapat": None}


def ozellikler(kart: dict, konu: str, onceki: dict | None) -> dict:
    """veriToplama.ts → ozellikleriHesapla (oturum başındaki kartla)."""
    konudaki = [c for o in kart["oturumlar"] for c in o["sorular"] if c["konu"] == konu]
    return {
        "seviye": kart["seviye"],
        "konu_beceri_puani": kart["beceri"].get(konu, 0),
        "konudaki_onceki_soru_sayisi": len(konudaki),
        "konudaki_onceki_riskli_sayisi": sum(1 for c in konudaki if c["riskDerecesi"] in ("orta", "yuksek")),
        "son_karar_suresi_sn": yuvarla(onceki["kararSuresiSn"]) if onceki else 0,
        "son_gerekce_uzunlugu": onceki["gerekceUzunlugu"] if onceki else 0,
        "oturum_no": len(kart["oturumlar"]) + 1,
    }


def oyuncu_oynat(rng: random.Random, seviye: int) -> list[dict]:
    kart = yeni_kart(rng, seviye)
    asama_konulari = {k: list(v) for k, v in ASAMA_KONULARI.items()}  # oyuncu başına (sayfa yüklemesi) kopya
    proje_id = tohumlu_uuid(rng)
    satirlar = []
    for oturum_idx in range(rng.randint(*OTURUM_ARALIGI)):
        oturum_id = tohumlu_uuid(rng)
        degisiklikler = ["plan"] if oturum_idx == 0 else [d for d in DEGISIKLIK_ANAHTARLARI if rng.random() < 0.25]
        tercih = {1: rng.choice(["kolay", "zor"]), 3: rng.choice(["kolay", "zor"])}  # yazı-tura
        sorular = konu_sec(kart, degisiklikler, tercih, asama_konulari)

        onceki = None
        if kart["oturumlar"]:
            son = kart["oturumlar"][-1]["sorular"][-1]
            onceki = {"kararSuresiSn": son["kararSuresiSn"], "gerekceUzunlugu": son["gerekceUzunlugu"]}

        cevaplar = []
        for soru in sorular:
            f = ozellikler(kart, soru["konu"], onceki)
            zor = soru["zorluk"] == "zor"
            basari = 1 if rng.random() < basari_olasiligi(f, zor) else 0
            c = cevap_ver(rng, soru, basari)
            sure = yuvarla(min(90.0, max(1.0, rng.lognormvariate(math.log(9 - 1.0 * seviye), 0.5))))
            gerekce = rng.randint(15, 140) if rng.random() < 0.35 + 0.15 * seviye else 0
            if not soru["istenenZorluk"]:
                kaynak_z = "kural"
            else:
                kaynak_z = "yazitura" if soru["zorluk"] == soru["istenenZorluk"] else "yedek"
            satirlar.append({
                "proje_id": proje_id, "oturum_id": oturum_id, "soru_id": soru["id"], "konu": soru["konu"],
                "slot": soru["slot"], **f, "soru_zorlugu": 1 if zor else 0, "zorluk_kaynagi": kaynak_z,
                "karar_suresi_sn": sure, "basari": basari, "kaynak": "sentetik", "p_model": "",
            })
            cevaplar.append({"soruId": soru["id"], "konu": soru["konu"], "riskDerecesi": c["riskDerecesi"],
                             "risk": c["risk"], "puan": c["puan"], "ekle": c["ekle"], "kapat": c["kapat"],
                             "kararSuresiSn": sure, "gerekceUzunlugu": gerekce})
            onceki = {"kararSuresiSn": sure, "gerekceUzunlugu": gerekce}

        # Oturum sonu (App.tsx → handleOturumTamamla): beceri, açık riskler, oturum kaydı
        fark: dict[str, int] = {}
        for c in cevaplar:
            fark[c["konu"]] = fark.get(c["konu"], 0) + c["puan"]
        for k, d in fark.items():
            if k in kart["beceri"]:
                kart["beceri"][k] = min(5, max(0, kart["beceri"][k] + d))
        kapat = [c["kapat"] for c in cevaplar if c["kapat"]]
        riskler = [m for m in kart["acikRiskler"]
                   if not any(m.lower() in k.lower() or k.lower() in m.lower() for k in kapat)]
        for c in cevaplar:
            if c["ekle"] and c["ekle"] not in riskler:
                riskler.append(c["ekle"])
        kart["acikRiskler"] = riskler
        kart["oturumlar"].append({"sorular": cevaplar})
    return satirlar


def main() -> None:
    rng = random.Random(SEED)
    seviyeler = [0, 1, 2] * (OYUNCU_SAYISI // 3)
    rng.shuffle(seviyeler)
    satirlar = [s for seviye in seviyeler for s in oyuncu_oynat(rng, seviye)]

    CIKTI.parent.mkdir(parents=True, exist_ok=True)
    with CIKTI.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=SUTUNLAR, lineterminator="\n")
        w.writeheader()
        w.writerows(satirlar)

    zor = [s for s in satirlar if s["soru_zorlugu"] == 1]
    print(f"Yazıldı: {CIKTI} — {OYUNCU_SAYISI} oyuncu, {len({s['oturum_id'] for s in satirlar})} oturum, {len(satirlar)} satır")
    print(f"Zor satır: {len(zor)} (basari oranı {sum(s['basari'] for s in zor) / max(1, len(zor)):.2f}); "
          f"kolay satır: {len(satirlar) - len(zor)} "
          f"(basari oranı {sum(s['basari'] for s in satirlar if s['soru_zorlugu'] == 0) / max(1, len(satirlar) - len(zor)):.2f})")
    kaynaklar = {}
    for s in satirlar:
        kaynaklar[s["zorluk_kaynagi"]] = kaynaklar.get(s["zorluk_kaynagi"], 0) + 1
    print("zorluk_kaynagi:", ", ".join(f"{k}={v}" for k, v in sorted(kaynaklar.items())))


if __name__ == "__main__":
    main()
