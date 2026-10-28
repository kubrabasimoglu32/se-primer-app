/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Terminal,
  FolderTree,
  FileCode,
  Shield,
  Layers,
  Cpu,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Award,
  FileText,
  Tag,
  Sparkles,
} from "lucide-react";
import { ProjeKarti, BeceriHaritasi, Oturum, Asama } from "../types/sePrimer";
import { KarneModal } from "./KarneModal";

interface ProjemScreenProps {
  proje: ProjeKarti;
  onYeniOturum: () => void;
  onProjeyiSifirla: () => void;
  onProjeYukle?: (yuklenenProje: ProjeKarti) => void;
  onAsamaDegistir?: (yeniAsama: Asama) => void;
}

const BECERI_ETIKETLERI: { key: keyof BeceriHaritasi; label: string; aciklama: string }[] = [
  { key: "kapsam", label: "Kapsam & Gereksinimler", aciklama: "Kullanıcı ihtiyaçları ve MVP sınırları" },
  { key: "mimari", label: "Sistem Mimarisi", aciklama: "Bileşen ve veri akışı tasarımı" },
  { key: "veriTabani", label: "Veri Tabanı & Şema", aciklama: "Koleksiyon ve ilişkisel modelleme" },
  { key: "dosyaDuzeni", label: "Dosya & Modül Düzeni", aciklama: "Sorumlulukların ayrılığı ve temiz kod" },
  { key: "test", label: "Test & Kalite", aciklama: "Otomasyonlu birim ve e2e testler" },
  { key: "guvenlik", label: "Güvenlik & KVKK", aciklama: "Kişisel veri, auth ve yetki kuralları" },
  { key: "dagitim", label: "Dağıtım & CI/CD", aciklama: "Otomatik derleme ve bulut yayını" },
  { key: "rapor", label: "Rapor & Dokümantasyon", aciklama: "Mühendislik kararları ve README" },
];

export const ProjemScreen: React.FC<ProjemScreenProps> = ({
  proje,
  onYeniOturum,
  onProjeyiSifirla,
  onProjeYukle,
  onAsamaDegistir,
}) => {
  const [aktifSekme, setAktifSekme] = useState<"genel" | "beceri" | "kararlar" | "dosyalar">("genel");
  const [genisletilmisOturum, setGenisletilmisOturum] = useState<number | null>(
    proje.oturumlar.length > 0 ? proje.oturumlar[proje.oturumlar.length - 1].no : null
  );
  const [sifirlamaOnayModu, setSifirlamaOnayModu] = useState<boolean>(false);
  const [karneAcik, setKarneAcik] = useState<boolean>(false);
  const [bildirim, setBildirim] = useState<string | null>(null);

  const dosyaGirdiRef = useRef<HTMLInputElement | null>(null);

  const sonOturum: Oturum | undefined = proje.oturumlar[proje.oturumlar.length - 1];
  const sonSonuc = sonOturum?.sonuc || (proje.acikRiskler.length > 0 ? "risk" : "saglikli");
  const isBitti = proje.asama === "bitti";

  // Toplam beceri puanı
  const toplamPuan = Object.values(proje.beceri).reduce((a, b) => a + b, 0);
  const maxPuan = 8 * 5; // 40
  const yuzde = Math.round((toplamPuan / maxPuan) * 100);

  // 1. Beceri haritasında geçen oturuma göre değişim oku (↑ ↓ –)
  const getBeceriDegisim = (key: keyof BeceriHaritasi) => {
    if (proje.oturumlar.length === 0) {
      return {
        fark: 0,
        sembol: "–",
        metin: "–",
        badgeClass: "text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]",
      };
    }

    let fark = 0;
    if (sonOturum?.puanFarki && sonOturum.puanFarki[key] !== undefined) {
      fark = sonOturum.puanFarki[key] || 0;
    } else if (sonOturum?.sorular) {
      sonOturum.sorular.forEach((s) => {
        if (s.konu === key) {
          if (s.tur === "karar") {
            if (s.riskDerecesi === "dusuk") fark += 1;
            else if (s.riskDerecesi === "yuksek") fark -= 1;
          } else if (s.tur === "kontrol") {
            if (s.secilenSecenekId === "A" || s.cevap === "Evet") fark += 1;
          }
          if (s.degerlendirme === "yeterli") fark += 1;
        }
      });
    }

    if (fark > 0) {
      return {
        fark,
        sembol: "↑",
        metin: `↑ +${fark}`,
        badgeClass: "text-[#16A34A] bg-[#DCFCE7] border-[#86EFAC] font-bold",
      };
    } else if (fark < 0) {
      return {
        fark,
        sembol: "↓",
        metin: `↓ ${fark}`,
        badgeClass: "text-[#DC2626] bg-[#FEE2E2] border-[#FCA5A5] font-bold",
      };
    } else {
      return {
        fark: 0,
        sembol: "–",
        metin: "–",
        badgeClass: "text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]",
      };
    }
  };

  // 4. "Projemi dışa aktar" (JSON dosyası indir)
  const handleDisaAktar = () => {
    try {
      const dataStr = JSON.stringify(proje, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = proje.ad.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.href = url;
      link.download = `se_primer_${safeName || "proje"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBildirim("Proje JSON dosyası başarıyla dışa aktarıldı.");
      setTimeout(() => setBildirim(null), 3500);
    } catch (err) {
      console.error("Dışa aktarma hatası:", err);
      setBildirim("Dışa aktarılırken bir hata oluştu.");
      setTimeout(() => setBildirim(null), 3500);
    }
  };

  // 4. "İçe aktar" (dosya seç)
  const handleDosyaSecim = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as ProjeKarti;

        if (!parsed || typeof parsed.ad !== "string" || !parsed.asama || !parsed.beceri) {
          throw new Error("Geçersiz SE Primer JSON dosya yapısı.");
        }

        if (onProjeYukle) {
          onProjeYukle(parsed);
          setBildirim(`"${parsed.ad}" projesi başarıyla içe aktarıldı!`);
          setTimeout(() => setBildirim(null), 4000);
        }
      } catch (err) {
        console.error("İçe aktarma hatası:", err);
        setBildirim("Dosya okunamadı: Geçersiz SE Primer JSON biçimi.");
        setTimeout(() => setBildirim(null), 4000);
      }
    };
    reader.readAsText(file);

    // Sıfırla ki aynı dosya tekrar seçilebilsin
    e.target.value = "";
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Bildirim Balonu */}
      {bildirim && (
        <div className="p-3 bg-[#0F172A] text-white text-xs font-mono rounded shadow-lg flex items-center justify-between animate-fadeIn border border-white/20">
          <span>{bildirim}</span>
          <button
            type="button"
            onClick={() => setBildirim(null)}
            className="text-white/60 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner: Proje Tamamlandı (eğer aşama "bitti" ise) veya Son Oturum Değerlendirmesi */}
      {isBitti ? (
        <div className="p-4 bg-[#064E3B] text-[#FFFFFF] border-2 border-[#10B981] rounded shadow-md relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded bg-[#059669] flex items-center justify-center text-white shrink-0 border border-[#34D399]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A7F3D0]">
                  PROJE DURUMU // RESMİ TAMAMLAMA
                </span>
                <h2 className="text-base font-bold font-headline leading-tight mt-0.5">
                  Proje Tamamlandı & Canlıda
                </h2>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#34D399] text-[#064E3B] uppercase">
              BİTTİ
            </span>
          </div>
          <p className="text-xs text-[#D1FAE5] mt-2 font-mono leading-relaxed">
            Tüm mimari iterasyonlar ve oturum kontrolleri tamamlandı.
          </p>
        </div>
      ) : (
        <div
          className={`p-4 rounded border shadow-sm transition-all relative overflow-hidden ${
            sonSonuc === "saglikli"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]"
              : "bg-[#FFFBEB] border-[#FCD34D] text-[#78350F]"
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-1.5 h-full ${
              sonSonuc === "saglikli" ? "bg-[#16A34A]" : "bg-[#D97706]"
            }`}
          />
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {sonSonuc === "saglikli" ? (
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />
              )}
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  SON OTURUM DEĞERLENDİRMESİ
                </span>
                <h2 className="text-base font-bold font-headline leading-tight mt-0.5">
                  {sonSonuc === "saglikli" ? "Sistem Kararları Sağlıklı" : "İncelenmesi Gereken Mimari Riskler Var"}
                </h2>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                sonSonuc === "saglikli"
                  ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                  : "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]"
              }`}
            >
              {sonSonuc === "saglikli" ? "SAĞLIKLI" : "RİSK"}
            </span>
          </div>

          {sonOturum && (
            <div className="mt-3 pt-2.5 border-t border-black/10 text-xs space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-black/70">
                <span>Oturum #{sonOturum.no} ({sonOturum.tarih})</span>
                <span>{sonOturum.sorular.length} Soru Tamamlandı</span>
              </div>
              {sonOturum.not && (
                <p className="text-xs font-mono text-black/80 italic">
                  "{sonOturum.not}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Project Meta Card */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#515F74] uppercase">
              <span>{proje.seviye}</span>
              <span>•</span>
              <span>{proje.rol}</span>
            </div>
            <h1 className="text-xl font-bold font-headline text-[#0F172A] mt-1">
              {proje.ad}
            </h1>
            <p className="text-xs text-[#334155] mt-1 leading-relaxed">
              {proje.aciklama}
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#0F172A] text-[#FFFFFF] font-mono text-[11px] font-semibold rounded shrink-0 uppercase">
            {proje.asama}
          </span>
        </div>

        {/* Tech Stack Pills */}
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] text-[#515F74] uppercase">ÖN YÜZ</span>
            <span className="text-xs font-semibold text-[#0F172A] truncate block">{proje.teknoloji.onYuz}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] text-[#515F74] uppercase">ARKA UÇ</span>
            <span className="text-xs font-semibold text-[#0F172A] truncate block">{proje.teknoloji.arkaUc}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] text-[#515F74] uppercase">VERİ TABANI</span>
            <span className="text-xs font-semibold text-[#0F172A] truncate block">{proje.teknoloji.veriTabani}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] text-[#515F74] uppercase">KİŞİSEL VERİ (KVKK)</span>
            <span className="text-xs font-semibold text-[#0F172A] truncate block">{proje.kisiselVeri}</span>
          </div>
        </div>

        {/* 3. "Proje karnesini gör" BUTONU */}
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            type="button"
            data-cy="karne-gor"
            onClick={() => setKarneAcik(true)}
            className="w-full py-2.5 px-3 bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] text-xs font-mono font-semibold rounded border border-[#0F172A] shadow-sm transition-all flex items-center justify-center space-x-2"
          >
            <Award className="w-4 h-4 text-[#FDE047]" />
            <span>Proje Karnesini Gör ({isBitti ? "Proje Tamamlandı" : `${yuzde}% Yetkinlik`})</span>
          </button>
        </div>
      </div>

      {/* 4. DIŞA AKTAR VE İÇE AKTAR KARTI */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-3 shadow-xs flex items-center justify-between space-x-2">
        <button
          type="button"
          data-cy="proje-disa-aktar"
          onClick={handleDisaAktar}
          className="flex-1 py-2 px-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-mono font-semibold rounded border border-[#CBD5E1] transition-colors flex items-center justify-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#515F74]" />
          <span>Dışa Aktar (JSON)</span>
        </button>

        <button
          type="button"
          data-cy="proje-ice-aktar"
          onClick={() => dosyaGirdiRef.current?.click()}
          className="flex-1 py-2 px-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-mono font-semibold rounded border border-[#CBD5E1] transition-colors flex items-center justify-center space-x-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-[#515F74]" />
          <span>İçe Aktar (JSON)</span>
        </button>

        {/* Gizli Dosya Seçici */}
        <input
          type="file"
          ref={dosyaGirdiRef}
          accept=".json,application/json"
          onChange={handleDosyaSecim}
          className="hidden"
        />
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#CBD5E1] text-xs font-mono">
        <button
          type="button"
          onClick={() => setAktifSekme("genel")}
          className={`pb-2 px-3 font-semibold transition-all border-b-2 -mb-px ${
            aktifSekme === "genel"
              ? "border-[#0F172A] text-[#0F172A]"
              : "border-transparent text-[#515F74] hover:text-[#0F172A]"
          }`}
        >
          Genel Bakış
        </button>
        <button
          type="button"
          onClick={() => setAktifSekme("beceri")}
          className={`pb-2 px-3 font-semibold transition-all border-b-2 -mb-px ${
            aktifSekme === "beceri"
              ? "border-[#0F172A] text-[#0F172A]"
              : "border-transparent text-[#515F74] hover:text-[#0F172A]"
          }`}
        >
          Beceri Haritası ({yuzde}%)
        </button>
        <button
          type="button"
          onClick={() => setAktifSekme("kararlar")}
          className={`pb-2 px-3 font-semibold transition-all border-b-2 -mb-px ${
            aktifSekme === "kararlar"
              ? "border-[#0F172A] text-[#0F172A]"
              : "border-transparent text-[#515F74] hover:text-[#0F172A]"
          }`}
        >
          Karar Kaydı ({proje.oturumlar.length})
        </button>
        <button
          type="button"
          onClick={() => setAktifSekme("dosyalar")}
          className={`pb-2 px-3 font-semibold transition-all border-b-2 -mb-px ${
            aktifSekme === "dosyalar"
              ? "border-[#0F172A] text-[#0F172A]"
              : "border-transparent text-[#515F74] hover:text-[#0F172A]"
          }`}
        >
          Dosya Ağacı
        </button>
      </div>

      {/* TAB 1: GENEL BAKIŞ */}
      {aktifSekme === "genel" && (
        <div className="space-y-4">
          {/* Açık Riskler Listesi */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#0F172A]">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                <span>AÇIK MİMARİ RİSKLER ({proje.acikRiskler.length})</span>
              </div>
              <span className="text-[10px] font-mono text-[#D97706] font-semibold">DİKKAT GEREKTİRİR</span>
            </div>

            {proje.acikRiskler.length === 0 ? (
              <p className="text-xs text-[#16A34A] font-mono py-2 flex items-center space-x-1.5">
                <Check className="w-4 h-4" />
                <span>Harika! Şu an için kritik açık risk bulunmuyor.</span>
              </p>
            ) : (
              <div className="space-y-2">
                {proje.acikRiskler.map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#FFFBEB] border border-[#FCD34D] rounded text-xs text-[#92400E] flex items-start space-x-2"
                  >
                    <span className="font-mono font-bold text-[10px] bg-[#D97706] text-[#FFFFFF] px-1.5 py-0.2 rounded mt-0.5">
                      R{idx + 1}
                    </span>
                    <span className="leading-relaxed">{risk}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Skill Radar / Progress Summary with Trend Arrows */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-xs font-mono font-bold text-[#0F172A]">
                MÜHENDİSLİK BECERİ SKORU
              </span>
              <span className="text-xs font-mono font-bold text-[#0F172A]">
                {toplamPuan} / {maxPuan} ({yuzde}%)
              </span>
            </div>

            <div className="w-full bg-[#E2E8F0] h-2.5 rounded overflow-hidden">
              <div
                className="bg-[#0F172A] h-full transition-all duration-500"
                style={{ width: `${yuzde}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div className="flex items-center justify-between p-1.5 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <span className="text-[#515F74]">Mimari:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[#0F172A]">{proje.beceri.mimari} / 5</span>
                  <span className={`px-1 rounded text-[10px] border ${getBeceriDegisim("mimari").badgeClass}`}>
                    {getBeceriDegisim("mimari").sembol}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <span className="text-[#515F74]">Test:</span>
                <div className="flex items-center space-x-1.5">
                  <span className={`font-bold ${proje.beceri.test === 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}>
                    {proje.beceri.test} / 5
                  </span>
                  <span className={`px-1 rounded text-[10px] border ${getBeceriDegisim("test").badgeClass}`}>
                    {getBeceriDegisim("test").sembol}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <span className="text-[#515F74]">Veri Tabanı:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[#0F172A]">{proje.beceri.veriTabani} / 5</span>
                  <span className={`px-1 rounded text-[10px] border ${getBeceriDegisim("veriTabani").badgeClass}`}>
                    {getBeceriDegisim("veriTabani").sembol}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <span className="text-[#515F74]">Güvenlik:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[#0F172A]">{proje.beceri.guvenlik} / 5</span>
                  <span className={`px-1 rounded text-[10px] border ${getBeceriDegisim("guvenlik").badgeClass}`}>
                    {getBeceriDegisim("guvenlik").sembol}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB 2: BECERİ HARİTASI & DEĞİŞİM OKLARI (↑ ↓ –)          */}
      {/* ======================================================= */}
      {aktifSekme === "beceri" && (
        <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-2 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold font-headline text-[#0F172A]">
                8 Boyutlu Mühendislik Haritası
              </h3>
              <p className="text-xs text-[#515F74] mt-0.5">
                Geçen oturuma göre değişim okları (↑ ↓ –) ile yetkinlik takibi.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#515F74] px-1.5 py-0.5 bg-[#F1F5F9] rounded border border-[#CBD5E1]">
              {sonOturum ? `Oturum #${sonOturum.no} Değişimi` : "İlk Seans"}
            </span>
          </div>

          <div className="space-y-3.5">
            {BECERI_ETIKETLERI.map((item) => {
              const puan = proje.beceri[item.key] || 0;
              const degisim = getBeceriDegisim(item.key);

              const seviyeMetin =
                puan === 0
                  ? "Yok / Başlanmadı"
                  : puan === 1
                  ? "Başlangıç"
                  : puan === 2
                  ? "Temel"
                  : puan === 3
                  ? "Orta"
                  : puan === 4
                  ? "Yetkin"
                  : "Usta";

              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-semibold text-[#0F172A]">
                          {item.label}
                        </span>
                        {/* DEĞİŞİM OKU ROZETİ (↑ ↓ –) */}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${degisim.badgeClass}`}
                          title={`Geçen oturuma göre değişim: ${degisim.metin}`}
                        >
                          {degisim.metin}
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#515F74]">
                        {item.aciklama}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-[#0F172A]">
                        {puan} / 5
                      </span>
                      <span className="block text-[10px] font-mono text-[#515F74]">
                        {seviyeMetin}
                      </span>
                    </div>
                  </div>

                  {/* 5-step Segmented Bar */}
                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {[1, 2, 3, 4, 5].map((step) => {
                      const aktif = step <= puan;
                      return (
                        <div
                          key={step}
                          className={`h-2 rounded-sm transition-colors ${
                            aktif
                              ? puan <= 1
                                ? "bg-[#D97706]"
                                : "bg-[#0F172A]"
                              : "bg-[#E2E8F0]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB 3: KARAR KAYDI (ADR & R-02 CEVAPLARI, TARİHLİ)       */}
      {/* ======================================================= */}
      {aktifSekme === "kararlar" && (
        <div className="space-y-4">
          <div className="border-b border-[#CBD5E1] pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-headline text-[#0F172A]">
                Mimari Karar Günlüğü (ADR)
              </h3>
              <p className="text-xs text-[#515F74] mt-0.5">
                Tüm oturumlardaki karar soruları, gerekçeler ve R-02 mimari notları.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#515F74]">{proje.oturumlar.length} Oturum</span>
          </div>

          {proje.oturumlar.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-6 text-center text-xs text-[#515F74]">
              Henüz tamamlanmış bir oturum bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {proje.oturumlar.map((oturum) => {
                const acik = genisletilmisOturum === oturum.no;
                const kararSorulari = oturum.sorular.filter(
                  (s) => s.tur === "karar" || s.kararNotu || s.soruId === "R-02"
                );

                return (
                  <div
                    key={oturum.no}
                    className="bg-[#FFFFFF] border border-[#CBD5E1] rounded overflow-hidden shadow-sm"
                  >
                    {/* Oturum Başlığı */}
                    <button
                      type="button"
                      onClick={() => setGenisletilmisOturum(acik ? null : oturum.no)}
                      className="w-full p-3.5 text-left flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            oturum.sonuc === "saglikli" ? "bg-[#16A34A]" : "bg-[#D97706]"
                          }`}
                        />
                        <span className="font-mono text-xs font-bold text-[#0F172A]">
                          OTURUM #{oturum.no}
                        </span>
                        <span className="text-[11px] text-[#515F74] font-mono">
                          • {oturum.tarih}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                            oturum.sonuc === "saglikli"
                              ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                              : "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]"
                          }`}
                        >
                          {oturum.sonuc}
                        </span>
                        {acik ? (
                          <ChevronUp className="w-4 h-4 text-[#515F74]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#515F74]" />
                        )}
                      </div>
                    </button>

                    {/* Oturum İçeriği */}
                    {acik && (
                      <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                        {/* Oturum Notu */}
                        {oturum.not && (
                          <div className="bg-[#FFFFFF] p-2 rounded border border-[#E2E8F0] text-xs font-mono text-[#334155] italic">
                            "{oturum.not}"
                          </div>
                        )}

                        {/* Karar Soruları ve R-02 Cevapları */}
                        <div className="space-y-2.5">
                          {kararSorulari.map((sc, sIdx) => (
                            <div
                              key={sIdx}
                              className="bg-[#FFFFFF] p-3 rounded border border-[#CBD5E1] space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-[#0F172A] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#CBD5E1]">
                                  {sc.soruId} // {sc.konu.toUpperCase()}
                                </span>
                                {sc.riskDerecesi && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                                      sc.riskDerecesi === "dusuk"
                                        ? "bg-[#DCFCE7] text-[#15803D]"
                                        : sc.riskDerecesi === "orta"
                                        ? "bg-[#FEF3C7] text-[#B45309]"
                                        : "bg-[#FEE2E2] text-[#B91C1C]"
                                    }`}
                                  >
                                    {sc.riskDerecesi} risk
                                  </span>
                                )}
                              </div>

                              <p className="font-semibold text-[#0F172A]">{sc.metin}</p>

                              {/* Seçilen Karar */}
                              <div className="p-2 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                                <strong className="text-[10px] font-mono text-[#515F74] uppercase block">
                                  VERİLEN MİMARİ KARAR:
                                </strong>
                                <span className="text-xs text-[#0F172A] font-medium">{sc.cevap}</span>
                              </div>

                              {/* R-02 Karar Notu */}
                              {sc.kararNotu && (
                                <div className="p-2.5 bg-[#FFFBEB] border-2 border-[#FCD34D] rounded text-[#92400E]">
                                  <div className="flex items-center space-x-1.5 font-mono text-[10px] font-bold uppercase mb-1">
                                    <Tag className="w-3.5 h-3.5 text-[#D97706]" />
                                    <span>R-02 MİMARİ KARAR NOTU [{oturum.tarih}]:</span>
                                  </div>
                                  <p className="text-xs font-mono text-[#78350F]">{sc.kararNotu}</p>
                                </div>
                              )}

                              {/* Gerekçe */}
                              {sc.kullaniciGerekcesi && (
                                <div className="p-2 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-[#334155]">
                                  <strong className="text-[10px] font-mono text-[#515F74] block uppercase">
                                    SEÇİM GEREKÇESİ:
                                  </strong>
                                  <span className="text-xs italic">"{sc.kullaniciGerekcesi}"</span>
                                </div>
                              )}

                              {/* SE Mentor Rehberliği */}
                              {sc.tutorYaniti && (
                                <div className="p-2 bg-[#F1F5F9] rounded border border-[#CBD5E1] text-[#334155]">
                                  <strong className="text-[10px] font-mono text-[#0F172A] block">
                                    SE REHBERLİĞİ:
                                  </strong>
                                  <span className="text-[11px]">{sc.tutorYaniti}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOSYA AĞACI (ASCII TREE) */}
      {aktifSekme === "dosyalar" && (
        <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
          <div className="border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <FolderTree className="w-4 h-4 text-[#0F172A]" />
              <h3 className="text-sm font-bold font-headline text-[#0F172A]">
                Proje Dosya Mimarisi
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#515F74]">ASCII TREE</span>
          </div>

          <p className="text-xs text-[#515F74]">
            Projenin önerilen modüler dizin ve katman yapısı:
          </p>

          <div className="p-3 bg-[#0F172A] text-[#F8FAFC] rounded font-mono text-xs overflow-x-auto border border-[#1E293B] shadow-inner">
            <pre className="leading-relaxed">
              {proje.dosyaYapisi || `src/
├── components/
│   ├── UI/
│   └── Features/
├── hooks/
├── services/
│   └── api.ts
├── types/
└── main.tsx`}
            </pre>
          </div>
        </div>
      )}

      {/* Action Footer: "Yeni Oturum" & "Projeyi Sıfırla" */}
      <div className="pt-2 space-y-2.5">
        <button
          type="button"
          data-cy="yeni-oturum"
          onClick={onYeniOturum}
          className="w-full py-3 px-4 bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] text-sm font-mono font-semibold rounded border border-[#0F172A] shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
        >
          <span>Yeni Oturum Başlat ("Ne değişti?")</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {sifirlamaOnayModu ? (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded space-y-2 text-center animate-fadeIn">
            <p className="text-xs font-mono font-medium text-[#DC2626]">
              Proje ve tüm oturum kayıtları silinecek. Emin misiniz?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSifirlamaOnayModu(false)}
                className="py-1.5 px-3 bg-[#FFFFFF] border border-[#CBD5E1] text-[#334155] text-xs font-mono rounded hover:bg-[#F8FAFC]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                data-cy="proje-sifirla"
                onClick={onProjeyiSifirla}
                className="py-1.5 px-3 bg-[#DC2626] text-[#FFFFFF] text-xs font-mono font-semibold rounded hover:bg-[#B91C1C]"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            data-cy="proje-sifirla"
            onClick={() => setSifirlamaOnayModu(true)}
            className="w-full py-2 px-3 bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-mono font-semibold rounded border border-[#FCA5A5] transition-colors flex items-center justify-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Projeyi Sıfırla / Farklı Proje Tanımla</span>
          </button>
        )}
      </div>

      {/* 3. PROJE KARNESİ MODAL / SAYFASI */}
      {karneAcik && (
        <KarneModal
          proje={proje}
          onKapat={() => setKarneAcik(false)}
          onAsamaDegistir={onAsamaDegistir}
          onDisaAktar={handleDisaAktar}
        />
      )}
    </div>
  );
};
