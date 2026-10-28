/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Shared Gemini client initialization (User-Agent header required by skill)
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  /**
   * POST /api/kart
   * Girdi: tanışma cevapları
   * Çıktı: teknoloji, mimari, dosyaYapisi özeti ve ilk acikRiskler listesi
   * responseSchema ile JSON zorunlu
   * Kullanıcının yazmadığı teknolojiyi uydurma, emin değilsen "bilmiyorum" yaz.
   */
  app.post("/api/kart", async (req, res) => {
    const input = req.body || {};

    if (!ai) {
      console.warn("GEMINI_API_KEY bulunamadı, yerel varsayılanlar döndürülüyor.");
      return res.json({
        teknoloji: {
          onYuz: input.onYuz || "bilmiyorum",
          arkaUc: input.arkaUc || "bilmiyorum",
          veriTabani: input.veriTabani || "bilmiyorum",
        },
        mimari: input.mimari || "Modüler İstemci-Sunucu",
        dosyaYapisi: `src/
├── components/
├── services/
├── types/
└── main.tsx`,
        acikRiskler: [
          "Başlangıç Aşaması: Mimari risk değerlendirmesi yapılmalı.",
          "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
        ],
      });
    }

    try {
      const prompt = `Sen SE Primer yazılım mühendisliği uzmanısın. Kullanıcının proje tanışma yanıtlarını analiz et ve Proje Kartı için teknoloji, mimari, dosya yapısı özeti ve ilk açık riskleri çıkar.

KULLANICI GİRDİSİ:
- Proje Adı: ${input.ad || ""}
- Açıklama: ${input.aciklama || ""}
- Aşama: ${input.asama || "kodlama"}
- Seviye: ${input.seviye || "Lisans"}
- Rol/Ekip: ${input.rol || "Geliştirici"}
- Hedef: ${input.hedef || ""}
- Ön Yüz: ${input.onYuz || ""}
- Arka Uç: ${input.arkaUc || ""}
- Veri Tabanı: ${input.veriTabani || ""}
- Mimari Notu: ${input.mimari || ""}
- Kişisel Veri: ${input.kisiselVeri || ""}

KURALLAR:
1. Kullanıcının yazmadığı bir teknolojiyi ASLA uydurma; kullanıcı belirtmediyse veya emin değilsen "bilmiyorum" yaz.
2. mimari: Kısa ve net bir mimari yaklaşım adı belirle (ör. "İstemci Ağırlıklı SPA + BaaS", "Monolitik MVC", "Mikroservis").
3. dosyaYapisi: Projeye uygun, temiz ve modüler bir ASCII dizin ağacı üret (en fazla 10-15 satır).
4. acikRiskler: Verilen bilgilere göre projenin aşaması ve teknolojisine dair en kritik 2 veya 3 mimari/güvenlik riskini Türkçe birer cümleyle listele.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              teknoloji: {
                type: Type.OBJECT,
                properties: {
                  onYuz: { type: Type.STRING, description: "Ön yüz kütüphanesi veya 'bilmiyorum'" },
                  arkaUc: { type: Type.STRING, description: "Arka uç framework'ü veya 'bilmiyorum'" },
                  veriTabani: { type: Type.STRING, description: "Veri tabanı çözümü veya 'bilmiyorum'" },
                },
                required: ["onYuz", "arkaUc", "veriTabani"],
              },
              mimari: { type: Type.STRING, description: "Mimari yaklaşım" },
              dosyaYapisi: { type: Type.STRING, description: "ASCII dosya ağacı" },
              acikRiskler: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "İlk tespit edilen 2-3 mimari/güvenlik riski",
              },
            },
            required: ["teknoloji", "mimari", "dosyaYapisi", "acikRiskler"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (error) {
      console.warn("POST /api/kart Gemini hatası:", error);
      return res.json({
        teknoloji: {
          onYuz: input.onYuz || "bilmiyorum",
          arkaUc: input.arkaUc || "bilmiyorum",
          veriTabani: input.veriTabani || "bilmiyorum",
        },
        mimari: input.mimari || "Modüler İstemci-Sunucu",
        dosyaYapisi: `src/
├── components/
├── services/
└── main.tsx`,
        acikRiskler: [
          "Başlangıç Aşaması: Mimari risk değerlendirmesi yapılmalı.",
          "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
        ],
      });
    }
  });

  /**
   * POST /api/soru-uyarla
   * Girdi: proje kartı + konuSec'in seçtiği soru
   * Çıktı: aynı soru, metni kullanıcının projesine özel hâle getirilmiş olarak.
   * Kurallar:
   * - Seçeneklerin anlamını, risk etiketlerini, sonuc ve neden alanlarını DEĞİŞTİRME.
   * - Sadece metin, seçenek metinleri ve sonuc/neden içindeki örnekleri projeye uyarla.
   * - Kullanıcının projesinde olmayan bir şeyden söz etme.
   * - JSON şeması banka sorusuyla aynı olsun.
   * - Hata veya zaman aşımında bankadaki orijinal soruyu kullan ve konsola yaz.
   */
  app.post("/api/soru-uyarla", async (req, res) => {
    const { kart, soru } = req.body || {};

    if (!soru) {
      return res.status(400).json({ error: "Soru verisi eksik" });
    }

    if (!ai || !kart) {
      console.warn("Gemini veya proje kartı mevcut değil, orijinal soru kullanılıyor.");
      return res.json(soru);
    }

    try {
      const isKarar = soru.tur === "karar";

      const prompt = `Sen SE Primer soru uyarlama motorusun. Aşağıda konuSec tarafından seçilmiş bir soru ve bir proje kartı yer alıyor.
Görevin, bu sorunun metnini, seçenek metinlerini ve sonuc/neden içindeki örnekleri kullanıcının projesine birebir uyarlamaktır.

PROJE KARTI:
- Ad: ${kart.ad || "Proje"}
- Açıklama: ${kart.aciklama || ""}
- Aşama: ${kart.asama || "kodlama"}
- Ön Yüz: ${kart.teknoloji?.onYuz || ""}
- Arka Uç: ${kart.teknoloji?.arkaUc || ""}
- Veri Tabanı: ${kart.teknoloji?.veriTabani || ""}
- Mimari: ${kart.mimari || ""}
- Kişisel Veri: ${kart.kisiselVeri || ""}

ORİJİNAL SORU:
${JSON.stringify(soru, null, 2)}

ÖNEMLİ VE KESİN KURALLAR:
1. Seçeneklerin anlamını, id'lerini ('A', 'B', 'C'), risk etiketlerini ('dusuk', 'orta', 'yuksek') KESİNLİKLE DEĞİŞTİRME.
2. Sadece soru metnini ve seçeneklerdeki / sonuçlardaki örnekleri kullanıcının projesine uyarlayabilirsin.
3. Kullanıcının projesinde olmayan teknolojilerden veya özelliklerden ASLA söz etme.
4. Soru metninde proje adını ek almadan kullan (ör. "${kart.ad || 'Proje'} projesinde").
5. Orijinal soru yapısını (id, konu, tur, secenekler / evetSonuc / hayirRisk vb.) aynen koru.`;

      let response;

      if (isKarar) {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                konu: { type: Type.STRING },
                tur: { type: Type.STRING },
                metin: { type: Type.STRING },
                secenekler: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      metin: { type: Type.STRING },
                      risk: { type: Type.STRING },
                      sonuc: { type: Type.STRING },
                      neden: { type: Type.STRING },
                    },
                    required: ["id", "metin", "risk", "sonuc", "neden"],
                  },
                },
                notAlani: { type: Type.STRING },
              },
              required: ["id", "konu", "tur", "metin", "secenekler"],
            },
          },
        });
      } else {
        // Kontrol sorusu
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                konu: { type: Type.STRING },
                tur: { type: Type.STRING },
                metin: { type: Type.STRING },
                evetSonuc: { type: Type.STRING },
                hayirRisk: { type: Type.STRING },
                secenekler: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["id", "konu", "tur", "metin", "evetSonuc", "hayirRisk"],
            },
          },
        });
      }

      const parsed = JSON.parse(response.text || "{}");

      // Temel kontroller: id ve tur eşleşmeli
      if (!parsed.id || !parsed.metin) {
        console.warn("Gemini cevabı eksik şemaya sahip, bankadaki soru kullanılıyor.");
        return res.json(soru);
      }

      // Metadata'ları (secimNedeni, oncekiSecimNotu vb.) koru
      const sonSoru = {
        ...soru,
        ...parsed,
        id: soru.id,
        konu: soru.konu,
        tur: soru.tur,
        secimNedeni: soru.secimNedeni,
        oncekiSecimNotu: soru.oncekiSecimNotu,
        gerekceAlani: soru.gerekceAlani,
        notAlani: soru.notAlani || parsed.notAlani,
      };

      // Risk etiketlerinin değiştirilmediğini garantiye al (Kural gereği)
      if (isKarar && Array.isArray(soru.secenekler) && Array.isArray(sonSoru.secenekler)) {
        sonSoru.secenekler = sonSoru.secenekler.map((yeniSecenek: any, idx: number) => {
          const eskiSecenek = soru.secenekler[idx];
          return {
            ...yeniSecenek,
            id: eskiSecenek?.id || yeniSecenek.id,
            risk: eskiSecenek?.risk || yeniSecenek.risk,
          };
        });
      }

      return res.json(sonSoru);
    } catch (error) {
      console.warn("POST /api/soru-uyarla Gemini hatası veya zaman aşımı, bankadaki soru kullanılıyor:", error);
      return res.json(soru);
    }
  });

  /**
   * Savunma Katmanı: Tutor yanıtında doğrudan cevap veren kalıpları kontrol eder ve engeller.
   */
  function savunmaKatmani(yanit: string, ipucuSorusu?: string): string {
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

    const ihlalVarMi = yasakliKaliplar.some((kalip) => kalip.test(yanit));
    if (ihlalVarMi) {
      console.warn("Savunma katmanı tetiklendi, yanıt yerine düşündürücü soru konuldu:", yanit);
      const ipucu = ipucuSorusu || "Bu kararı verirken sistemin ölçeğini ve riskleri nasıl değerlendirirsin?";
      return `Bu kararı senin yerine vermeyeceğim. ${ipucu}`;
    }
    return yanit;
  }

  /**
   * POST /api/tutor
   * İki yerde kullanılır:
   * 1) Açık sorulara veya gerekçelere gelen cevapları değerlendirmek (mod: "degerlendir")
   * 2) Soru ekranındaki "Primer'e sor" alanı (mod: "soru_sor")
   */
  app.post("/api/tutor", async (req, res) => {
    const { mod, kart, soru, ogrenciGirdisi } = req.body || {};

    if (!ogrenciGirdisi || !soru) {
      return res.status(400).json({ error: "Gerekli girdiler eksik" });
    }

    const seviye = (kart?.seviye || "").toLowerCase().includes("deneyim")
      ? "deneyimli"
      : "yeni_baslayan";

    const ipucuSorusu = soru.ipucu || "Bu tercihin sistemin uzun vadeli güvenliği ve bakımı üzerindeki etkisini düşünür müsün?";

    // Gemini mevcut değilse güvenli yerel fallback
    if (!ai) {
      const guvenliYanit = savunmaKatmani(
        mod === "degerlendir"
          ? "Gerekçeniz bağlamı yansıtıyor. Peki bu tercihin oluşturabileceği kenar durumları nasıl yöneteceksiniz?"
          : "Her iki yaklaşımın da farklı ödünleşimleri var. Sizin projenizde en çok can yakacak risk hangisi?",
        ipucuSorusu
      );

      return res.json({
        yanit: guvenliYanit,
        degerlendirme: mod === "degerlendir" ? "kismen" : undefined,
      });
    }

    try {
      if (mod === "degerlendir") {
        const prompt = `Sen SE Primer'in Sokratik tutorusun. Türkçe yaz.
1. Hangi seçeneğin doğru olduğunu ya da açık sorunun doğru cevabını ASLA söyleme veya ima etme.
2. En fazla iki kısa cümle ve bir soru yaz. 60 kelimeyi geçme.
3. Öğrenci cevabı isterse ya da ısrar ederse nazikçe reddet ve düşündüren bir soru sor.
4. Cevaptaki boşluğu yargılamadan bir soruyla görünür kıl.
5. Seviyeye göre konuş: yeni başlayana terimleri sade açıkla, deneyimliye kısa ve teknik ol.
6. Sadece öğrencinin projesi ve sorulan soru hakkında konuş.

PROJE BİLGİSİ:
- Ad: ${kart?.ad || "Proje"}
- Seviye: ${kart?.seviye || "Yeni başladım"}
- Teknolojiler: ${kart?.teknoloji?.onYuz || ""}, ${kart?.teknoloji?.arkaUc || ""}, ${kart?.teknoloji?.veriTabani || ""}

SORU VE BEKLENEN:
- Soru: ${soru.metin}
- Beklenen SE Standardı (SADECE SENİN DEĞERLENDİRMEN İÇİN, ÖĞRENCİYE ASLA SÖYLEME): ${soru.beklenen || "Gerekçeli ve somut bir mühendislik yaklaşımı."}

ÖĞRENCİNİN CEVABI / GEREKÇESİ:
"${ogrenciGirdisi}"

GÖREV:
Öğrencinin cevabını 'beklenen' standartla kıyasla:
- 'yeterli': Somut, projenin gerçeklerini gözeten ve gerekçesi olan cevap.
- 'kismen': Doğru yönde ancak eksik veya belirsiz yönleri olan cevap.
- 'eksik': Yetersiz, boş veya sorunun asıl riskini atlayan cevap.

JSON olarak 'yanit' (en fazla 2 kısa cümle + 1 soru, 60 kelimeyi geçme) ve 'degerlendirme' ('yeterli' | 'kismen' | 'eksik') döndür.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                yanit: { type: Type.STRING },
                degerlendirme: {
                  type: Type.STRING,
                  enum: ["yeterli", "kismen", "eksik"],
                },
              },
              required: ["yanit", "degerlendirme"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        const temizYanit = savunmaKatmani(parsed.yanit || "Yanıtınız kaydedildi. Bu kararın getirdiği temel ödünleşim nedir?", ipucuSorusu);

        return res.json({
          yanit: temizYanit,
          degerlendirme: parsed.degerlendirme || "kismen",
        });
      } else {
        // mod === "soru_sor" ("Primer'e sor" alanı)
        const prompt = `Sen SE Primer'in Sokratik tutorusun. Türkçe yaz.
1. Hangi seçeneğin doğru olduğunu ya da sorunun doğru cevabını ASLA söyleme veya ima etme.
2. En fazla iki kısa cümle ve bir soru yaz. 60 kelimeyi geçme.
3. Öğrenci cevabı isterse ya da ısrar ederse nazikçe reddet ve düşündüren bir soru sor.
4. Cevaptaki boşluğu yargılamadan bir soruyla görünür kıl.
5. Seviyeye göre konuş: yeni başlayana terimleri sade açıkla, deneyimliye kısa ve teknik ol (Öğrenci seviyesi: ${seviye}).
6. Sadece öğrencinin projesi ve sorulan soru hakkında konuş.

PROJE BİLGİSİ:
- Ad: ${kart?.ad || "Proje"}
- Ön Yüz: ${kart?.teknoloji?.onYuz || ""}
- Veri Tabanı: ${kart?.teknoloji?.veriTabani || ""}
- Mimari: ${kart?.mimari || ""}

SORU VE BAĞLAM:
- Soru: ${soru.metin}

ÖĞRENCİNİN TUTORA SORUSU:
"${ogrenciGirdisi}"

GÖREV:
Öğrenciye doğrudan cevabı vermeden, kendi projesindeki kısıtları düşünmesini sağlayacak Sokratik bir yanıt yaz (en fazla 2 kısa cümle ve 1 soru).`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                yanit: { type: Type.STRING },
              },
              required: ["yanit"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        const temizYanit = savunmaKatmani(parsed.yanit || "Bu kararı kendi projenin ölçeğine göre vermen gerekiyor. Hangi seçenekteki risk senin için daha tolere edilebilir?", ipucuSorusu);

        return res.json({
          yanit: temizYanit,
        });
      }
    } catch (error) {
      console.warn("POST /api/tutor hatası:", error);
      const temizYanit = savunmaKatmani(
        mod === "degerlendir"
          ? "Gerekçeniz incelendi. Bu tercihin oluşturabileceği ek yükleri nasıl hafifletmeyi planlıyorsunuz?"
          : "Bu kararda projenin hedefleri belirleyicidir. Kendi sistemin için en kritik gereksinim nedir?",
        ipucuSorusu
      );
      return res.json({
        yanit: temizYanit,
        degerlendirme: mod === "degerlendir" ? "kismen" : undefined,
      });
    }
  });

  // Development vs Production static/Vite handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SE Primer sunucusu hazır: http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Sunucu başlatılamadı:", err);
});
