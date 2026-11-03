"""Ham CSV'leri (data/ham/*.csv) tek bir data/oturumlar.csv'de birleştirir.

Her oyuncu, Projem ekranındaki "Veriyi CSV indir" ile bir dosya gönderir. Dosyalar Excel'den geçmiş olabilir:
- Ayırıcı virgül, noktalı virgül ya da sekme olabilir; başlık satırından otomatik tanınır.
- Türkçe Excel ondalığı virgülle yazar (4,19). Bu tür sayılar 4.19'a çevrilir.
- Kodlama UTF-8 (BOM'lu ya da BOM'suz) ya da Windows-1254 olabilir.

Aynı (oturum_id, soru_id) birden fazla kez gelirse (ör. oyuncu CSV'yi iki kez indirdiyse) ilk satır tutulur.
Çıktıda data/oturumlar.csv'de zaten bulunan sentetik satırlar korunur; gerçek satırlar ham dosyalardan yeniden yazılır.

Kullanım:  python scripts/birlestir.py [--ham data/ham] [--cikti data/oturumlar.csv]
Yalnız standart kütüphane kullanır.
"""

from __future__ import annotations

import argparse
import csv
import re
import statistics
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent

# src/primer/veriToplama.ts içindeki CSV_SUTUNLARI ile aynı sıra (bkz. data/SOZLUK.md).
SUTUNLAR = [
    "proje_id",
    "oturum_id",
    "soru_id",
    "konu",
    "slot",
    "seviye",
    "konu_beceri_puani",
    "konudaki_onceki_soru_sayisi",
    "konudaki_onceki_riskli_sayisi",
    "son_karar_suresi_sn",
    "son_gerekce_uzunlugu",
    "oturum_no",
    "soru_zorlugu",
    "zorluk_kaynagi",
    "karar_suresi_sn",
    "basari",
    "kaynak",
    "p_model",
]
AYIRICILAR = [",", ";", "\t"]
ONDALIK_VIRGUL = re.compile(r"^-?\d+,\d+$")


def metni_oku(yol: Path) -> str:
    for kodlama in ("utf-8-sig", "cp1254"):
        try:
            return yol.read_text(encoding=kodlama)
        except UnicodeDecodeError:
            continue
    raise SystemExit(f"HATA: {yol} okunamadı (UTF-8 ya da Windows-1254 değil).")


def ayirici_bul(baslik: str, yol: Path) -> str:
    """Başlık satırında en çok geçen ayırıcıyı seçer (sütun adlarında ayırıcı karakteri yoktur)."""
    sayilar = {a: baslik.count(a) for a in AYIRICILAR}
    ayirici = max(sayilar, key=sayilar.get)
    if sayilar[ayirici] == 0:
        raise SystemExit(f"HATA: {yol} için ayırıcı bulunamadı (virgül / noktalı virgül / sekme).")
    return ayirici


def hucre_duzelt(deger: str) -> str:
    deger = deger.strip()
    if ONDALIK_VIRGUL.match(deger):
        return deger.replace(",", ".")
    return deger


def dosya_oku(yol: Path) -> tuple[list[dict[str, str]], str]:
    metin = metni_oku(yol)
    satirlar_ham = metin.splitlines()
    if not satirlar_ham:
        return [], ","
    ayirici = ayirici_bul(satirlar_ham[0], yol)
    okuyucu = csv.DictReader(satirlar_ham, delimiter=ayirici)
    basliklar = [b.strip() for b in (okuyucu.fieldnames or [])]
    eksik = [s for s in SUTUNLAR if s not in basliklar]
    if eksik:
        raise SystemExit(f"HATA: {yol.name} içinde eksik sütun(lar): {', '.join(eksik)}")
    okuyucu.fieldnames = basliklar
    satirlar = []
    for r in okuyucu:
        if not any((v or "").strip() for v in r.values()):
            continue  # boş satır (Excel sonda bırakabiliyor)
        satirlar.append({s: hucre_duzelt(r.get(s) or "") for s in SUTUNLAR})
    return satirlar, ayirici


def sayi(deger: str) -> float | None:
    try:
        return float(deger)
    except (TypeError, ValueError):
        return None


def oyuncu_tablosu(satirlar: list[dict[str, str]]) -> None:
    gruplar: dict[str, list[dict[str, str]]] = {}
    for r in satirlar:
        if r["kaynak"] == "gercek":
            gruplar.setdefault(r["proje_id"], []).append(r)
    if not gruplar:
        print("\nGerçek oyuncu yok.")
        return

    basliklar = ["oyuncu (proje_id)", "oturum", "satır", "zor satır", "basari=0", "oturum_no baş.", "medyan karar sn"]
    tablo = []
    for proje_id, rs in gruplar.items():
        oturum_nolar = [int(n) for n in (sayi(r["oturum_no"]) for r in rs) if n is not None]
        sureler = [s for s in (sayi(r["karar_suresi_sn"]) for r in rs) if s is not None]
        tablo.append([
            proje_id[:8],
            str(len({r["oturum_id"] for r in rs})),
            str(len(rs)),
            str(sum(1 for r in rs if r["soru_zorlugu"] == "1")),
            str(sum(1 for r in rs if r["basari"] == "0")),
            str(min(oturum_nolar)) if oturum_nolar else "-",
            f"{statistics.median(sureler):.2f}" if sureler else "-",
        ])
    tablo.sort(key=lambda t: t[0])
    toplam = [
        "TOPLAM",
        str(sum(int(t[1]) for t in tablo)),
        str(sum(int(t[2]) for t in tablo)),
        str(sum(int(t[3]) for t in tablo)),
        str(sum(int(t[4]) for t in tablo)),
        "",
        "",
    ]
    genislik = [max(len(str(x)) for x in sutun) for sutun in zip(basliklar, *tablo, toplam)]

    def yaz(satir: list[str]) -> None:
        print("  ".join(h.ljust(g) if i == 0 else h.rjust(g) for i, (h, g) in enumerate(zip(satir, genislik))))

    print("\nGerçek oyuncular")
    yaz(basliklar)
    print("  ".join("-" * g for g in genislik))
    for t in tablo:
        yaz(t)
    print("  ".join("-" * g for g in genislik))
    yaz(toplam)
    print("\n'oturum_no baş.' = 2 → oyuncu örnek projeyle başladı (örnek projenin hazır 1. oturumu vardır).")


def main() -> int:
    ap = argparse.ArgumentParser(description="data/ham/*.csv dosyalarını data/oturumlar.csv'de birleştirir.")
    ap.add_argument("--ham", type=Path, default=KOK / "data" / "ham")
    ap.add_argument("--cikti", type=Path, default=KOK / "data" / "oturumlar.csv")
    args = ap.parse_args()

    dosyalar = sorted(args.ham.glob("*.csv"))
    if not dosyalar:
        raise SystemExit(f"HATA: {args.ham} içinde CSV yok.")

    gorulen: dict[tuple[str, str], dict[str, str]] = {}
    tekrar = celisen = 0
    for yol in dosyalar:
        satirlar, ayirici = dosya_oku(yol)
        adi = {",": "virgül", ";": "noktalı virgül", "\t": "sekme"}[ayirici]
        print(f"{yol.name}: {len(satirlar)} satır (ayırıcı: {adi})")
        for r in satirlar:
            anahtar = (r["oturum_id"], r["soru_id"])
            if anahtar in gorulen:
                tekrar += 1
                if gorulen[anahtar] != r:
                    celisen += 1
                continue
            gorulen[anahtar] = r

    birlesik = list(gorulen.values())
    print(f"\nTekrar eden (oturum_id, soru_id) atıldı: {tekrar}", end="")
    print(f" (içeriği farklı olan: {celisen} — ilk gelen tutuldu)" if celisen else "")

    # Çıktıda zaten bulunan sentetik satırları koru (sentetik üretici aynı dosyaya yazar).
    sentetik: list[dict[str, str]] = []
    if args.cikti.exists():
        mevcut, _ = dosya_oku(args.cikti)
        sentetik = [r for r in mevcut if r["kaynak"] == "sentetik" and (r["oturum_id"], r["soru_id"]) not in gorulen]

    args.cikti.parent.mkdir(parents=True, exist_ok=True)
    with args.cikti.open("w", encoding="utf-8", newline="") as f:
        yazici = csv.DictWriter(f, fieldnames=SUTUNLAR, lineterminator="\n")
        yazici.writeheader()
        yazici.writerows(birlesik + sentetik)
    print(f"Yazıldı: {args.cikti} — {len(birlesik)} ham satır + {len(sentetik)} korunan sentetik satır")

    oyuncu_tablosu(birlesik)
    return 0


if __name__ == "__main__":
    sys.exit(main())
