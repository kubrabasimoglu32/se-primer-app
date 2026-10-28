/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjeKarti, SecilmisSoru, Teknoloji } from "../types/sePrimer";
import { maskele, maskeleNesne, bildirMaskeleme } from "../primer/maskele";

const TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * POST /api/kart
 * Tanışma cevaplarına göre Gemini'den teknoloji, mimari, dosya yapısı ve ilk açık riskleri alır.
 * Kullanıcı girdileri sunucuya gitmeden önce MASKENELİR.
 */
export async function analizEtVeKartOlustur(
  tanismaCevaplari: Partial<ProjeKarti>
): Promise<{
  teknoloji: Teknoloji;
  mimari: string;
  dosyaYapisi: string;
  acikRiskler: string[];
}> {
  // Sunucuya gitmeden önce maskele
  const { temizObj: maskeliTanisma, toplamMaskelenen } = maskeleNesne(tanismaCevaplari);
  if (toplamMaskelenen > 0) {
    bildirMaskeleme(toplamMaskelenen);
  }

  try {
    const res = await fetchWithTimeout("/api/kart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maskeliTanisma),
    });

    if (!res.ok) {
      throw new Error(`Kart analizi HTTP hatası: ${res.status}`);
    }

    const data = await res.json();
    return {
      teknoloji: {
        onYuz: data.teknoloji?.onYuz || tanismaCevaplari.teknoloji?.onYuz || "bilmiyorum",
        arkaUc: data.teknoloji?.arkaUc || tanismaCevaplari.teknoloji?.arkaUc || "bilmiyorum",
        veriTabani: data.teknoloji?.veriTabani || tanismaCevaplari.teknoloji?.veriTabani || "bilmiyorum",
      },
      mimari: data.mimari || tanismaCevaplari.mimari || "Modüler İstemci-Sunucu",
      dosyaYapisi: data.dosyaYapisi || `src/\n├── components/\n├── services/\n└── main.tsx`,
      acikRiskler: Array.isArray(data.acikRiskler) && data.acikRiskler.length > 0
        ? data.acikRiskler
        : [
            "Başlangıç Aşaması: Mimari risk değerlendirmesi yapılmalı.",
            "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
          ],
    };
  } catch (error) {
    console.warn("POST /api/kart çağrısı başarısız oldu veya zaman aşımına uğradı, yerel veriler kullanılıyor:", error);
    return {
      teknoloji: {
        onYuz: tanismaCevaplari.teknoloji?.onYuz || "bilmiyorum",
        arkaUc: tanismaCevaplari.teknoloji?.arkaUc || "bilmiyorum",
        veriTabani: tanismaCevaplari.teknoloji?.veriTabani || "bilmiyorum",
      },
      mimari: tanismaCevaplari.mimari || "Modüler İstemci-Sunucu",
      dosyaYapisi: `src/\n├── components/\n├── services/\n└── main.tsx`,
      acikRiskler: [
        "Başlangıç Aşaması: Mimari risk değerlendirmesi yapılmalı.",
        "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
      ],
    };
  }
}

/**
 * POST /api/soru-uyarla
 * konuSec'in seçtiği her soruyu kullanıcının projesine özel hâle getirmek için Gemini'ye gönderir.
 * Proje kartı metinleri sunucuya gitmeden önce MASKENELİR.
 */
export async function sorulariUyarla(
  kart: ProjeKarti,
  secilmisSorular: SecilmisSoru[]
): Promise<SecilmisSoru[]> {
  const { temizObj: maskeliKart, toplamMaskelenen } = maskeleNesne(kart);
  if (toplamMaskelenen > 0) {
    bildirMaskeleme(toplamMaskelenen);
  }

  const uyarlananSorular = await Promise.all(
    secilmisSorular.map(async (soru) => {
      try {
        const res = await fetchWithTimeout("/api/soru-uyarla", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kart: maskeliKart, soru }),
        });

        if (!res.ok) {
          throw new Error(`Soru uyarlama HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data || !data.metin || !data.id) {
          console.warn(`Soru ${soru.id} için Gemini cevabı geçersiz şemaya sahip, orijinal soru kullanılıyor:`, data);
          return soru;
        }

        return {
          ...soru,
          ...data,
          id: soru.id,
          konu: soru.konu,
          tur: soru.tur,
          secimNedeni: soru.secimNedeni,
          oncekiSecimNotu: soru.oncekiSecimNotu,
          gerekceAlani: soru.gerekceAlani,
          notAlani: soru.notAlani || data.notAlani,
        };
      } catch (error) {
        console.warn(`Soru ${soru.id} uyarlanamadı, bankadaki orijinal soru kullanılıyor:`, error);
        return soru;
      }
    })
  );

  return uyarlananSorular;
}

/**
 * POST /api/tutor
 * Sokratik tutor değerlendirmesi veya "Primer'e sor" yanıtını alır.
 * Kullanıcının yazdığı gerekçe veya soru metni sunucuya gitmeden önce MASKENELİR.
 */
export async function tutorCevapAl(params: {
  mod: "degerlendir" | "soru_sor";
  kart: ProjeKarti;
  soru: SecilmisSoru;
  ogrenciGirdisi: string;
}): Promise<{ yanit: string; degerlendirme?: "yeterli" | "kismen" | "eksik" }> {
  // Girdi ve kartı maskele
  const maskeleSonuc = maskele(params.ogrenciGirdisi);
  const { temizObj: maskeliKart, toplamMaskelenen: kartMaskelenen } = maskeleNesne(params.kart);
  const toplam = maskeleSonuc.maskelenenSayisi + kartMaskelenen;

  if (toplam > 0) {
    bildirMaskeleme(toplam);
  }

  const maskeliParams = {
    ...params,
    kart: maskeliKart,
    ogrenciGirdisi: maskeleSonuc.temizMetin,
  };

  const yasakliKaliplar = [
    /doğru\s+cevap/i,
    /en\s+iyi(si)?\s+[abc]/i,
    /en\s+doğrusu\s+[abc]/i,
    /\b[abc]('?y?ı)?\s+seç/i,
    /\b[abc]\s+seçeneği/i,
    /seçenek\s+[abc]\b/i,
    /cevap\s+[abc]\b/i,
    /cevabın\s+[abc]\b/i,
    /önerilen\s+seçenek\s+[abc]/i,
  ];

  const filtrele = (ham: string) => {
    if (yasakliKaliplar.some((kalip) => kalip.test(ham))) {
      return `Bu kararı senin yerine vermeyeceğim. ${params.soru.ipucu || "Projenin ölçeğini düşünerek hangi seçeneğin riskleri minimize ettiğini değerlendirir misin?"}`;
    }
    return ham;
  };

  try {
    const res = await fetchWithTimeout("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maskeliParams),
    });

    if (!res.ok) {
      throw new Error(`Tutor HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      yanit: filtrele(data.yanit || "Bu kararı kendi projenin ölçeğine göre vermen gerekiyor. Hangi ödünleşimi göze alıyorsun?"),
      degerlendirme: data.degerlendirme,
    };
  } catch (error) {
    console.warn("POST /api/tutor çağrısı başarısız oldu, yerel Sokratik yanıt kullanılıyor:", error);
    const yedek = params.mod === "degerlendir"
      ? "Gerekçeniz proje bağlamı için önemli. Bu seçimin getirdiği potansiyel darboğazı nasıl aşmayı planlıyorsunuz?"
      : "Her iki tercihin de getirdiği ödünleşimler var. Sizin projenizde en kritik başarı kriteri nedir?";
    return {
      yanit: filtrele(yedek),
      degerlendirme: params.mod === "degerlendir" ? "kismen" : undefined,
    };
  }
}
