/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Veri Toplama Modu (?veri=1) — spec.md §10.
 *
 * - Zorluk yazı-turayla seçilir (Math.random, bilerek tohumsuz: bu bir rastgele atamadır).
 * - Özellikler soru GÖSTERİLMEDEN ÖNCE, yalnızca o an bilinen bilgilerle hesaplanır.
 *   `ozellikleriHesapla` mevcut sorunun cevabını parametre olarak hiç almaz; böylece etiket sızıntısı
 *   fonksiyonun imzası düzeyinde engellenir.
 * - Kişisel veri yok: satırda serbest metin, ad, e-posta, cihaz bilgisi tutulmaz; oturum kimliği rastgeledir.
 */

import {
  Konu,
  ProjeKarti,
  SecilmisSoru,
  SoruCevap,
  Zorluk,
  ZorlukTercihi,
} from "../types/sePrimer";

export const VERI_STORAGE_KEY = "sePrimer.veri.v1";

export type ZorlukKaynagi = "yazitura" | "model" | "kural" | "yedek";

/** spec §10.2'deki 7 model girdisi, sırasıyla. */
export interface OzellikVektoru {
  seviye: number;
  konu_beceri_puani: number;
  konudaki_onceki_soru_sayisi: number;
  konudaki_onceki_riskli_sayisi: number;
  son_karar_suresi_sn: number;
  son_gerekce_uzunlugu: number;
  oturum_no: number;
}

/** Bir önceki cevaptan "son_" özellikleri için gereken iki ölçüm. */
export interface OncekiOlcum {
  kararSuresiSn?: number;
  gerekceUzunlugu?: number;
}

export interface VeriSatiri extends OzellikVektoru {
  proje_id: string;
  oturum_id: string;
  soru_id: string;
  konu: string;
  slot: number;
  soru_zorlugu: 0 | 1;
  zorluk_kaynagi: ZorlukKaynagi;
  karar_suresi_sn: number;
  basari: 0 | 1;
  kaynak: "gercek" | "sentetik";
  p_model: string; // v2 modeli devreye girene kadar boş
}

/** CSV sütun sırası: kimlik → 7 özellik (spec §10.2) → soru_zorlugu → kayıt/etiket sütunları. */
export const CSV_SUTUNLARI: (keyof VeriSatiri)[] = [
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
];

// --------------------------------------------------------------------------- mod ve rastgelelik

export function veriModuAcikMi(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("veri") === "1";
}

/** %50 / %50 yazı-tura. Bilerek tohumsuz (CLAUDE.md: seed 13 bu atamaya uygulanmaz). */
export function yaziTura(): Zorluk {
  return Math.random() < 0.5 ? "kolay" : "zor";
}

/** 1. ve 3. soru için birbirinden bağımsız iki yazı-tura. 2. soru eski kuralla seçilir. */
export function yaziTuraTercihi(): ZorlukTercihi {
  return { 1: yaziTura(), 3: yaziTura() };
}

/**
 * Rastgele kimlik (proje_id, oturum_id). crypto.randomUUID yalnızca güvenli bağlamda (https / localhost) var;
 * telefondan yerel ağ IP'siyle (http) açılınca yoksa getRandomValues ile v4 UUID üretilir.
 */
export function kimlikUret(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Kartta proje kimliği yoksa (v1 kartı, eski içe aktarma) yenisini ekler; varsa kartı aynen döndürür. */
export function projeIdGaranti<T extends { projeId?: string }>(kart: T): T {
  return kart.projeId ? kart : { ...kart, projeId: kimlikUret() };
}

// --------------------------------------------------------------------------- özellikler

/** 0 = Yeni başladım, 1 = Biraz deneyimim var, 2 = Deneyimliyim. Tanınmayan serbest metin → 0. */
export function seviyeKodla(seviye: string | undefined): number {
  const s = (seviye || "").toLocaleLowerCase("tr");
  if (s.includes("biraz")) return 1;
  if (s.includes("deneyim")) return 2;
  return 0;
}

/** Karttaki en son cevaplanmış sorunun ölçümü (oturumun 1. sorusu için "son_" değerleri). */
export function sonOlcumuBul(kart: ProjeKarti): OncekiOlcum | undefined {
  const sonOturum = kart.oturumlar[kart.oturumlar.length - 1];
  const sonCevap = sonOturum?.sorular[sonOturum.sorular.length - 1];
  return sonCevap ? olcumAl(sonCevap) : undefined;
}

export function olcumAl(c: Pick<SoruCevap, "kararSuresiSn" | "gerekceUzunlugu">): OncekiOlcum {
  return { kararSuresiSn: c.kararSuresiSn, gerekceUzunlugu: c.gerekceUzunlugu };
}

/**
 * Soru gösterilmeden önce bilinen bilgilerle 7 özelliği hesaplar.
 * `kart` oturum başındaki karttır (bu oturumun cevapları henüz içinde değildir).
 * Ölçümü olmayan eski cevaplarda (v1 verisi) "son_" değerleri 0 olur.
 */
export function ozellikleriHesapla(
  kart: ProjeKarti,
  konu: Konu | string,
  oncekiOlcum: OncekiOlcum | undefined
): OzellikVektoru {
  const konudakiCevaplar = kart.oturumlar.flatMap((o) => o.sorular).filter((c) => c.konu === konu);
  return {
    seviye: seviyeKodla(kart.seviye),
    konu_beceri_puani: kart.beceri[konu as Konu] ?? 0,
    konudaki_onceki_soru_sayisi: konudakiCevaplar.length,
    konudaki_onceki_riskli_sayisi: konudakiCevaplar.filter(
      (c) => c.riskDerecesi === "orta" || c.riskDerecesi === "yuksek"
    ).length,
    son_karar_suresi_sn: yuvarla(oncekiOlcum?.kararSuresiSn ?? 0),
    son_gerekce_uzunlugu: oncekiOlcum?.gerekceUzunlugu ?? 0,
    oturum_no: kart.oturumlar.length + 1,
  };
}

// --------------------------------------------------------------------------- satır

/** İstenen zorluk yoksa "kural"; gösterilen = istenen ise tercihin kaynağı; değilse "yedek". */
export function zorlukKaynagiBul(
  soru: Pick<SecilmisSoru, "istenenZorluk" | "zorluk">,
  tercihKaynagi: "yazitura" | "model"
): ZorlukKaynagi {
  if (!soru.istenenZorluk) return "kural";
  return soru.zorluk === soru.istenenZorluk ? tercihKaynagi : "yedek";
}

/** Etiket: karar sorusunda düşük risk = 1, kontrol sorusunda "Evet" (riskDerecesi "dusuk") = 1. */
export function basariBul(c: Pick<SoruCevap, "riskDerecesi">): 0 | 1 {
  return c.riskDerecesi === "dusuk" ? 1 : 0;
}

export function satirOlustur(
  projeId: string,
  oturumId: string,
  soru: SecilmisSoru,
  cevap: SoruCevap,
  ozellik: OzellikVektoru,
  slot: number
): VeriSatiri {
  return {
    proje_id: projeId,
    oturum_id: oturumId,
    soru_id: soru.id,
    konu: soru.konu,
    slot,
    ...ozellik,
    soru_zorlugu: soru.zorluk === "zor" ? 1 : 0,
    zorluk_kaynagi: zorlukKaynagiBul(soru, "yazitura"),
    karar_suresi_sn: yuvarla(cevap.kararSuresiSn ?? 0),
    basari: basariBul(cevap),
    kaynak: "gercek",
    p_model: "",
  };
}

// --------------------------------------------------------------------------- depolama ve CSV

export function satirlariOku(): VeriSatiri[] {
  try {
    const raw = localStorage.getItem(VERI_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function satirlariEkle(yeni: VeriSatiri[]): number {
  const tumu = [...satirlariOku(), ...yeni];
  try {
    localStorage.setItem(VERI_STORAGE_KEY, JSON.stringify(tumu));
  } catch (error) {
    console.error("Veri satırları kaydedilemedi:", error);
  }
  return tumu.length;
}

function hucre(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvOlustur(satirlar: VeriSatiri[]): string {
  const govde = satirlar.map((r) => CSV_SUTUNLARI.map((k) => hucre(r[k])).join(","));
  return [CSV_SUTUNLARI.join(","), ...govde].join("\n") + "\n";
}

export function csvIndir(satirlar: VeriSatiri[] = satirlariOku()): void {
  const blob = new Blob([csvOlustur(satirlar)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "oturumlar.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function yuvarla(x: number): number {
  return Math.round(x * 100) / 100;
}
