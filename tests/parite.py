"""Diferansiyel (parite) test — test kahini (oracle): Python + onnxruntime.

Kullanım (proje kökünde):  .venv\\Scripts\\python tests/parite.py   →  tests/parite.json

1. Modeli Hugging Face'teki SABİT commit'ten indirir (src/primer/modelKaynak.ts → MODEL_REPO, MODEL_COMMIT).
2. sha256'sını yerel model/model.onnx ve Cypress fixture'ı (e2e/cypress/fixtures/model.onnx) ile karşılaştırır.
   Biri farklıysa durur: aynı dosya olmadan karşılaştırma anlamsızdır.
3. 5 referans girdinin p(basari) değerini onnxruntime (Python, CPU) ile hesaplar ve tests/parite.json'a yazar:
   girdiler spec §10.2 sırasıyla, p tam duyarlıkla (float32 çıktının double karşılığı), model commit'i ve sha256.

Uygulama tarafı (test edilen): ?parite=1 sayfası aynı 5 girdiyi uygulamanın kendi çıkarım kodu
(src/primer/model.ts, onnxruntime-web) ile çalıştırır; e2e/cypress/e2e/parite.cy.js farkı kontrol eder.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download

KOK = Path(__file__).resolve().parent.parent
KAYNAK_TS = KOK / "src" / "primer" / "modelKaynak.ts"
YEREL = KOK / "model" / "model.onnx"
FIXTURE = KOK / "e2e" / "cypress" / "fixtures" / "model.onnx"
CIKTI = KOK / "tests" / "parite.json"
TOLERANS = 1e-4  # README → "Diferansiyel test"

# spec §10.2 — sıra sabittir (config.json "features" ile aynı; aşağıda ayrıca kontrol edilir).
OZELLIKLER = [
    "seviye",
    "konu_beceri_puani",
    "konudaki_onceki_soru_sayisi",
    "konudaki_onceki_riskli_sayisi",
    "son_karar_suresi_sn",
    "son_gerekce_uzunlugu",
    "oturum_no",
]

# 5 referans girdi (spec sırasıyla). Neden bunlar: README → "Diferansiyel test".
REFERANS = [
    ("demo_A", "Demo profili A: Yeni başladım, ilk oturum, öğrenmek istediği konu Rapor (beceri 1)",
     [0, 1, 0, 0, 0, 0, 1]),
    ("demo_B", "Demo profili B: Deneyimliyim, ilk oturum, öğrenmek istediği konu Rapor (beceri 1)",
     [2, 1, 0, 0, 0, 0, 1]),
    ("esige_yakin", "Eşiğe çok yakın (|p - 0.5| < 0.01): küçük bir sayısal fark kararı çevirebilir mi?",
     [1, 3, 2, 2, 5, 20, 2]),
    ("uc_deger", "Uç değer: çok riskli geçmiş (konuda 12 soru, 12'si riskli), 10. oturum, çok hızlı karar",
     [0, 0, 12, 12, 0.5, 0, 10]),
    ("sifir_gecmis", "Sıfır geçmişli ilk soru: seviye 0, beceri 0, hiç önceki soru yok, 1. oturum",
     [0, 0, 0, 0, 0, 0, 1]),
]


def sha256(yol: str | Path) -> str:
    return hashlib.sha256(Path(yol).read_bytes()).hexdigest()


def kaynak_oku() -> tuple[str, str, str]:
    s = KAYNAK_TS.read_text(encoding="utf-8")
    al = lambda ad: re.search(rf'{ad} = "([^"]+)"', s).group(1)
    return al("MODEL_REPO"), al("MODEL_COMMIT"), al("MODEL_SURUM")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    repo, commit, surum = kaynak_oku()
    hub_onnx = hf_hub_download(repo, "model.onnx", revision=commit)
    hub_config = json.loads(Path(hf_hub_download(repo, "config.json", revision=commit)).read_text(encoding="utf-8"))

    hashler = {"hub": sha256(hub_onnx), "model/model.onnx": sha256(YEREL), "e2e fixture": sha256(FIXTURE)}
    print(f"Model: {repo} @ {commit} ({surum})")
    for ad, h in hashler.items():
        print(f"  sha256 {ad:<18} {h}")
    if len(set(hashler.values())) != 1:
        sys.exit("✗ model.onnx dosyaları aynı değil; parite testi anlamsız. Önce fixture/model'i eşitleyin.")
    if [f["name"] for f in hub_config["features"]] != OZELLIKLER:
        sys.exit("✗ config.json özellik sırası spec §10.2 ile aynı değil.")

    oturum = ort.InferenceSession(hub_onnx, providers=["CPUExecutionProvider"])
    x = np.array([g for _, _, g in REFERANS], dtype=np.float32)
    p = oturum.run(["probabilities"], {hub_config["onnx"]["input"]: x})[0][:, hub_config["onnx"]["probability_index"]]
    esik = hub_config["esik"]

    girdiler = []
    for (ad, aciklama, g), pi in zip(REFERANS, p):
        girdiler.append({
            "ad": ad,
            "aciklama": aciklama,
            "girdi": dict(zip(OZELLIKLER, g)),
            "p": float(pi),
            "p_8": f"{float(pi):.8f}",
            "karar": "zor" if pi >= esik else "kolay",
        })
        print(f"  {ad:<13} {g}  p = {float(pi):.10f}  → {girdiler[-1]['karar']}")

    sonuc = {
        "aciklama": "Diferansiyel test: Python (onnxruntime, test kahini) ile uygulama (onnxruntime-web) aynı "
                    "girdilerde aynı p(basari)'yı vermeli. tests/parite.py üretir; elle değiştirmeyin.",
        "model": {"repo": repo, "surum": surum, "commit": commit, "sha256": hashler["hub"]},
        "kahin": {"kutuphane": "onnxruntime (Python)", "surum": ort.__version__, "girdi_tipi": "float32"},
        "tolerans": TOLERANS,
        "esik": esik,
        "ozellikler": OZELLIKLER,
        "girdiler": girdiler,
    }
    CIKTI.write_text(json.dumps(sonuc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✓ {CIKTI.relative_to(KOK)} yazıldı ({len(girdiler)} girdi)")


if __name__ == "__main__":
    main()
