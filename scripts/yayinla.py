"""model/ → Hugging Face model reposu (public), sürüm etiketi, commit'e sabit URL'ler ve doğrulama.

Kullanım (proje kökünde, önce: .venv\\Scripts\\hf auth login):
    .venv\\Scripts\\python scripts/yayinla.py                       # v2.0 (ilk sürüm)
    .venv\\Scripts\\python scripts/yayinla.py --surum v2.0.1 \\
        --mesaj "v2.0.1: model kartı güncellendi (model.onnx değişmedi)" --onceki v2.0
    .venv\\Scripts\\python scripts/yayinla.py --dogrula             # yalnız doğrula (modelKaynak.ts'teki commit)

Token bu betikte okunmaz ve yazdırılmaz; huggingface_hub kayıtlı girişi kendisi kullanır.

Akış:
  1. Repo: <whoami>/se-primer-zorluk (public, model). model.onnx, config.json, README.md tek commit'te yüklenir.
     README'deki <repo_id> yer tutucuları yalnız yüklenen kopyada gerçek adla değiştirilir (yerel dosya değişmez).
  2. Yükleme commit'ine sürüm etiketi (--surum). Etiket zaten varsa yeniden yüklenmez; mevcut etiketin commit'i
     kullanılır (aynı sürüm iki farklı commit'i göstermesin diye).
  3. --onceki verilirse: yeni commit'teki model.onnx'in sha256'sı önceki etiketteki ile karşılaştırılır.
  4. src/primer/modelKaynak.ts: MODEL_SURUM, MODEL_COMMIT, MODEL_URL, CONFIG_URL (ikisi de commit'e sabit).
  5. Doğrulama: sabit commit'ten model.onnx ve config.json indirilir, config'deki örnek girdiyle çalıştırılır,
     yerel model/model.onnx ile aynı olasılığı vermeli (fark <= 1e-6; aynı dosya olduğu için birebir beklenir).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from huggingface_hub import CommitOperationAdd, HfApi, hf_hub_download

KOK = Path(__file__).resolve().parent.parent
MODEL_DIR = KOK / "model"
KAYNAK_TS = KOK / "src" / "primer" / "modelKaynak.ts"
REPO_ADI = "se-primer-zorluk"
VARSAYILAN_SURUM = "v2.0"
VARSAYILAN_MESAJ = "v2.0: zorluk modeli (eval kapısı geçti)"
DOSYALAR = ["model.onnx", "config.json", "README.md"]
TOLERANS = 1e-6


def sabit_url(repo: str, commit: str, dosya: str) -> str:
    return f"https://huggingface.co/{repo}/resolve/{commit}/{dosya}"


def sha256(yol: str | Path) -> str:
    return hashlib.sha256(Path(yol).read_bytes()).hexdigest()


def giris(api: HfApi) -> str:
    try:
        return api.whoami()["name"]
    except Exception:
        sys.exit("✗ Hugging Face girişi yok. Önce: .venv\\Scripts\\hf auth login (write yetkili token)")


def etiket_commit(api: HfApi, repo: str, surum: str) -> str | None:
    """Etiketin gösterdiği COMMIT hash'i. list_repo_refs'teki target_commit annotated tag'de etiket nesnesinin
    hash'ini verebiliyor; bu yüzden etiket model_info(revision=...) ile commit'e çözülür."""
    try:
        refs = api.list_repo_refs(repo, repo_type="model")
    except Exception:
        return None
    if not any(t.name == surum for t in refs.tags):
        return None
    return api.model_info(repo, revision=surum).sha


def yukle(api: HfApi, repo: str, surum: str, mesaj: str) -> str:
    eksik = [d for d in DOSYALAR if not (MODEL_DIR / d).exists()]
    if eksik:
        sys.exit(f"✗ model/ içinde eksik: {eksik}. Önce: .venv\\Scripts\\python train.py")
    config = json.loads((MODEL_DIR / "config.json").read_text(encoding="utf-8"))
    if not config.get("kapi", {}).get("gecti"):
        sys.exit("✗ config.json'a göre eval kapısı geçilmemiş; yayınlanmaz.")

    api.create_repo(repo, repo_type="model", private=False, exist_ok=True)
    mevcut = etiket_commit(api, repo, surum)
    if mevcut:
        print(f"• '{surum}' etiketi zaten var → {mevcut}. Yeniden yüklenmedi.")
        return mevcut

    readme = (MODEL_DIR / "README.md").read_text(encoding="utf-8").replace("<repo_id>", repo)
    islemler = [
        CommitOperationAdd("model.onnx", str(MODEL_DIR / "model.onnx")),
        CommitOperationAdd("config.json", str(MODEL_DIR / "config.json")),
        CommitOperationAdd("README.md", readme.encode("utf-8")),
    ]
    sonuc = api.create_commit(repo, operations=islemler, commit_message=mesaj, repo_type="model")
    commit = sonuc.oid
    api.create_tag(repo, tag=surum, revision=commit, tag_message=mesaj, repo_type="model")
    print(f"✓ yüklendi ve '{surum}' etiketlendi → commit {commit}")
    return commit


def onnx_sha_karsilastir(api: HfApi, repo: str, commit: str, onceki: str) -> None:
    """Yeni commit'teki model.onnx ile önceki etiketteki model.onnx aynı dosya mı? (sha256)"""
    onceki_commit = etiket_commit(api, repo, onceki)
    if not onceki_commit:
        sys.exit(f"✗ önceki etiket '{onceki}' bulunamadı")
    yeni = sha256(hf_hub_download(repo, "model.onnx", revision=commit, force_download=True))
    eski = sha256(hf_hub_download(repo, "model.onnx", revision=onceki_commit, force_download=True))
    yerel = sha256(MODEL_DIR / "model.onnx")
    print(json.dumps({
        "model.onnx sha256": {
            f"{onceki} ({onceki_commit[:12]})": eski,
            f"yeni ({commit[:12]})": yeni,
            "yerel model/model.onnx": yerel,
        },
        "ayni": yeni == eski == yerel,
    }, indent=2, ensure_ascii=False))
    if not (yeni == eski == yerel):
        sys.exit("✗ model.onnx değişmiş: bu bir belge sürümü değil, yeni model sürümüdür")
    print(f"✓ model.onnx {onceki} ile aynı (sha256 {yeni[:16]}…)")


def kaynak_ts_yaz(repo: str, commit: str, surum: str) -> None:
    KAYNAK_TS.write_text(f'''/**
 * Zorluk modelinin kaynağı (spec §10). scripts/yayinla.py üretir; elle değiştirmeyin.
 *
 * Model Hugging Face'ten `main` dalından DEĞİL, commit'e sabitlenmiş URL'den indirilir (CLAUDE.md).
 * Geri almak (rollback) için MODEL_COMMIT önceki commit'e çevrilir; bkz. RELEASE.md.
 */

export const MODEL_REPO = "{repo}";
export const MODEL_SURUM = "{surum}";
export const MODEL_COMMIT = "{commit}";
export const MODEL_URL = "{sabit_url(repo, commit, "model.onnx")}";
export const CONFIG_URL = "{sabit_url(repo, commit, "config.json")}";
''', encoding="utf-8")
    print(f"✓ {KAYNAK_TS.relative_to(KOK)} yazıldı ({surum}, {commit[:12]})")


def olasilik(onnx_yolu: str, x: np.ndarray) -> float:
    oturum = ort.InferenceSession(onnx_yolu, providers=["CPUExecutionProvider"])
    return float(oturum.run(["probabilities"], {"input": x})[0][0, 1])


def dogrula(repo: str, commit: str) -> None:
    """hf_cli.py hub-predict gibi: Hub'daki (sabit commit) dosyalarla tahmin, yerel model/ ile kıyas."""
    hub_onnx = hf_hub_download(repo, "model.onnx", revision=commit, force_download=True)
    hub_config = json.loads(Path(hf_hub_download(repo, "config.json", revision=commit, force_download=True))
                            .read_text(encoding="utf-8"))
    girdi = {f["name"]: f["example"] for f in hub_config["features"]}
    x = np.array([[girdi[f["name"]] for f in hub_config["features"]]], dtype=np.float32)

    p_hub = olasilik(hub_onnx, x)
    p_yerel = olasilik(str(MODEL_DIR / "model.onnx"), x)
    fark = abs(p_hub - p_yerel)
    print(json.dumps({
        "repo": repo, "commit": commit, "url": sabit_url(repo, commit, "model.onnx"),
        "girdi": girdi,
        "p_basari_hub": round(p_hub, 8), "p_basari_yerel": round(p_yerel, 8), "fark": fark,
        "zorluk": "zor" if p_hub >= hub_config["esik"] else "kolay",
        "model_onnx_sha256_hub": sha256(hub_onnx), "model_onnx_sha256_yerel": sha256(MODEL_DIR / "model.onnx"),
    }, indent=2, ensure_ascii=False))
    if fark > TOLERANS:
        sys.exit(f"✗ Hub'daki model yerel modelden farklı sonuç veriyor (fark {fark:.2e})")
    print(f"✓ Hub (commit {commit[:12]}) ve yerel model aynı olasılığı veriyor")


def ts_commit_oku() -> tuple[str, str]:
    if not KAYNAK_TS.exists():
        sys.exit(f"✗ {KAYNAK_TS.relative_to(KOK)} yok. Önce yükleme yapın.")
    s = KAYNAK_TS.read_text(encoding="utf-8")
    return (re.search(r'MODEL_REPO = "([^"]+)"', s).group(1), re.search(r'MODEL_COMMIT = "([0-9a-f]+)"', s).group(1))


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="model/ → Hugging Face (commit'e sabit sürüm)")
    ap.add_argument("--surum", default=VARSAYILAN_SURUM, help="etiket, ör. v2.0.1")
    ap.add_argument("--mesaj", default=VARSAYILAN_MESAJ, help="HF commit mesajı")
    ap.add_argument("--onceki", help="model.onnx sha256'sı bu etiketle aynı olmalı (ör. v2.0)")
    ap.add_argument("--dogrula", action="store_true", help="yalnız doğrula (modelKaynak.ts'teki commit)")
    args = ap.parse_args()

    if args.dogrula:
        dogrula(*ts_commit_oku())
        return

    api = HfApi()
    kullanici = giris(api)
    repo = f"{kullanici}/{REPO_ADI}"
    commit = yukle(api, repo, args.surum, args.mesaj)
    print(f"Repo:      https://huggingface.co/{repo}")
    print(f"Commit:    {commit}")
    print(f"Sabit URL: {sabit_url(repo, commit, 'model.onnx')}")
    if args.onceki:
        onnx_sha_karsilastir(api, repo, commit, args.onceki)
    kaynak_ts_yaz(repo, commit, args.surum)
    dogrula(repo, commit)


if __name__ == "__main__":
    main()
