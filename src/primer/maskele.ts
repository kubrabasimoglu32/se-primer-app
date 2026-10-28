/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MaskelemeSonucu {
  temizMetin: string;
  maskelenenSayisi: number;
  maskelendi: boolean;
  bildirimMesaji?: string;
}

/**
 * Kullanıcının yazdığı tüm metinleri sunucuya gitmeden önce maskeleyen saf fonksiyon (pure function).
 * Kurallar:
 * 1. "key", "secret", "password", "sk-", "AIza" gibi kalıplar içeren satırlar → [gizli-bilgi]
 * 2. Telefon numaraları → [telefon]
 * 3. 11 haneli sayılar (TC Kimlik No vb.) → [kimlik-no]
 * 4. E-posta adresleri → [e-posta]
 */
export function maskele(girdi: string | null | undefined): MaskelemeSonucu {
  if (!girdi || typeof girdi !== "string") {
    return {
      temizMetin: "",
      maskelenenSayisi: 0,
      maskelendi: false,
    };
  }

  let toplamMaskelenen = 0;

  // 1. "key", "secret", "password", "sk-", "AIza" kalıplarını içeren satırlar → [gizli-bilgi]
  const gizliSatirKurali = /(?:key|secret|password|sk-|AIza)/i;

  const satirlar = girdi.split("\n");
  const islenmisSatirlar: string[] = [];

  for (const satir of satirlar) {
    if (satir.trim().length > 0 && gizliSatirKurali.test(satir) && satir.trim() !== "[gizli-bilgi]") {
      islenmisSatirlar.push("[gizli-bilgi]");
      toplamMaskelenen += 1;
    } else {
      islenmisSatirlar.push(satir);
    }
  }

  let metin = islenmisSatirlar.join("\n");

  // 2. Telefon Numaraları:
  // Türkiye formatları (+90 / 0 / boşluklu / tireli / bitişik) ve uluslararası kalıplar
  // ör. 0532 123 45 67, +905551112233, 532-123-4567, 05321234567
  const telefonRegex = /(?:\+?90\s*|\b0)?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;

  metin = metin.replace(telefonRegex, (match) => {
    if (match === "[telefon]") return match;
    toplamMaskelenen += 1;
    return "[telefon]";
  });

  // 3. 11 Haneli Sayılar (TC Kimlik No vb.)
  const onbirHaneRegex = /\b\d{11}\b/g;
  metin = metin.replace(onbirHaneRegex, (match) => {
    if (match === "[kimlik-no]") return match;
    toplamMaskelenen += 1;
    return "[kimlik-no]";
  });

  // 4. E-posta Adresleri
  const epostaRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  metin = metin.replace(epostaRegex, (match) => {
    if (match === "[e-posta]") return match;
    toplamMaskelenen += 1;
    return "[e-posta]";
  });

  const maskelendi = toplamMaskelenen > 0;

  return {
    temizMetin: metin,
    maskelenenSayisi: toplamMaskelenen,
    maskelendi,
    bildirimMesaji: maskelendi ? maskelemeBildirimMetni(toplamMaskelenen) : undefined,
  };
}

/**
 * Maskeleme bildirimi için standart mesaj üretir:
 * "Gönderdiğin metinde kişisel veri ya da anahtar olabilecek 2 şey maskelendi."
 */
export function maskelemeBildirimMetni(adet: number): string {
  return `Gönderdiğin metinde kişisel veri ya da anahtar olabilecek ${adet} şey maskelendi.`;
}

/**
 * Bir nesne içindeki tüm string alanları özyinelemeli (recursive) olarak maskeler.
 * Proje kartı gibi karmaşık yapıları sunucuya göndermeden önce temizlemek için kullanılır.
 */
export function maskeleNesne<T>(obj: T): { temizObj: T; toplamMaskelenen: number } {
  let toplamMaskelenen = 0;

  function tara(deger: any): any {
    if (typeof deger === "string") {
      const res = maskele(deger);
      toplamMaskelenen += res.maskelenenSayisi;
      return res.temizMetin;
    }
    if (Array.isArray(deger)) {
      return deger.map((eleman) => tara(eleman));
    }
    if (deger !== null && typeof deger === "object") {
      const yeniObj: any = {};
      for (const key of Object.keys(deger)) {
        yeniObj[key] = tara(deger[key]);
      }
      return yeniObj;
    }
    return deger;
  }

  const temizObj = tara(obj) as T;
  return { temizObj, toplamMaskelenen };
}

// Global bildirim yayıncısı (Event listener)
type MaskelemeDinleyicisi = (mesaj: string, adet: number) => void;
const dinleyiciler = new Set<MaskelemeDinleyicisi>();

export function onMaskelemeBildirimi(fn: MaskelemeDinleyicisi): () => void {
  dinleyiciler.add(fn);
  return () => {
    dinleyiciler.delete(fn);
  };
}

export function bildirMaskeleme(adet: number): void {
  if (adet <= 0) return;
  const mesaj = maskelemeBildirimMetni(adet);
  dinleyiciler.forEach((fn) => fn(mesaj, adet));
}
