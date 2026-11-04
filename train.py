"""SE Primer v2 — zorluk modeli: eğitim, eval kapısı, ONNX paketi (spec.md §10).

Tek komut:  python train.py

Akış (../huggingface-hello-web/hf_cli.py → cmd_train, onnx_aktar, model_karti örnek alındı):
  1. data/oturumlar.csv → yalnız zor satırlar (soru_zorlugu = 1), 7 özellik spec §10.2 sırasıyla, hedef basari.
  2. Eval (spec §10.6): StratifiedGroupKFold(5, shuffle=True, random_state=13), grup = proje_id.
     Kapı: 5 katlamanın ortalama ROC-AUC'si >= 0.65. Kapı geçilmezse model/'e hiçbir şey yazılmaz, çıkış kodu 1.
  3. Kapı geçilirse: tüm veriyle yeniden eğitim → model/model.onnx (sklearn farkı > 1e-4 ise durur),
     model/config.json (sözleşme), model/README.md (model kartı).
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

KOK = Path(__file__).resolve().parent
VERI = KOK / "data" / "oturumlar.csv"
MODEL_DIR = KOK / "model"

SEED = 13  # CLAUDE.md kural 4: eğitim, veri bölme ve sentetik veri
ESIK_KAPI = 0.65  # spec §10.6 — eğitimden önce yazıldı
ESIK_KARAR = 0.5  # spec §10.3 — p >= 0.5 → zor soru
N_KATLAMA = 5
ONNX_TOLERANS = 1e-4

# spec §10.2 — sıra sabittir; config.json "features" sırası budur.
OZELLIKLER = [
    "seviye",
    "konu_beceri_puani",
    "konudaki_onceki_soru_sayisi",
    "konudaki_onceki_riskli_sayisi",
    "son_karar_suresi_sn",
    "son_gerekce_uzunlugu",
    "oturum_no",
]
OZELLIK_ETIKETLERI = {
    "seviye": "Seviye (0 = Yeni başladım, 1 = Biraz deneyimim var, 2 = Deneyimliyim)",
    "konu_beceri_puani": "Sorulacak konunun beceri puanı (0–5)",
    "konudaki_onceki_soru_sayisi": "Bu konuda önceki oturumlarda cevaplanan soru sayısı",
    "konudaki_onceki_riskli_sayisi": "Bu konuda önceki oturumlarda orta/yüksek riskli seçim sayısı",
    "son_karar_suresi_sn": "Bir önceki sorudaki karar süresi (sn)",
    "son_gerekce_uzunlugu": "Bir önceki sorudaki gerekçe uzunluğu (karakter)",
    "oturum_no": "Oturumun sıra numarası",
}
HEDEF = "basari"


def model_kur() -> Pipeline:
    return Pipeline([("scaler", StandardScaler()), ("lr", LogisticRegression(random_state=SEED))])


def veri_oku() -> pd.DataFrame:
    if not VERI.exists():
        sys.exit(f"✗ {VERI} yok. Önce: python scripts/sentetik.py && python scripts/birlestir.py")
    veri = pd.read_csv(VERI)
    eksik = [s for s in OZELLIKLER + [HEDEF, "proje_id", "kaynak", "soru_zorlugu", "zorluk_kaynagi"] if s not in veri]
    if eksik:
        sys.exit(f"✗ {VERI.name} içinde eksik sütun(lar): {eksik}")
    zor = veri[veri["soru_zorlugu"] == 1].reset_index(drop=True)
    if zor[OZELLIKLER + [HEDEF]].isna().any().any():
        sys.exit("✗ Zor satırlarda boş özellik ya da etiket var.")
    return zor


def sinif_sayilari(y: pd.Series) -> dict[str, int]:
    return {str(k): int(v) for k, v in sorted(y.value_counts().items())}


def capraz_dogrulama(zor: pd.DataFrame) -> dict:
    """spec §10.6: 5 katlı gruplu çapraz doğrulama; katlama AUC'leri ve out-of-fold tahminler."""
    X, y, gruplar = zor[OZELLIKLER], zor[HEDEF], zor["proje_id"]
    bolucu = StratifiedGroupKFold(n_splits=N_KATLAMA, shuffle=True, random_state=SEED)
    oof = np.full(len(zor), np.nan)
    katlamalar = []
    for i, (egitim, test) in enumerate(bolucu.split(X, y, gruplar), start=1):
        # Gruplu bölmenin denetimi: aynı proje_id iki tarafta olamaz.
        assert not set(gruplar.iloc[egitim]) & set(gruplar.iloc[test]), "proje_id sızıntısı"
        model = model_kur().fit(X.iloc[egitim], y.iloc[egitim])
        p = model.predict_proba(X.iloc[test])[:, 1]
        oof[test] = p
        y_test = y.iloc[test]
        auc = round(float(roc_auc_score(y_test, p)), 4) if y_test.nunique() == 2 else None
        katlamalar.append({
            "katlama": i,
            "test_satir": int(len(test)),
            "test_grup": int(gruplar.iloc[test].nunique()),
            "test_gercek_satir": int((zor["kaynak"].iloc[test] == "gercek").sum()),
            "test_sinif_sayilari": sinif_sayilari(y_test),
            "auc": auc,
        })
    auclar = [k["auc"] for k in katlamalar]
    if any(a is None for a in auclar):
        sys.exit("✗ Bir test katlaması tek sınıflı; katlama AUC'si tanımsız, kapı ölçülemiyor.")
    return {"katlamalar": katlamalar, "auclar": auclar, "oof": oof}


def gercek_auc(zor: pd.DataFrame, oof: np.ndarray) -> dict:
    """spec §10.6: yalnız gerçek satırlarda out-of-fold AUC; tek sınıfsa "hesaplanamadı" (çökmez)."""
    maske = (zor["kaynak"] == "gercek").to_numpy()
    y = zor.loc[maske, HEDEF]
    sonuc = {"satir": int(maske.sum()), "grup": int(zor.loc[maske, "proje_id"].nunique()),
             "sinif_sayilari": sinif_sayilari(y) if len(y) else {}}
    if y.nunique() < 2:
        sonuc["auc"] = "hesaplanamadı"
        sonuc["neden"] = "gerçek zor satırlarda tek sınıf var" if len(y) else "gerçek zor satır yok"
    else:
        sonuc["auc"] = round(float(roc_auc_score(y, oof[maske])), 4)
    return sonuc


_BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
_ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
_V4 = {"a": "ı", "ı": "ı", "e": "i", "i": "i", "o": "u", "u": "u", "ö": "ü", "ü": "ü"}


def sayi_eki(n: int, hal: str) -> str:
    """Sayıya Türkçe ek: "iyelik" (7'si), "bulunma" (7'sinde), "tamlayan" (7'sinin). Ünlü uyumu okunuşa göre."""
    if n == 0:
        kelime = "sıfır"
    elif n % 10:
        kelime = _BIRLER[n % 10]
    elif n % 100:
        kelime = _ONLAR[(n // 10) % 10]
    elif n % 1000:
        kelime = "yüz"
    else:
        kelime = "bin"
    son_unlu = [c for c in kelime if c in _V4][-1]
    iyelik = ("s" if kelime[-1] in _V4 else "") + _V4[son_unlu]
    if hal == "iyelik":
        ek = iyelik
    elif hal == "bulunma":
        ek = iyelik + "nd" + ("a" if iyelik[-1] in "ıu" else "e")
    else:
        ek = iyelik + "n" + iyelik[-1] + "n"
    return f"{n}'{ek}"


def gercek_ozet(tum: pd.DataFrame, zor: pd.DataFrame) -> dict:
    """Model kartı ve config.json için gerçek veri sayıları; hepsi data/oturumlar.csv'den hesaplanır."""
    gercek = tum[tum["kaynak"] == "gercek"]
    gercek_zor = zor[zor["kaynak"] == "gercek"]
    oyuncu_seviye = gercek.groupby("proje_id")["seviye"].agg(lambda s: sorted(set(int(x) for x in s)))
    baslangic = gercek.groupby("proje_id")["oturum_no"].min()
    # Dikkat düşüşü: 3. oturumdan sonraki (oturum_no > 3) satırlarda medyan karar süresi < 3 sn
    sonra = gercek[gercek["oturum_no"] > 3]
    dikkat = sonra.groupby("proje_id")["karar_suresi_sn"].median()
    dikkat_oyunculari = sorted(dikkat[dikkat < 3].index)
    tekrar = {}
    for p in dikkat_oyunculari:
        o = gercek[gercek["proje_id"] == p]
        sayim = o.groupby("soru_id")["oturum_id"].nunique().sort_values(ascending=False)
        tekrar[p[:8]] = {"soru_id": str(sayim.index[0]), "oturum": int(sayim.iloc[0]),
                         "toplam_oturum": int(o["oturum_id"].nunique())}
    banka = json.loads((KOK / "src" / "data" / "soruBankasi.json").read_text(encoding="utf-8"))["sorular"]
    return {
        "gercek_oyuncu": int(gercek["proje_id"].nunique()),
        "gercek_oturum": int(gercek["oturum_id"].nunique()),
        "sentetik_oyuncu": int(tum.loc[tum["kaynak"] == "sentetik", "proje_id"].nunique()),
        "gercek_zor_basari0": int((gercek_zor[HEDEF] == 0).sum()),
        "gercek_zor_basari1": int((gercek_zor[HEDEF] == 1).sum()),
        "sentetik_zor_yuzde": round(100 * float((zor["kaynak"] == "sentetik").mean()), 1),
        "gercek_seviye_oyuncu": {str(k): int(sum(k in sv for sv in oyuncu_seviye)) for k in (0, 1, 2)},
        "gercek_seviye0_oyuncu": int(sum(sv == [0] for sv in oyuncu_seviye)),
        "gercek_ornek_proje_oyuncu": int((baslangic >= 2).sum()),
        "gercek_dikkat_oyuncu": len(dikkat_oyunculari),
        "gercek_dikkat_tekrar": tekrar,
        "banka_soru": len(banka),
    }


def kart_metinleri(v: dict) -> dict:
    so = v["gercek_seviye_oyuncu"]
    tekrar = v["gercek_dikkat_tekrar"]
    return {
        "gercek_seviye_metni": ", ".join(f"seviye {k}: {n} oyuncu" for k, n in so.items()),
        "gercek_dikkat_tekrar_metni": "; ".join(
            f"{sayi_eki(t['toplam_oturum'], 'tamlayan')} {sayi_eki(t['oturum'], 'bulunma')} `{t['soru_id']}`" for t in tekrar.values()) or "—",
    }


def onnx_aktar(model: Pipeline, X_ornek: pd.DataFrame) -> float:
    """model.onnx: girdi 'input' float32 [n, 7] (config.json features sırası); çıktılar 'label' ve 'probabilities'."""
    import onnxruntime as ort
    from skl2onnx import to_onnx
    from skl2onnx.common.data_types import FloatTensorType

    onx = to_onnx(model, initial_types=[("input", FloatTensorType([None, X_ornek.shape[1]]))],
                  options={id(model): {"zipmap": False}}, target_opset=17)
    yol = MODEL_DIR / "model.onnx"
    yol.write_bytes(onx.SerializeToString())

    oturum = ort.InferenceSession(str(yol), providers=["CPUExecutionProvider"])
    p_onnx = oturum.run(["probabilities"], {"input": X_ornek.to_numpy(np.float32)})[0]
    fark = float(np.abs(p_onnx - model.predict_proba(X_ornek)).max())
    if fark > ONNX_TOLERANS:
        shutil.rmtree(MODEL_DIR)  # yarım paket bırakma
        sys.exit(f"✗ ONNX çıktısı sklearn'den sapıyor (maks fark {fark:.2e} > {ONNX_TOLERANS}); model/ silindi.")
    return fark


def katsayilar(model: Pipeline) -> list[dict]:
    lr: LogisticRegression = model.named_steps["lr"]
    olcek: StandardScaler = model.named_steps["scaler"]
    return [{"ozellik": o, "katsayi_olcekli": round(float(k), 4), "ortalama": round(float(m), 4),
             "std": round(float(s), 4)}
            for o, k, m, s in zip(OZELLIKLER, lr.coef_[0], olcek.mean_, olcek.scale_)]


def katsayi_yorumu(k: dict) -> str:
    yon = "artırıyor" if k["katsayi_olcekli"] > 0 else "azaltıyor"
    guc = abs(k["katsayi_olcekli"])
    derece = "güçlü" if guc >= 0.5 else ("orta" if guc >= 0.2 else "zayıf")
    return f"1 std artış p(basari)'yı {yon} ({derece} etki)"


def sinif_metni(d: dict) -> str:
    return ", ".join(f"`basari = {k}`: {n}" for k, n in d.items()) or "—"


def model_karti(config: dict, kats: list[dict], katlamalar: list[dict]) -> str:
    m = config["metrics"]
    v = config["veri"]
    g = m["gercek_oof"]
    gercek_auc_metni = (f"**hesaplanamadı** ({g['neden']}; sınıflar: {sinif_metni(g['sinif_sayilari'])})"
                        if g["auc"] == "hesaplanamadı" else f"{g['auc']}")
    katlama_satirlari = "\n".join(
        f"| {k['katlama']} | {k['test_satir']} | {k['test_grup']} | {k['test_gercek_satir']} | "
        f"{k['test_sinif_sayilari'].get('0', 0)} / {k['test_sinif_sayilari'].get('1', 0)} | {k['auc']} |"
        for k in katlamalar)
    katsayi_satirlari = "\n".join(
        f"| {i} | `{k['ozellik']}` | {k['katsayi_olcekli']:+.4f} | {katsayi_yorumu(k)} |"
        for i, k in enumerate(kats, start=1))
    zk = ", ".join(f"`{a}` = {b}" for a, b in v["zorluk_kaynagi"].items())
    ornek = json.dumps({f["name"]: f["example"] for f in config["features"]}, ensure_ascii=False)

    return f"""---
library_name: sklearn
tags:
- onnx
- tabular-classification
- sklearn
- education
pipeline_tag: tabular-classification
---

# {config["title"]}

{config["description"]}

## Amaç

SE Primer'de bir konunun sorusu seçilirken, öğrencinin o konudaki **zor** soruyu düşük riskli cevaplama
olasılığını tahmin eder: `p(basari)`. Hangi konunun sorulacağına uygulamadaki kural (`konuSec`) karar verir.
Model yalnız 1. soru (aşama) ve 3. soru (zayıf konu) için o konudan **kolay mı zor mu** soru geleceğine karar verir:
`p >= {config["esik"]}` ise zor soru, değilse kolay soru gelir (spec §10.3). 2. soruya dokunmaz.

**Kullanılmaması gereken durumlar:** Bu model **öğrenciyi notlamak, sıralamak ya da değerlendirmek için
kullanılmaz.** Çıktısı bir başarı ölçüsü değil, yalnızca bir sonraki sorunun zorluğunu ayarlayan bir olasılıktır.
SE Primer dışındaki bir soru bankasında ya da başka bir öğrenci kitlesinde doğrulanmadı.

## Model

- sklearn `Pipeline(StandardScaler → LogisticRegression(random_state={config["seed"]}))`, seed = {config["seed"]}
- Eğitim ortamı: Python {config["python_version"]}, scikit-learn {config["sklearn_version"]}
- Yayınlanan model, çapraz doğrulamadaki modellerden biri değil, **tüm veriyle yeniden eğitilen** modeldir (spec §10.6).
- `model.onnx`: girdi `input` (float32, `[n, 7]`, sıra aşağıdaki gibi), çıktılar `label` ve `probabilities`
  (`[n, 2]`, sütun 1 = `p(basari = 1)`). ONNX ↔ sklearn maks fark: {m["onnx_sklearn_maks_fark"]:.1e} (sınır 1e-4).

### Girdiler (spec §10.2, sıra sabit)

| # | Özellik | Anlamı |
|---|---|---|
""" + "\n".join(f"| {i} | `{f['name']}` | {f['label']} |" for i, f in enumerate(config["features"], start=1)) + f"""

Hepsi soru gösterilmeden **önce** bilinir; sorulan sorunun cevabı, süresi ya da gerekçesi girdi değildir.

## Veri

- `data/oturumlar.csv`, yalnız zor satırlar (`soru_zorlugu = 1`): **{v["zor_satir"]}** satır,
  **{v["grup"]}** grup (`proje_id`).
  - Gerçek: {v["gercek_zor_satir"]} zor satır ({v["gercek_grup"]} oyuncu); {sinif_metni(g["sinif_sayilari"])}.
  - Sentetik: {v["sentetik_zor_satir"]} zor satır ({v["sentetik_grup"]} sahte oyuncu; üretici `scripts/sentetik.py`, seed = 13).
- Bütün veri setinde (kolay + zor): {v["toplam_satir"]} satır, {v["gercek_satir"]} gerçek + {v["sentetik_satir"]} sentetik.
- Etiket `basari`: zor soruda düşük riskli seçenek (kontrol sorusunda "Evet") = 1, diğerleri 0 (spec §10.1).
- Zor satırlarda `zorluk_kaynagi`: {zk}. `yedek` = istenen zorlukta uygun soru yoktu, diğeri gösterildi.
- Kişisel veri yok (ad, e-posta, cihaz, konum, serbest metin tutulmaz). Ayrıntı: `data/SOZLUK.md`.

## Metrikler (spec §10.6)

`StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=13)`, grup = `proje_id`: aynı oyuncu hiçbir zaman hem
eğitimde hem testte olmaz.

| metrik | değer |
|---|---|
| **5 katlama ortalama ROC-AUC (kapı)** | **{m["auc_ortalama"]}** (eşik {config["kapi"]["esik"]} → {"GEÇTİ" if config["kapi"]["gecti"] else "KALDI"}) |
| AUC standart sapma | {m["auc_std"]} |
| Yalnız gerçek satırlarda out-of-fold AUC (bilgi amaçlı) | {gercek_auc_metni} |

| katlama | test satır | test grup | test gerçek satır | sınıf 0 / 1 | AUC |
|---|---|---|---|---|---|
{katlama_satirlari}

## Katsayılar ve yorumu

Katsayılar **ölçeklenmiş** girdiler içindir (StandardScaler sonrası): özellik 1 standart sapma arttığında
log-odds'taki değişim. İşaret, etkinin yönünü gösterir. Kesişim (intercept): {m["kesisim"]:+.4f}.

| # | Özellik | Katsayı | Yorum |
|---|---|---|---|
{katsayi_satirlari}

Bu katsayılar büyük ölçüde sentetik üreticinin kuralını yansıtır (bkz. Sınırlar). Nedensel bir ilişki olarak okunmamalıdır.

## Sınırlar

- **Az sayıda gerçek kişi, AUC oynak.** Gerçek veri az sayıda oyuncudan geliyor: **{v["gercek_oyuncu"]} oyuncu,
  {v["gercek_oturum"]} oturum, {v["gercek_satir"]} satır** (sentetik: {v["sentetik_oyuncu"]} oyuncu, {v["sentetik_satir"]} satır).
  Gerçek zor satır **{v["gercek_zor_satir"]}** ve bunların **{sayi_eki(v["gercek_zor_basari0"], "bulunma")} `basari = 0`** var; bu yüzden
  yalnız gerçek satırlarda hesaplanan AUC **çok oynaktır**. Katlama bazında AUC'ler ve standart sapma bu oynaklığı
  gösterir; ortalama AUC kesin bir başarı ölçüsü olarak okunmamalıdır.
- **Model büyük ölçüde sentetik kuralı öğreniyor.** Zor satırların büyük çoğunluğu sentetik (%{v["sentetik_zor_yuzde"]}). Sentetik etiket
  bilinen bir lojistik formülle üretildi (`scripts/sentetik.py`), bu yüzden lojistik regresyon o formülü kolayca geri
  buluyor. Kapıdaki AUC, gerçek öğrencilerdeki başarıdan çok bu kuralın ne kadar iyi geri bulunduğunu ölçer.
- **{v["gercek_oyuncu"]} gerçek oyuncunun {sayi_eki(v["gercek_seviye0_oyuncu"], "bulunma")} `seviye = 0`.** Tanışmadaki varsayılan seçim
  ("Yeni başladım") değiştirilmemiş. Gerçek oyuncuların seviye dağılımı: {v["gercek_seviye_metni"]}. Seviye etkisi
  büyük ölçüde **sentetik veriden** öğreniliyor; gerçek veride görülmeyen seviyeler için tahminler gerçek kullanıcılarda
  doğrulanmadı.
- **{v["gercek_oyuncu"]} gerçek oyuncunun {sayi_eki(v["gercek_ornek_proje_oyuncu"], "iyelik")} örnek projeyle başladı** (`oturum_no` 2'den
  başlıyor). Bu oyuncularda ilk girdiler örnek projenin hazır geçmişinden gelir. Satırlar veriden çıkarılmadı
  (bkz. `data/SOZLUK.md`).
- **{v["gercek_dikkat_oyuncu"]} gerçek oyuncuda 3. oturumdan sonra dikkat düşüyor.** 3. oturumdan sonraki karar
  sürelerinin medyanı 3 saniyenin altında ve sorular tekrar ediyor (bu oyuncularda en sık soru oturumların
  {v["gercek_dikkat_tekrar_metni"]}). Bu satırlar da veriden çıkarılmadı. Etiketin bir kısmı düşünülerek verilmiş bir
  karardan değil, hızlıca tıklamaktan geliyor olabilir.
- **Soru bankası küçük ({v["banka_soru"]} soru).** Sorular tekrar ediyor ve ezberleniyor (yukarıdaki madde: 3. oturumdan
  sonra karar süresi 3 sn'nin altına iniyor). Sonraki oturumlardaki `basari`, konunun öğrenilmesinden çok cevabın
  hatırlanmasını yansıtıyor olabilir.

## Kullanım

```python
import numpy as np, onnxruntime as ort
oturum = ort.InferenceSession("model.onnx")
x = np.array([[{", ".join(str(f["example"]) for f in config["features"])}]], dtype=np.float32)  # {ornek}
p = oturum.run(["probabilities"], {{"input": x}})[0][0, 1]
zorluk = "zor" if p >= {config["esik"]} else "kolay"
```
"""


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolu (cp1254) "✓" gibi karakterlerde çökmesin
    zor = veri_oku()
    X, y = zor[OZELLIKLER], zor[HEDEF]
    print(f"Veri: {len(zor)} zor satır, {zor['proje_id'].nunique()} grup "
          f"(gerçek {int((zor['kaynak'] == 'gercek').sum())}, sentetik {int((zor['kaynak'] == 'sentetik').sum())}); "
          f"sınıflar {sinif_sayilari(y)}")

    cv = capraz_dogrulama(zor)
    auc_ort = round(float(np.mean(cv["auclar"])), 4)
    auc_std = round(float(np.std(cv["auclar"])), 4)
    gercek = gercek_auc(zor, cv["oof"])
    zk = {str(k): int(v) for k, v in sorted(zor["zorluk_kaynagi"].value_counts().items())}

    print(f"Katlama AUC'leri: {cv['auclar']}")
    print(f"Ortalama AUC: {auc_ort}  (std {auc_std})  — kapı: >= {ESIK_KAPI}")
    print(f"Yalnız gerçek satırlarda OOF AUC: {gercek['auc']}  (satır {gercek['satir']}, sınıflar {gercek['sinif_sayilari']})")
    print(f"zorluk_kaynagi (zor satırlar): {zk}")

    if auc_ort < ESIK_KAPI:
        print(f"✗ KAPI GEÇİLMEDİ: ortalama AUC {auc_ort} < {ESIK_KAPI}. model/'e hiçbir şey yazılmadı.")
        sys.exit(1)
    print(f"✓ Kapı geçildi ({auc_ort} >= {ESIK_KAPI})")

    # Paket: tüm veriyle yeniden eğitim (spec §10.6)
    model = model_kur().fit(X, y)
    if MODEL_DIR.exists():
        shutil.rmtree(MODEL_DIR)
    MODEL_DIR.mkdir(parents=True)
    fark = onnx_aktar(model, X)
    kats = katsayilar(model)

    tum = pd.read_csv(VERI)
    ornek = X.iloc[0]
    config = {
        "title": "SE Primer v2 — zorluk modeli",
        "description": "Öğrencinin bir konudaki zor soruyu düşük riskli cevaplama olasılığı p(basari). "
                       "SE Primer'de 1. ve 3. sorunun zorluğunu seçer. Öğrenciyi notlamak için KULLANILMAZ.",
        "target": HEDEF,
        "class_labels": {"0": "orta/yüksek riskli seçim", "1": "düşük riskli seçim"},
        "features": [{"name": o, "label": OZELLIK_ETIKETLERI[o], "example": float(ornek[o])} for o in OZELLIKLER],
        "classes": [str(int(c)) for c in model.classes_],
        "onnx": {"input": "input", "input_dtype": "float32", "outputs": ["label", "probabilities"],
                 "probability_index": 1},
        "esik": ESIK_KARAR,
        "kapi": {"metrik": "5 katlama ortalama ROC-AUC", "esik": ESIK_KAPI, "gecti": True},
        "metrics": {
            "auc_ortalama": auc_ort,
            "auc_std": auc_std,
            "auc_katlamalar": cv["auclar"],
            "gercek_oof": gercek,
            "onnx_sklearn_maks_fark": float(f"{fark:.3e}"),
            "kesisim": round(float(model.named_steps["lr"].intercept_[0]), 4),
            "katsayilar": {k["ozellik"]: k["katsayi_olcekli"] for k in kats},
        },
        "eval": {"bolme": "StratifiedGroupKFold", "n_splits": N_KATLAMA, "shuffle": True,
                 "random_state": SEED, "grup": "proje_id", "katlamalar": cv["katlamalar"]},
        "veri": {
            "dosya": "data/oturumlar.csv",
            "toplam_satir": int(len(tum)),
            "gercek_satir": int((tum["kaynak"] == "gercek").sum()),
            "sentetik_satir": int((tum["kaynak"] == "sentetik").sum()),
            "zor_satir": int(len(zor)),
            "gercek_zor_satir": int((zor["kaynak"] == "gercek").sum()),
            "sentetik_zor_satir": int((zor["kaynak"] == "sentetik").sum()),
            "grup": int(zor["proje_id"].nunique()),
            "gercek_grup": int(zor.loc[zor["kaynak"] == "gercek", "proje_id"].nunique()),
            "sentetik_grup": int(zor.loc[zor["kaynak"] == "sentetik", "proje_id"].nunique()),
            "zorluk_kaynagi": zk,
            **gercek_ozet(tum, zor),
        },
        "seed": SEED,
        "sklearn_version": sklearn.__version__,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
    }
    config_kart = {**config, "veri": {**config["veri"], **kart_metinleri(config["veri"])}}
    (MODEL_DIR / "config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (MODEL_DIR / "README.md").write_text(model_karti(config_kart, kats, cv["katlamalar"]), encoding="utf-8")

    print(f"✓ model.onnx (sklearn ile maks fark {fark:.1e}), config.json, README.md → {MODEL_DIR}")
    print("Katsayılar (ölçekli):")
    for k in kats:
        print(f"  {k['ozellik']:<32} {k['katsayi_olcekli']:+.4f}")
    print(f"  {'(kesişim)':<32} {config['metrics']['kesisim']:+.4f}")


if __name__ == "__main__":
    main()
