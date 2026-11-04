/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Zorluk modeli (spec §10): tarayıcıda onnxruntime-web ile çalışır.
 *
 * - Uygulama açılınca model BİR KEZ, modelKaynak.ts'teki commit'e sabit MODEL_URL'den yüklenir (main'den değil).
 * - config.json'daki "features" sırası koddaki OZELLIK_SIRASI ile aynı değilse model kullanılmaz (yedek).
 * - Sorular seçilirken model hazır değilse en fazla BEKLEME_MS beklenir; olmazsa null döner ve
 *   çağıran §10.5 yedeğine (eski konuSec) düşer. Hatalar kullanıcıya gösterilmez, yalnız konsola yazılır.
 */

// "wasm" giriş noktası: yalnız WebAssembly arka ucu (WebGPU/WebGL yok, paket daha küçük).
import * as ort from "onnxruntime-web/wasm";
// .wasm dosyası Vite asset'i olarak çıkar; URL'ye base (/ ya da /se-primer-app/) Vite tarafından eklenir.
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { Konu, KonuZorlukHaritasi, ProjeKarti, Zorluk } from "../types/sePrimer";
import { CONFIG_URL, MODEL_URL } from "./modelKaynak";
import { OZELLIK_SIRASI, OzellikVektoru, ozellikleriHesapla, sonOlcumuBul } from "./veriToplama";

export const BEKLEME_MS = 3000;

export const TUM_KONULAR: Konu[] = [
  "kapsam",
  "mimari",
  "veriTabani",
  "dosyaDuzeni",
  "test",
  "guvenlik",
  "dagitim",
  "rapor",
];

interface ModelConfig {
  features: { name: string }[];
  classes: string[];
  esik: number;
  onnx?: { input?: string; probability_index?: number };
}

export interface ZorlukModeli {
  esik: number;
  /** Her özellik vektörü için p(basari). Sıra spec §10.2 (OZELLIK_SIRASI). */
  tahminEt(vektorler: OzellikVektoru[]): Promise<number[]>;
}

let yukleme: Promise<ZorlukModeli | null> | null = null;
let hazirModel: ZorlukModeli | null = null;

ort.env.wasm.wasmPaths = { wasm: ortWasmUrl };
// GitHub Pages çapraz köken yalıtımı (COOP/COEP) vermez; çok iş parçacığı yok. 7 girdili model için gereksiz de.
ort.env.wasm.numThreads = 1;

async function getir(url: string): Promise<Response> {
  const yanit = await fetch(url);
  if (!yanit.ok) throw new Error(`${url} → HTTP ${yanit.status}`);
  return yanit;
}

async function yukle(): Promise<ZorlukModeli | null> {
  try {
    const [configYanit, modelYanit] = await Promise.all([getir(CONFIG_URL), getir(MODEL_URL)]);
    const config = (await configYanit.json()) as ModelConfig;

    const adlar = (config.features || []).map((f) => f.name);
    if (adlar.length !== OZELLIK_SIRASI.length || adlar.some((ad, i) => ad !== OZELLIK_SIRASI[i])) {
      console.warn("Zorluk modeli kullanılmıyor: config.json özellik sırası koddakiyle aynı değil.", {
        config: adlar,
        kod: OZELLIK_SIRASI,
      });
      return null;
    }
    if (typeof config.esik !== "number") {
      console.warn("Zorluk modeli kullanılmıyor: config.json'da esik yok.");
      return null;
    }

    const oturum = await ort.InferenceSession.create(new Uint8Array(await modelYanit.arrayBuffer()), {
      executionProviders: ["wasm"],
    });
    const girdiAdi = config.onnx?.input || oturum.inputNames[0];
    const olasilikIndeksi = config.onnx?.probability_index ?? 1;
    const olasilikCikisi = oturum.outputNames.includes("probabilities") ? "probabilities" : oturum.outputNames[1];
    const sinifSayisi = config.classes?.length || 2;

    const model: ZorlukModeli = {
      esik: config.esik,
      async tahminEt(vektorler) {
        if (vektorler.length === 0) return [];
        const veri = new Float32Array(vektorler.length * OZELLIK_SIRASI.length);
        vektorler.forEach((v, i) => OZELLIK_SIRASI.forEach((ad, j) => (veri[i * OZELLIK_SIRASI.length + j] = v[ad])));
        const tensor = new ort.Tensor("float32", veri, [vektorler.length, OZELLIK_SIRASI.length]);
        const sonuc = await oturum.run({ [girdiAdi]: tensor });
        const p = sonuc[olasilikCikisi].data as Float32Array;
        return vektorler.map((_, i) => p[i * sinifSayisi + olasilikIndeksi]);
      },
    };
    hazirModel = model;
    return model;
  } catch (hata) {
    console.warn("Zorluk modeli yüklenemedi; eski konuSec kuralı kullanılacak (spec §10.5).", hata);
    return null;
  }
}

/** Modeli bir kez yükler (sonraki çağrılar aynı Promise'i döndürür). Hiçbir zaman reddedilmez. */
export function modeliYukle(): Promise<ZorlukModeli | null> {
  if (!yukleme) yukleme = yukle();
  return yukleme;
}

/** Model hazırsa onu, değilse en fazla `ms` bekleyip sonucu döndürür; süre dolarsa null (yedek). */
export async function modeliBekle(ms = BEKLEME_MS): Promise<ZorlukModeli | null> {
  if (hazirModel) return hazirModel;
  let zamanlayici: ReturnType<typeof setTimeout> | undefined;
  const zamanAsimi = new Promise<null>((coz) => {
    zamanlayici = setTimeout(() => {
      console.warn(`Zorluk modeli ${ms} ms içinde hazır olmadı; bu oturumda eski konuSec kuralı kullanılıyor.`);
      coz(null);
    }, ms);
  });
  const sonuc = await Promise.race([modeliYukle(), zamanAsimi]);
  clearTimeout(zamanlayici);
  return sonuc;
}

/** Beklemeden: model şu an hazırsa döndürür (Shadow tahmini gibi kritik olmayan işler için). */
export function hazirModeliAl(): ZorlukModeli | null {
  return hazirModel;
}

export interface KonuTahminleri {
  harita: KonuZorlukHaritasi;
  p: Partial<Record<Konu, number>>;
}

/**
 * Sorular seçilmeden önce 8 konunun her biri için 7 özelliği (veriToplama.ozellikleriHesapla, spec §10.2)
 * hesaplayıp p(basari) alır. p >= esik → "zor", değilse "kolay" (spec §10.3).
 * Özellikler oturum başındaki karttan ve kartın son cevabının ölçümünden hesaplanır.
 */
export async function konuZorluklariniTahminEt(
  model: ZorlukModeli,
  kart: ProjeKarti
): Promise<KonuTahminleri | null> {
  try {
    const onceki = sonOlcumuBul(kart);
    const vektorler = TUM_KONULAR.map((konu) => ozellikleriHesapla(kart, konu, onceki));
    const olasiliklar = await model.tahminEt(vektorler);
    const harita: KonuZorlukHaritasi = {};
    const p: Partial<Record<Konu, number>> = {};
    TUM_KONULAR.forEach((konu, i) => {
      const deger = olasiliklar[i];
      if (!Number.isFinite(deger)) throw new Error(`${konu} için geçersiz olasılık: ${deger}`);
      p[konu] = deger;
      harita[konu] = (deger >= model.esik ? "zor" : "kolay") as Zorluk;
    });
    return { harita, p };
  } catch (hata) {
    console.warn("Zorluk modeli çalıştırılamadı; eski konuSec kuralı kullanılıyor (spec §10.5).", hata);
    return null;
  }
}
