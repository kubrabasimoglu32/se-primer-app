/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Layers,
  FileText,
  Download,
  TrendingUp,
  Check,
  Sparkles,
  FileEdit,
  Tag,
} from "lucide-react";
import { ProjeKarti, BeceriHaritasi, Asama } from "../types/sePrimer";

interface KarneModalProps {
  proje: ProjeKarti;
  onKapat: () => void;
  onAsamaDegistir?: (yeniAsama: Asama) => void;
  onDisaAktar: () => void;
}

const BECERI_ISIMLERI: Record<keyof BeceriHaritasi, string> = {
  kapsam: "Kapsam",
  mimari: "Mimari",
  veriTabani: "Veri Tabanı",
  dosyaDuzeni: "Dosya Düzeni",
  test: "Test",
  guvenlik: "Güvenlik",
  dagitim: "Dağıtım",
  rapor: "Rapor",
};

export const KarneModal: React.FC<KarneModalProps> = ({
  proje,
  onKapat,
  onAsamaDegistir,
  onDisaAktar,
}) => {
  const isBitti = proje.asama === "bitti";

  // Toplam puan hesabı
  const mevcutToplamPuan = Object.values(proje.beceri).reduce((a, b) => a + b, 0);
  const maxPuan = 40;
  const yuzde = Math.round((mevcutToplamPuan / maxPuan) * 100);

  // Oturumlara göre puan gelişimi (Çizgi Grafiği Verisi)
  // Başlangıç noktası (Oturum 0) ve her oturumun kümülatif puanı
  const oturumlar = proje.oturumlar;
  const grafikNoktalari: { etiket: string; tarih: string; puan: number }[] = [];

  // Başlangıç skoru tahmini (oturumlardan önceki puan)
  let toplamFark = 0;
  oturumlar.forEach((o) => {
    if (o.puanFarki) {
      Object.values(o.puanFarki).forEach((f) => (toplamFark += f || 0));
    }
  });

  const baslangicPuani = Math.max(0, Math.min(40, mevcutToplamPuan - toplamFark));
  grafikNoktalari.push({
    etiket: "00. Başlangıç",
    tarih: "İlk Tanım",
    puan: baslangicPuani,
  });

  let yuruyenPuan = baslangicPuani;
  oturumlar.forEach((o, i) => {
    let buOturumFarki = 0;
    if (o.puanFarki) {
      Object.values(o.puanFarki).forEach((f) => (buOturumFarki += f || 0));
    } else {
      o.sorular.forEach((s) => {
        if (s.tur === "karar") {
          if (s.riskDerecesi === "dusuk") buOturumFarki += 1;
          else if (s.riskDerecesi === "yuksek") buOturumFarki -= 1;
        } else if (s.tur === "kontrol") {
          if (s.secilenSecenekId === "A" || s.cevap === "Evet") buOturumFarki += 1;
        }
        if (s.degerlendirme === "yeterli") buOturumFarki += 1;
      });
    }

    if (o.beceriSnapshot) {
      yuruyenPuan = Object.values(o.beceriSnapshot).reduce((a, b) => a + b, 0);
    } else {
      yuruyenPuan = Math.max(0, Math.min(40, yuruyenPuan + buOturumFarki));
    }

    grafikNoktalari.push({
      etiket: `Oturum #${o.no}`,
      tarih: o.tarih,
      puan: yuruyenPuan,
    });
  });

  // Eğer son oturum mevcut puandan farklıysa son noktayı mevcut puana sabitle
  if (grafikNoktalari.length > 1) {
    grafikNoktalari[grafikNoktalari.length - 1].puan = mevcutToplamPuan;
  }

  // Çizgi Grafiği SVG Koordinatları
  const svgWidth = 420;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 24;

  const cizimGenislik = svgWidth - paddingX * 2;
  const cizimYukseklik = svgHeight - paddingY * 2;

  const points = grafikNoktalari.map((item, index) => {
    const x =
      grafikNoktalari.length === 1
        ? svgWidth / 2
        : paddingX + (index / (grafikNoktalari.length - 1)) * cizimGenislik;
    const y = svgHeight - paddingY - (item.puan / maxPuan) * cizimYukseklik;
    return { ...item, x, y };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Alan doldurma poligonu
  const areaPolygonStr =
    points.length > 1
      ? `${points[0].x},${svgHeight - paddingY} ${polylineStr} ${
          points[points.length - 1].x
        },${svgHeight - paddingY}`
      : "";

  // Açılan ve Kapanan Riskler Defteri
  const tumEklenenRiskler: { risk: string; oturumNo: number; tarih: string }[] = [];
  const tumKapatilanRiskler: { risk: string; oturumNo: number; tarih: string }[] = [];

  oturumlar.forEach((o) => {
    if (o.eklenenRiskler) {
      o.eklenenRiskler.forEach((r) => {
        tumEklenenRiskler.push({ risk: r, oturumNo: o.no, tarih: o.tarih });
      });
    }
    if (o.kapatilanRiskler) {
      o.kapatilanRiskler.forEach((r) => {
        tumKapatilanRiskler.push({ risk: r, oturumNo: o.no, tarih: o.tarih });
      });
    }
  });

  // Karar Kayıtları (Tüm karar soruları ve R-02 notları)
  const tumKararKayitlari: {
    oturumNo: number;
    tarih: string;
    soruId: string;
    konu: string;
    metin: string;
    cevap: string;
    riskDerecesi?: "dusuk" | "orta" | "yuksek";
    riskMetni?: string;
    gerekce?: string;
    tutorYaniti?: string;
    kararNotu?: string;
  }[] = [];

  oturumlar.forEach((o) => {
    o.sorular.forEach((s) => {
      if (s.tur === "karar" || s.kararNotu || s.soruId === "R-02") {
        tumKararKayitlari.push({
          oturumNo: o.no,
          tarih: o.tarih,
          soruId: s.soruId,
          konu: s.konu,
          metin: s.metin,
          cevap: s.cevap,
          riskDerecesi: s.riskDerecesi,
          riskMetni: s.risk,
          gerekce: s.kullaniciGerekcesi,
          tutorYaniti: s.tutorYaniti,
          kararNotu: s.kararNotu,
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#0F172A] rounded-lg max-w-2xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div
          className={`p-4 border-b flex items-start justify-between text-left ${
            isBitti
              ? "bg-[#064E3B] text-[#FFFFFF] border-[#047857]"
              : "bg-[#0F172A] text-[#FFFFFF] border-[#1E293B]"
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded flex items-center justify-center shrink-0 border ${
                isBitti
                  ? "bg-[#059669] border-[#34D399] text-[#FFFFFF]"
                  : "bg-[#1E293B] border-[#334155] text-[#38BDF8]"
              }`}
            >
              {isBitti ? (
                <Award className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-80">
                  SE PRIMER // RESMİ KARNE VE DENETİM RAPORU
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                    isBitti
                      ? "bg-[#34D399] text-[#064E3B]"
                      : "bg-[#38BDF8] text-[#0C4A6E]"
                  }`}
                >
                  {isBitti ? "TAMAMLANDI" : proje.asama.toUpperCase()}
                </span>
              </div>
              <h1 className="text-lg font-bold font-headline mt-0.5 leading-snug">
                {isBitti ? "Proje Tamamlandı" : "Proje Karnesi & Mühendislik Raporu"}
              </h1>
              <p className="text-xs opacity-90 font-mono mt-0.5">
                {proje.ad} • {proje.rol} • {proje.teknoloji.onYuz} + {proje.teknoloji.veriTabani}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onKapat}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Report Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 text-[#0F172A] flex-1">
          {/* Completion Celebration (If bitti) */}
          {isBitti && (
            <div className="p-4 bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-md text-left flex items-start space-x-3 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-headline text-[#14532D]">
                  Tebrikler! Proje Başarıyla Teslim Edildi ve Canlıya Alındı
                </h3>
                <p className="text-xs text-[#166534] leading-relaxed">
                  Tüm mimari kararlar, veri güvenliği kontrolleri ve oturum döngüleri tamamlandı.
                  Bu karne, projenizin üretim hazırbulunuşluk (production-readiness) derecesini ve mühendislik olgunluğunu belgeler.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
              <span className="text-[10px] text-[#515F74] uppercase block">TOPLAM PUAN</span>
              <span className="text-base font-bold text-[#0F172A]">{mevcutToplamPuan} / {maxPuan}</span>
              <span className="text-[10px] text-[#16A34A] font-semibold block mt-0.5">%{yuzde} Başarı</span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
              <span className="text-[10px] text-[#515F74] uppercase block">TOPLAM OTURUM</span>
              <span className="text-base font-bold text-[#0F172A]">{oturumlar.length}</span>
              <span className="text-[10px] text-[#515F74] block mt-0.5">{oturumlar.length > 0 ? "Tamamlandı" : "Henüz yok"}</span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
              <span className="text-[10px] text-[#515F74] uppercase block">AÇIK RİSKLER</span>
              <span className={`text-base font-bold ${proje.acikRiskler.length > 0 ? "text-[#D97706]" : "text-[#16A34A]"}`}>
                {proje.acikRiskler.length}
              </span>
              <span className="text-[10px] text-[#515F74] block mt-0.5">Mevcut Risk</span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded">
              <span className="text-[10px] text-[#515F74] uppercase block">KAPATILAN RİSK</span>
              <span className="text-base font-bold text-[#16A34A]">
                {tumKapatilanRiskler.length}
              </span>
              <span className="text-[10px] text-[#16A34A] block mt-0.5">Çözümlendi</span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* ÇİZGİ GRAFİĞİ: BECERİ PUANLARININ OTURUMLARA GÖRE İLERLEMESİ */}
          {/* ======================================================= */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#0F172A]" />
                <h3 className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                  Beceri Puanlarının Oturumlara Göre Çizgi Grafiği
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#515F74]">SKOR ARTIŞI (0-40)</span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 bg-[#F8FAFC] border border-[#E2E8F0] rounded"
              >
                <defs>
                  <linearGradient id="puanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                {[0, 10, 20, 30, 40].map((val) => {
                  const y = svgHeight - paddingY - (val / maxPuan) * cizimYukseklik;
                  return (
                    <g key={val}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        fontSize="9"
                        fill="#94A3B8"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Area under curve */}
                {areaPolygonStr && (
                  <polygon points={areaPolygonStr} fill="url(#puanGradient)" />
                )}

                {/* Connecting Polyline */}
                {points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {/* Data Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke="#0F172A"
                      strokeWidth="2.5"
                    />
                    <text
                      x={p.x}
                      y={p.y - 8}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#0F172A"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {p.puan}
                    </text>
                    {/* X-axis label */}
                    <text
                      x={p.x}
                      y={svgHeight - 8}
                      fontSize="8"
                      fill="#64748B"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {p.etiket.replace("Oturum #", "#")}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[11px] text-[#515F74] font-mono leading-tight">
              Grafik, projenin ilk başlangıç anından son oturuma kadar mühendislik becerilerinde kat edilen toplam puanı (maksimum 40) görselleştirir.
            </p>
          </div>

          {/* ======================================================= */}
          {/* TÜM OTURUMLARIN ÖZETİ                                   */}
          {/* ======================================================= */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#0F172A]" />
                <h3 className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                  Tüm Oturumların Özeti ({oturumlar.length})
                </h3>
              </div>
            </div>

            {oturumlar.length === 0 ? (
              <p className="text-xs text-[#515F74] font-mono py-2">Henüz tamamlanan bir oturum yok.</p>
            ) : (
              <div className="space-y-2.5">
                {oturumlar.map((o) => (
                  <div
                    key={o.no}
                    className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-[#0F172A]">
                          OTURUM #{o.no}
                        </span>
                        <span className="text-[11px] text-[#515F74] font-mono">
                          • {o.tarih}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                          o.sonuc === "saglikli"
                            ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                            : "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]"
                        }`}
                      >
                        {o.sonuc}
                      </span>
                    </div>

                    {/* Değişiklikler */}
                    {o.degisiklikler && o.degisiklikler.length > 0 && (
                      <div className="text-[11px] text-[#334155]">
                        <strong className="font-mono text-[10px] text-[#515F74] uppercase block">
                          Bildirilen Değişiklikler:
                        </strong>
                        <span>{o.degisiklikler.join(", ")}</span>
                      </div>
                    )}

                    {/* Oturum Notu */}
                    {o.not && (
                      <p className="text-[11px] text-[#475569] italic bg-white p-2 rounded border border-[#E2E8F0]">
                        "{o.not}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* AÇILAN VE KAPANAN RİSKLER DEFTERİ                       */}
          {/* ======================================================= */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                <h3 className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                  Açılan ve Kapanan Riskler Defteri
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Açılan / Açık Kalan Riskler */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-[#DC2626]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>AÇIK KALAN RİSKLER ({proje.acikRiskler.length})</span>
                </div>
                {proje.acikRiskler.length === 0 ? (
                  <p className="text-xs text-[#16A34A] font-mono p-2 bg-[#F0FDF4] rounded border border-[#86EFAC]">
                    Açık risk kalmadı.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {proje.acikRiskler.map((r, i) => (
                      <div
                        key={i}
                        className="p-2 bg-[#FFFBEB] border border-[#FCD34D] rounded text-[11px] text-[#92400E] leading-snug"
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kapatılan / Çözümlenen Riskler */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-[#16A34A]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>KAPATILAN RİSKLER ({tumKapatilanRiskler.length})</span>
                </div>
                {tumKapatilanRiskler.length === 0 ? (
                  <p className="text-xs text-[#515F74] font-mono p-2 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                    Henüz kapatılan risk bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {tumKapatilanRiskler.map((kr, i) => (
                      <div
                        key={i}
                        className="p-2 bg-[#F0FDF4] border border-[#86EFAC] rounded text-[11px] text-[#166534] leading-snug flex items-start space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span>{kr.risk}</span>
                          <span className="block text-[9px] font-mono text-[#15803D] mt-0.5">
                            Oturum #{kr.oturumNo} ({kr.tarih})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* KARAR KAYDI: MİMARİ KARAR GÜNLÜĞÜ (ADR)                 */}
          {/* ======================================================= */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-4 h-4 text-[#0F172A]" />
                <h3 className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                  Karar Kaydı (ADR ve R-02 Cevapları)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#515F74]">{tumKararKayitlari.length} Karar</span>
            </div>

            {tumKararKayitlari.length === 0 ? (
              <p className="text-xs text-[#515F74] font-mono py-2">Henüz kayıtlı karar yok.</p>
            ) : (
              <div className="space-y-3">
                {tumKararKayitlari.map((karar, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#0F172A]">
                          {karar.soruId} // {karar.konu.toUpperCase()}
                        </span>
                        <span className="text-[#515F74]">
                          • Oturum #{karar.oturumNo} ({karar.tarih})
                        </span>
                      </div>
                      {karar.riskDerecesi && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            karar.riskDerecesi === "dusuk"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : karar.riskDerecesi === "orta"
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#FEE2E2] text-[#B91C1C]"
                          }`}
                        >
                          {karar.riskDerecesi} risk
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-[#0F172A]">{karar.metin}</p>

                    <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                      <span className="text-[10px] font-mono font-bold text-[#515F74] uppercase block">
                        VERİLEN KARAR / SEÇİM:
                      </span>
                      <p className="text-xs text-[#0F172A] mt-0.5">{karar.cevap}</p>
                    </div>

                    {karar.kararNotu && (
                      <div className="p-2 bg-[#F1F5F9] rounded border border-[#0F172A] text-[#0F172A]">
                        <strong className="text-[10px] font-mono block uppercase text-[#0F172A] flex items-center space-x-1">
                          <Tag className="w-3 h-3" />
                          <span>R-02 MİMARİ KARAR NOTU:</span>
                        </strong>
                        <p className="text-xs font-mono mt-0.5">{karar.kararNotu}</p>
                      </div>
                    )}

                    {karar.gerekce && (
                      <div className="text-[11px] text-[#515F74] italic">
                        <strong>Kullanıcı Gerekçesi:</strong> "{karar.gerekce}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aşama Değiştirme / Projeyi Tamamlama Alanı */}
          {onAsamaDegistir && (
            <div className="p-3 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-xs space-y-2">
              <span className="font-mono text-[10px] font-bold text-[#515F74] uppercase block">
                PROJE AŞAMASINI GÜNCELLE:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[11px]">
                {(["fikir", "tasarim", "kodlama", "test", "teslim", "bitti"] as Asama[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onAsamaDegistir(a)}
                    className={`p-1.5 rounded border text-center transition-colors uppercase ${
                      proje.asama === a
                        ? "bg-[#0F172A] text-white border-[#0F172A] font-bold"
                        : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-slate-100"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex items-center justify-between">
          <button
            type="button"
            data-cy="proje-disa-aktar"
            onClick={onDisaAktar}
            className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-mono font-semibold rounded border border-[#CBD5E1] transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Projeyi Dışa Aktar (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onKapat}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] text-xs font-mono font-semibold rounded transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
