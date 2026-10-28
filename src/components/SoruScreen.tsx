/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Check,
  AlertTriangle,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Info,
  XCircle,
  HelpCircle,
  MessageSquare,
  FileEdit,
  Lightbulb,
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  SecilmisSoru,
  SoruCevap,
  OturumSonucu,
  BeceriHaritasi,
  BankSoruSecenek,
  ProjeKarti,
} from "../types/sePrimer";
import { tutorCevapAl } from "../services/api";

interface SoruScreenProps {
  kart: ProjeKarti;
  sorular: SecilmisSoru[];
  oturumNo: number;
  mevcutAcikRiskSayisi: number;
  onOturumTamamla: (
    soruCevaplar: SoruCevap[],
    sonuc: OturumSonucu,
    puanFarki: Partial<BeceriHaritasi>,
    eklenenRiskler: string[],
    kapatilanRiskler: string[],
    genelOturumNotu?: string
  ) => void;
}

interface SoruCevapDurumu {
  secilenId?: "A" | "B" | "C";
  cevapMetni: string;
  riskDerecesi?: "dusuk" | "orta" | "yuksek";
  riskMetni?: string;
  tutorYaniti?: string;
  sonucMetni?: string;
  nedenMetni?: string;
  puanDegisimi: number;
  riskEklesinMi?: string;
  riskKapatsinMi?: string;
  kullaniciGerekcesi?: string;
  kararNotu?: string;
  // Tutor değerlendirmesi
  degerlendirmeSonucu?: "yeterli" | "kismen" | "eksik";
  tutorSokratikYanit?: string;
  // Primer'e sor geçmişi
  primerSorusu?: string;
  primerYaniti?: string;
}

export const SoruScreen: React.FC<SoruScreenProps> = ({
  kart,
  sorular,
  oturumNo,
  mevcutAcikRiskSayisi,
  onOturumTamamla,
}) => {
  const [aktifSoruIndeks, setAktifSoruIndeks] = useState<number>(0);
  const [cevaplar, setCevaplar] = useState<Record<number, SoruCevapDurumu>>({});
  const [gerekceGirdisi, setGerekceGirdisi] = useState<string>("");
  const [kararNotuGirdisi, setKararNotuGirdisi] = useState<string>("");

  // "Primer'e sor" durumları
  const [primerSoruGirdisi, setPrimerSoruGirdisi] = useState<string>("");
  const [primerYukleniyor, setPrimerYukleniyor] = useState<boolean>(false);

  // Gerekçe değerlendirme yüklenme durumu
  const [gerekceDegerlendiriliyor, setGerekceDegerlendiriliyor] = useState<boolean>(false);

  // İpucu görünürlüğü:
  // "Yeni başladım" diyen her soruda bir ipucunu otomatik görür.
  // "Deneyimliyim" diyen ipucu görmez, ama isterse açabilir.
  const isDeneyimli = Boolean(kart?.seviye && kart.seviye.toLowerCase().includes("deneyim"));
  const [ipucuAcik, setIpucuAcik] = useState<boolean>(!isDeneyimli);

  const aktifSoru: SecilmisSoru = sorular[aktifSoruIndeks];
  const toplamSoru = sorular.length; // 3 soru
  const mevcutCevap = cevaplar[aktifSoruIndeks];

  // Soru değiştiğinde ipucu durumunu seviyeye göre sıfırla
  useEffect(() => {
    setIpucuAcik(!isDeneyimli);
    setPrimerSoruGirdisi("");
  }, [aktifSoruIndeks, isDeneyimli]);

  // 1. Karar sorusu için seçenek seçimi
  const handleKararSecenekSec = async (secenekId: "A" | "B" | "C") => {
    if (!aktifSoru.secenekler || !Array.isArray(aktifSoru.secenekler)) return;
    const seceneklerListesi = aktifSoru.secenekler as BankSoruSecenek[];
    const secenek = seceneklerListesi.find((s) => s.id === secenekId);
    if (!secenek) return;

    // Puanlama: dusuk +1, orta 0, yuksek -1 ve açık riske ekle
    let puan = 0;
    let riskEkle: string | undefined = undefined;

    if (secenek.risk === "dusuk") {
      puan = 1;
    } else if (secenek.risk === "orta") {
      puan = 0;
    } else if (secenek.risk === "yuksek") {
      puan = -1;
      riskEkle = `${aktifSoru.konu.toUpperCase()}: ${secenek.metin} - ${secenek.neden}`;
    }

    const oncekiDegerlendirme = mevcutCevap?.degerlendirmeSonucu;
    const oncekiBonus = oncekiDegerlendirme === "yeterli" ? 1 : 0;

    setCevaplar((prev) => ({
      ...prev,
      [aktifSoruIndeks]: {
        ...prev[aktifSoruIndeks],
        secilenId: secenekId,
        cevapMetni: secenek.metin,
        riskDerecesi: secenek.risk,
        riskMetni: secenek.risk === "yuksek" ? secenek.neden : undefined,
        sonucMetni: secenek.sonuc,
        nedenMetni: secenek.neden,
        tutorYaniti: `${secenek.sonuc} (${secenek.neden})`,
        puanDegisimi: puan + oncekiBonus,
        riskEklesinMi: riskEkle,
        kullaniciGerekcesi: gerekceGirdisi.trim(),
        kararNotu: kararNotuGirdisi.trim(),
      },
    }));

    // Eğer gerekçe girilmişse ve henüz değerlendirilmemişse otomatik değerlendir
    if (gerekceGirdisi.trim().length > 3 && !mevcutCevap?.tutorSokratikYanit) {
      void tetikleGerekceDegerlendirme(gerekceGirdisi.trim(), puan, secenek.metin);
    }
  };

  // 2. Kontrol sorusu için 3 düğme: Evet (A) / Hayır (B) / Emin değilim (C)
  const handleKontrolSecenekSec = async (secenekId: "A" | "B" | "C") => {
    const hayirRisk =
      aktifSoru.hayirRisk ||
      `${aktifSoru.konu.toUpperCase()}: Kontrol adımı doğrulanmadı veya eksik.`;

    let temelPuan = 0;
    const oncekiDegerlendirme = mevcutCevap?.degerlendirmeSonucu;
    const oncekiBonus = oncekiDegerlendirme === "yeterli" ? 1 : 0;

    if (secenekId === "A") {
      // Evet: +1 ve ilgili riski kapat
      temelPuan = 1;
      setCevaplar((prev) => ({
        ...prev,
        [aktifSoruIndeks]: {
          ...prev[aktifSoruIndeks],
          secilenId: "A",
          cevapMetni: "Evet",
          riskDerecesi: "dusuk",
          sonucMetni: aktifSoru.evetSonuc || "Kontrol başarıyla sağlandı.",
          nedenMetni: "Gerekli güvenlik ve mimari kontrol önlemleri alınmış durumda.",
          tutorYaniti: aktifSoru.evetSonuc || "Kontrol başarıyla sağlandı.",
          puanDegisimi: temelPuan + oncekiBonus,
          riskKapatsinMi: hayirRisk,
          riskEklesinMi: undefined,
          kullaniciGerekcesi: gerekceGirdisi.trim(),
          kararNotu: kararNotuGirdisi.trim(),
        },
      }));
    } else if (secenekId === "B") {
      // Hayır: hayirRisk metnini açık risklere ekle, puan 0
      temelPuan = 0;
      setCevaplar((prev) => ({
        ...prev,
        [aktifSoruIndeks]: {
          ...prev[aktifSoruIndeks],
          secilenId: "B",
          cevapMetni: "Hayır",
          riskDerecesi: "yuksek",
          riskMetni: hayirRisk,
          sonucMetni: "Bu kontrol adımı henüz uygulanmamış.",
          nedenMetni: hayirRisk,
          tutorYaniti: `Risk Tespiti: ${hayirRisk}`,
          puanDegisimi: temelPuan + oncekiBonus,
          riskEklesinMi: hayirRisk,
          riskKapatsinMi: undefined,
          kullaniciGerekcesi: gerekceGirdisi.trim(),
          kararNotu: kararNotuGirdisi.trim(),
        },
      }));
    } else {
      // Emin değilim: hayirRisk metnini açık risklere ekle, puan 0
      temelPuan = 0;
      setCevaplar((prev) => ({
        ...prev,
        [aktifSoruIndeks]: {
          ...prev[aktifSoruIndeks],
          secilenId: "C",
          cevapMetni: "Emin değilim",
          riskDerecesi: "orta",
          riskMetni: `Belirsizlik: ${hayirRisk}`,
          sonucMetni: "Kontrol durumu net değil; doğrulanması gerekiyor.",
          nedenMetni: hayirRisk,
          tutorYaniti: `Belirsizlik Uyarısı: ${hayirRisk}`,
          puanDegisimi: temelPuan + oncekiBonus,
          riskEklesinMi: hayirRisk,
          riskKapatsinMi: undefined,
          kullaniciGerekcesi: gerekceGirdisi.trim(),
          kararNotu: kararNotuGirdisi.trim(),
        },
      }));
    }

    // Gerekçe varsa değerlendir
    if (gerekceGirdisi.trim().length > 3 && !mevcutCevap?.tutorSokratikYanit) {
      void tetikleGerekceDegerlendirme(gerekceGirdisi.trim(), temelPuan, secenekId);
    }
  };

  // İsteğe bağlı gerekçe metni güncelleme
  const handleGerekceDegisti = (metin: string) => {
    setGerekceGirdisi(metin);
    setCevaplar((prev) => ({
      ...prev,
      [aktifSoruIndeks]: {
        ...prev[aktifSoruIndeks],
        kullaniciGerekcesi: metin.trim(),
      },
    }));
  };

  // Tutor ile gerekçe değerlendirmesi tetikleme (POST /api/tutor mod: "degerlendir")
  const tetikleGerekceDegerlendirme = async (
    metin: string,
    mevcutTemelPuan?: number,
    ekstraBaglam?: string
  ) => {
    if (!metin || metin.trim().length < 3) return;

    setGerekceDegerlendiriliyor(true);
    try {
      const yanitData = await tutorCevapAl({
        mod: "degerlendir",
        kart,
        soru: aktifSoru,
        ogrenciGirdisi: `${metin} ${ekstraBaglam ? `(Seçilen: ${ekstraBaglam})` : ""}`,
      });

      // Puanlama: yeterli → +1, kismen → 0, eksik → 0 ve tutorun sorusu ekranda kalır.
      const bonus = yanitData.degerlendirme === "yeterli" ? 1 : 0;

      setCevaplar((prev) => {
        const aktif = prev[aktifSoruIndeks];
        const temel = mevcutTemelPuan !== undefined ? mevcutTemelPuan : (aktif?.puanDegisimi || 0);

        return {
          ...prev,
          [aktifSoruIndeks]: {
            ...aktif,
            kullaniciGerekcesi: metin,
            tutorSokratikYanit: yanitData.yanit,
            degerlendirmeSonucu: yanitData.degerlendirme || "kismen",
            puanDegisimi: temel + bonus,
          },
        };
      });
    } catch (error) {
      console.warn("Gerekçe değerlendirme başarısız:", error);
    } finally {
      setGerekceDegerlendiriliyor(false);
    }
  };

  // "Primer'e sor" tetikleme (POST /api/tutor mod: "soru_sor")
  const handlePrimereSor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!primerSoruGirdisi.trim() || primerYukleniyor) return;

    const soruMetni = primerSoruGirdisi.trim();
    setPrimerYukleniyor(true);

    try {
      const yanitData = await tutorCevapAl({
        mod: "soru_sor",
        kart,
        soru: aktifSoru,
        ogrenciGirdisi: soruMetni,
      });

      setCevaplar((prev) => ({
        ...prev,
        [aktifSoruIndeks]: {
          ...prev[aktifSoruIndeks],
          primerSorusu: soruMetni,
          primerYaniti: yanitData.yanit,
        },
      }));
      setPrimerSoruGirdisi("");
    } catch (error) {
      console.warn("Primer'e sor hatası:", error);
    } finally {
      setPrimerYukleniyor(false);
    }
  };

  // R-02 için isteğe bağlı karar notu güncelleme
  const handleKararNotuDegisti = (notu: string) => {
    setKararNotuGirdisi(notu);
    setCevaplar((prev) => ({
      ...prev,
      [aktifSoruIndeks]: {
        ...prev[aktifSoruIndeks],
        kararNotu: notu.trim(),
      },
    }));
  };

  const cevaplandi = Boolean(mevcutCevap?.secilenId);

  const handleIleri = () => {
    if (!cevaplandi) return;

    if (aktifSoruIndeks < toplamSoru - 1) {
      const sonrakiIndeks = aktifSoruIndeks + 1;
      setAktifSoruIndeks(sonrakiIndeks);
      setGerekceGirdisi(cevaplar[sonrakiIndeks]?.kullaniciGerekcesi || "");
      setKararNotuGirdisi(cevaplar[sonrakiIndeks]?.kararNotu || "");
    } else {
      tumunuTamamla();
    }
  };

  const tumunuTamamla = () => {
    let genelOturumNotu: string | undefined = undefined;

    const soruCevaplar: SoruCevap[] = sorular.map((s, idx) => {
      const c = cevaplar[idx];
      if (s.notAlani && c?.kararNotu) {
        genelOturumNotu = c.kararNotu;
      }

      return {
        soruId: s.id,
        konu: s.konu,
        tur: s.tur,
        metin: s.metin,
        cevap: c?.cevapMetni || "Yanıtlanmadı",
        risk: c?.riskMetni,
        tutorYaniti: c?.tutorYaniti,
        secilenSecenekId: c?.secilenId,
        riskDerecesi: c?.riskDerecesi,
        secimNedeni: s.secimNedeni,
        kullaniciGerekcesi: c?.kullaniciGerekcesi,
        kararNotu: c?.kararNotu,
        degerlendirme: c?.degerlendirmeSonucu,
        primerSorusu: c?.primerSorusu,
        primerYaniti: c?.primerYaniti,
        sokratikCevap: c?.tutorSokratikYanit || (c?.kullaniciGerekcesi
          ? "Bu kararı verirken sistemin 6 ay sonraki bakım maliyetini ve olası bir ekip değişiminde bilginin nasıl aktarılacağını hesaba kattın mı?"
          : undefined),
      };
    });

    const puanFarki: Partial<BeceriHaritasi> = {};
    const eklenenRiskler: string[] = [];
    const kapatilanRiskler: string[] = [];
    let buOturumdaYuksekRiskVar = false;

    sorular.forEach((s, idx) => {
      const c = cevaplar[idx];
      if (!c) return;

      const konuKey = s.konu as keyof BeceriHaritasi;
      puanFarki[konuKey] = (puanFarki[konuKey] || 0) + (c.puanDegisimi || 0);

      if (c.riskDerecesi === "yuksek") {
        buOturumdaYuksekRiskVar = true;
      }
      if (c.riskEklesinMi) {
        eklenenRiskler.push(c.riskEklesinMi);
      }
      if (c.riskKapatsinMi) {
        kapatilanRiskler.push(c.riskKapatsinMi);
      }
    });

    // Oturum sonucu kuralı:
    // o oturumda yuksek riskli seçim yoksa ve açık risk sayısı azaldıysa veya sıfırsa "saglikli", aksi hâlde "risk".
    const yeniToplamRiskSayisi = Math.max(
      0,
      mevcutAcikRiskSayisi + eklenenRiskler.length - kapatilanRiskler.length
    );
    const riskSayisiAzaldiMiVeyaSifirMi =
      yeniToplamRiskSayisi < mevcutAcikRiskSayisi || yeniToplamRiskSayisi === 0;

    const sonuc: OturumSonucu =
      !buOturumdaYuksekRiskVar && riskSayisiAzaldiMiVeyaSifirMi
        ? "saglikli"
        : "risk";

    onOturumTamamla(
      soruCevaplar,
      sonuc,
      puanFarki,
      eklenenRiskler,
      kapatilanRiskler,
      genelOturumNotu
    );
  };

  const kararSecenekleri = (Array.isArray(aktifSoru.secenekler)
    ? aktifSoru.secenekler
    : []) as BankSoruSecenek[];

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Step Sequencer Header */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded p-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="font-semibold text-[#0F172A]">OTURUM #{oturumNo}</span>
          <span className="text-[#515F74]">ADIM {aktifSoruIndeks + 1} / {toplamSoru}</span>
        </div>

        {/* 3 Step Indicator Nodes */}
        <div className="grid grid-cols-3 gap-2">
          {sorular.map((s, idx) => {
            const tamamlandi = idx < aktifSoruIndeks || (idx === aktifSoruIndeks && cevaplandi);
            const suanki = idx === aktifSoruIndeks;

            return (
              <div
                key={s.id}
                className={`flex flex-col items-center p-1.5 rounded border text-center transition-all ${
                  suanki
                    ? "border-[#D97706] bg-[#FFFBEB] text-[#D97706]"
                    : tamamlandi
                    ? "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]"
                    : "border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]"
                }`}
              >
                <div className="flex items-center space-x-1">
                  {tamamlandi && !suanki ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                  )}
                  <span className="text-[10px] font-mono font-semibold uppercase">{s.konu}</span>
                </div>
                <span className="text-[9px] font-mono text-[#515F74] mt-0.5 truncate w-full">
                  {s.id} ({s.tur})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Study Card */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.05)] space-y-4">
        {/* Chapter Header */}
        <div className="border-b border-[#E2E8F0] pb-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-[#0F172A] text-[#FFFFFF] text-[10px] font-mono font-bold rounded">
              {aktifSoru.tur.toUpperCase()}
            </span>
            <span className="text-xs font-mono font-semibold text-[#515F74] uppercase">
              {aktifSoru.konu}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#76777D] font-bold">
            {aktifSoru.id}
          </span>
        </div>

        {/* Neden Seçildi Notu */}
        <div className="p-2.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded flex items-start space-x-2 text-xs">
          <Info className="w-4 h-4 text-[#0F172A] shrink-0 mt-0.5" />
          <div className="text-[#334155] leading-snug">
            <strong className="font-mono text-[10px] text-[#0F172A] block uppercase">
              SORU SEÇİM GEREKÇESİ:
            </strong>
            <span className="text-xs">{aktifSoru.secimNedeni}</span>
          </div>
        </div>

        {/* Geçen Sefer Seçimi Hatırlatması */}
        {aktifSoru.oncekiSecimNotu && (
          <div className="p-2.5 bg-[#FFFBEB] border border-[#FCD34D] rounded text-xs text-[#92400E] flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[10px] uppercase block">GEÇMİŞ RİSK HATIRLATMASI</strong>
              <span>{aktifSoru.oncekiSecimNotu}</span>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div>
          <h2 className="text-base font-bold font-headline text-[#0F172A] leading-snug">
            {aktifSoru.metin}
          </h2>
        </div>

        {/* ======================================================= */}
        {/* SEVİYEYE GÖRE İPUCU ALANI (Yeni başladım: otomatik, Deneyimliyim: düğmeyle) */}
        {/* ======================================================= */}
        {aktifSoru.ipucu && (
          <div className="space-y-1.5">
            {isDeneyimli ? (
              <div>
                <button
                  type="button"
                  data-cy="ipucu-goster"
                  onClick={() => setIpucuAcik(!ipucuAcik)}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono font-medium text-[#D97706] hover:text-[#B45309] bg-[#FFFBEB] px-2.5 py-1 rounded border border-[#FDE68A] transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{ipucuAcik ? "İpucunu Gizle" : "İpucu Göster"}</span>
                  {ipucuAcik ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            ) : null}

            {ipucuAcik && (
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded text-xs text-[#92400E] flex items-start space-x-2.5 animate-fadeIn">
                <Lightbulb className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-[#B45309] block">
                    MÜHENDİSLİK İPUCU:
                  </span>
                  <p className="text-xs leading-relaxed text-[#78350F]">
                    {aktifSoru.ipucu}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* 1. TÜM KARAR SORULARI: 2 VEYA 3 SEÇENEK KARTI            */}
        {/* ======================================================= */}
        {aktifSoru.tur === "karar" && kararSecenekleri.length > 0 && (
          <div className="space-y-2.5 pt-1">
            {kararSecenekleri.map((secenek) => {
              const secili = mevcutCevap?.secilenId === secenek.id;
              const dataCy = `secenek-${secenek.id}`;

              return (
                <div
                  key={secenek.id}
                  onClick={() => handleKararSecenekSec(secenek.id)}
                  data-cy={dataCy}
                  className={`cursor-pointer rounded border transition-all p-3 text-left relative ${
                    secili
                      ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] shadow-md ring-2 ring-[#0F172A]/20"
                      : "bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1] hover:bg-[#FFFFFF] hover:border-[#0F172A]"
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border ${
                        secili
                          ? "bg-[#FFFFFF] text-[#0F172A] border-[#FFFFFF]"
                          : "bg-[#FFFFFF] text-[#515F74] border-[#CBD5E1]"
                      }`}
                    >
                      {secenek.id}
                    </span>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold leading-relaxed ${secili ? "text-[#FFFFFF]" : "text-[#0F172A]"}`}>
                        {secenek.metin}
                      </p>
                    </div>
                  </div>

                  {/* SEÇİLİNCE GÖRÜNEN KISIM: Risk etiketi, "Ne olur" (sonuc) ve "Neden" (neden) */}
                  {secili && (
                    <div className="mt-3 pt-2.5 border-t border-white/20 space-y-2 text-xs animate-fadeIn">
                      {/* Risk Etiketi */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono uppercase text-white/70">RİSK DERECESİ:</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            secenek.risk === "dusuk"
                              ? "bg-[#16A34A] text-[#FFFFFF]"
                              : secenek.risk === "orta"
                              ? "bg-[#D97706] text-[#FFFFFF]"
                              : "bg-[#DC2626] text-[#FFFFFF]"
                          }`}
                        >
                          {secenek.risk === "dusuk"
                            ? "DÜŞÜK RİSK"
                            : secenek.risk === "orta"
                            ? "ORTA RİSK"
                            : "YÜKSEK RİSK"}
                        </span>
                      </div>

                      {/* "Ne olur" (sonuc) */}
                      <div className="bg-white/10 p-2 rounded border border-white/10">
                        <span className="font-mono text-[10px] text-white/80 block uppercase font-bold">
                          NE OLUR:
                        </span>
                        <p className="text-xs text-white/95 mt-0.5 leading-relaxed">
                          {secenek.sonuc}
                        </p>
                      </div>

                      {/* "Neden" (neden) */}
                      <div className="bg-white/10 p-2 rounded border border-white/10">
                        <span className="font-mono text-[10px] text-white/80 block uppercase font-bold">
                          NEDEN:
                        </span>
                        <p className="text-xs text-white/95 mt-0.5 leading-relaxed">
                          {secenek.neden}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================= */}
        {/* 2. TÜM KONTROL SORULARI: ÜÇ DÜĞME (Evet / Hayır / Emin değilim) */}
        {/* ======================================================= */}
        {aktifSoru.tur === "kontrol" && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              {/* Düğme 1: Evet (A) */}
              <button
                type="button"
                data-cy="secenek-A"
                onClick={() => handleKontrolSecenekSec("A")}
                className={`p-2.5 rounded border text-center transition-all ${
                  mevcutCevap?.secilenId === "A"
                    ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] shadow-md ring-2 ring-[#0F172A]/20"
                    : "bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1] hover:bg-[#FFFFFF]"
                }`}
              >
                <div className="flex items-center justify-center space-x-1 font-mono text-xs font-bold">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      mevcutCevap?.secilenId === "A" ? "text-[#86EFAC]" : "text-[#16A34A]"
                    }`}
                  />
                  <span>Evet</span>
                </div>
                <span className={`block text-[10px] mt-0.5 ${mevcutCevap?.secilenId === "A" ? "text-white/80" : "text-[#515F74]"}`}>
                  Hazır (+1)
                </span>
              </button>

              {/* Düğme 2: Hayır (B) */}
              <button
                type="button"
                data-cy="secenek-B"
                onClick={() => handleKontrolSecenekSec("B")}
                className={`p-2.5 rounded border text-center transition-all ${
                  mevcutCevap?.secilenId === "B"
                    ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] shadow-md ring-2 ring-[#0F172A]/20"
                    : "bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1] hover:bg-[#FFFFFF]"
                }`}
              >
                <div className="flex items-center justify-center space-x-1 font-mono text-xs font-bold">
                  <XCircle
                    className={`w-3.5 h-3.5 ${
                      mevcutCevap?.secilenId === "B" ? "text-[#FCA5A5]" : "text-[#DC2626]"
                    }`}
                  />
                  <span>Hayır</span>
                </div>
                <span className={`block text-[10px] mt-0.5 ${mevcutCevap?.secilenId === "B" ? "text-white/80" : "text-[#515F74]"}`}>
                  Riskli (0)
                </span>
              </button>

              {/* Düğme 3: Emin değilim (C) */}
              <button
                type="button"
                data-cy="secenek-C"
                onClick={() => handleKontrolSecenekSec("C")}
                className={`p-2.5 rounded border text-center transition-all ${
                  mevcutCevap?.secilenId === "C"
                    ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] shadow-md ring-2 ring-[#0F172A]/20"
                    : "bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1] hover:bg-[#FFFFFF]"
                }`}
              >
                <div className="flex items-center justify-center space-x-1 font-mono text-xs font-bold">
                  <HelpCircle
                    className={`w-3.5 h-3.5 ${
                      mevcutCevap?.secilenId === "C" ? "text-[#FDE047]" : "text-[#D97706]"
                    }`}
                  />
                  <span>Emin değilim</span>
                </div>
                <span className={`block text-[10px] mt-0.5 ${mevcutCevap?.secilenId === "C" ? "text-white/80" : "text-[#515F74]"}`}>
                  Riskli (0)
                </span>
              </button>
            </div>

            {/* Kontrol Sonucu Kartı */}
            {cevaplandi && mevcutCevap?.sonucMetni && (
              <div
                className={`p-3 rounded text-xs border animate-fadeIn ${
                  mevcutCevap.secilenId === "A"
                    ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
                    : "bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase mb-1">
                  <span>
                    DURUM: {mevcutCevap.secilenId === "A" ? "KONTROL EDİLDİ" : "AÇIK RİSK EKLENDİ"}
                  </span>
                  <span>{mevcutCevap.secilenId === "A" ? "+1 Puan" : "0 Puan"}</span>
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  {mevcutCevap.sonucMetni}
                </p>
                {mevcutCevap.nedenMetni && (
                  <p className="text-[11px] mt-1 opacity-90">
                    {mevcutCevap.nedenMetni}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* 6. R-02 NOT ALANI VARSA: İSTEĞE BAĞLI KARAR NOTU ALANI  */}
        {/* ======================================================= */}
        {aktifSoru.notAlani && (
          <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5 animate-fadeIn">
            <label className="block text-xs font-mono font-semibold text-[#0F172A] leading-snug flex items-center space-x-1.5">
              <FileEdit className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>{aktifSoru.notAlani}</span>
            </label>
            <textarea
              data-cy="karar-notu-girdisi"
              rows={2}
              value={kararNotuGirdisi}
              onChange={(e) => handleKararNotuDegisti(e.target.value)}
              placeholder="ör. Bu hafta veri tabanı erişimini tamamen sunucu API arkasına taşımaya karar verdik."
              className="w-full p-2.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors resize-none"
            />
          </div>
        )}

        {/* ======================================================= */}
        {/* 3. İSTEĞE BAĞLI "Neden bunu seçtin?" ALANI & SOKRATİK DEĞERLENDİRME */}
        {/* ======================================================= */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#515F74] flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#515F74]" />
              <span>Neden bunu seçtin? (isteğe bağlı)</span>
            </label>
            {gerekceGirdisi.trim().length > 3 && (
              <button
                type="button"
                disabled={gerekceDegerlendiriliyor}
                onClick={() => tetikleGerekceDegerlendirme(gerekceGirdisi.trim(), mevcutCevap?.puanDegisimi)}
                className="text-[10px] font-mono font-semibold text-[#0F172A] hover:underline flex items-center space-x-1"
              >
                {gerekceDegerlendiriliyor ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#0F172A]" />
                    <span>Değerlendiriliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-[#D97706]" />
                    <span>Tutor'a Değerlendir</span>
                  </>
                )}
              </button>
            )}
          </div>
          <textarea
            data-cy="soru-cevap-girdi"
            rows={2}
            value={gerekceGirdisi}
            onChange={(e) => handleGerekceDegisti(e.target.value)}
            placeholder="Tercihinin arkasındaki teknik gerekçeyi birkaç kelimeyle yazabilirsin..."
            className="w-full p-2.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors resize-none"
          />

          {/* Doluysa seçimden sonra tutor bu gerekçeye Sokratik bir soruyla cevap versin */}
          {cevaplandi && (mevcutCevap?.tutorSokratikYanit || gerekceGirdisi.trim().length > 0) && (
            <div className="p-3 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#0F172A]">
                  <Terminal className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>SE MENTOR // SOKRATİK DİYALOG</span>
                </div>

                {/* Değerlendirme Rozeti (yeterli: +1, kismen: 0, eksik: 0) */}
                {mevcutCevap?.degerlendirmeSonucu && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      mevcutCevap.degerlendirmeSonucu === "yeterli"
                        ? "bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]"
                        : mevcutCevap.degerlendirmeSonucu === "kismen"
                        ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                        : "bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]"
                    }`}
                  >
                    {mevcutCevap.degerlendirmeSonucu === "yeterli"
                      ? "Yeterli (+1 Puan)"
                      : mevcutCevap.degerlendirmeSonucu === "kismen"
                      ? "Kısmen (0 Puan)"
                      : "Eksik (0 Puan)"}
                  </span>
                )}
              </div>

              {gerekceDegerlendiriliyor ? (
                <div className="flex items-center space-x-2 text-xs text-[#515F74] font-mono py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F172A]" />
                  <span>Sokratik mentor gerekçeni analiz ediyor...</span>
                </div>
              ) : (
                <p className="text-xs text-[#334155] leading-relaxed italic">
                  “{mevcutCevap?.tutorSokratikYanit ||
                    "Bu kararı verirken sistemin 6 ay sonraki bakım maliyetini ve olası bir ekip değişiminde bilginin nasıl aktarılacağını hesaba kattın mı? Farklı bir yaklaşım seçseydin ilk ne zorlaşırdı?"}”
                </p>
              )}
            </div>
          )}
        </div>

        {/* ======================================================= */}
        {/* 4. "PRIMER'E SOR" ALANI (Soru ekranında Sokratik danışma)  */}
        {/* ======================================================= */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
          <label className="text-xs font-mono font-semibold text-[#0F172A] flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>Primer'e Sor</span>
            </span>
            <span className="text-[10px] font-normal text-[#515F74]">Sokratik danışman</span>
          </label>

          <form onSubmit={handlePrimereSor} className="flex space-x-1.5">
            <input
              type="text"
              data-cy="primere-sor-girdi"
              value={primerSoruGirdisi}
              onChange={(e) => setPrimerSoruGirdisi(e.target.value)}
              placeholder="ör. Bu iki yaklaşımın ölçeklenebilirlik farkı nedir?"
              className="flex-1 p-2 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors"
            />
            <button
              type="submit"
              data-cy="primere-sor-gonder"
              disabled={primerYukleniyor || !primerSoruGirdisi.trim()}
              className={`px-3 py-2 text-xs font-mono font-semibold rounded border transition-all flex items-center justify-center space-x-1 ${
                primerSoruGirdisi.trim() && !primerYukleniyor
                  ? "bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] border-[#0F172A]"
                  : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
              }`}
            >
              {primerYukleniyor ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {/* Primer'in Sokratik Yanıtı */}
          {mevcutCevap?.primerYaniti && (
            <div className="p-3 bg-[#F8FAFC] border border-[#0F172A]/20 rounded text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#0F172A]">
                <span>TUTOR DİYALOĞU:</span>
                <span className="text-[#515F74] font-normal italic">
                  “{mevcutCevap.primerSorusu}”
                </span>
              </div>
              <p className="text-xs text-[#1E293B] leading-relaxed font-sans">
                {mevcutCevap.primerYaniti}
              </p>
            </div>
          )}
        </div>

        {/* Action Button: Devam / Sonucu Gör */}
        <div className="pt-2">
          {aktifSoruIndeks < toplamSoru - 1 ? (
            <button
              type="button"
              data-cy="devam"
              disabled={!cevaplandi}
              onClick={handleIleri}
              className={`w-full py-3 px-4 text-xs font-mono font-semibold rounded border transition-all flex items-center justify-center space-x-2 ${
                cevaplandi
                  ? "bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] border-[#0F172A] shadow-sm active:scale-[0.99]"
                  : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
              }`}
            >
              <span>Sonraki Soruya Geç (Adım {aktifSoruIndeks + 2})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              data-cy="sonuc"
              disabled={!cevaplandi}
              onClick={handleIleri}
              className={`w-full py-3 px-4 text-xs font-mono font-semibold rounded border transition-all flex items-center justify-center space-x-2 ${
                cevaplandi
                  ? "bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] border-[#0F172A] shadow-md active:scale-[0.99]"
                  : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>Oturumu Tamamla & Projem Sonucunu Gör</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
