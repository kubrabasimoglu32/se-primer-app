/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Terminal, ArrowRight, ShieldAlert, GitCommit, CheckSquare, Square, BookOpen, Clock, Tag } from "lucide-react";
import { ProjeKarti } from "../types/sePrimer";

interface NeDegistiScreenProps {
  proje: ProjeKarti;
  onOturumuBaslat: (degisiklikler: string[], notMetni: string) => void;
  onProjemEkraninaGit: () => void;
}

interface DegisiklikSecenegi {
  anahtar: string;
  etiket: string;
  aciklama: string;
}

const DEGISIKLIK_SECENEKLERI: DegisiklikSecenegi[] = [
  {
    anahtar: "veriTabani",
    etiket: "Veri tabanı yapısı değiştirildi",
    aciklama: "Yeni alanlar eklendi, tablo/koleksiyon şeması revize edildi.",
  },
  {
    anahtar: "yeniOzellik",
    etiket: "Yeni özellik veya API eklendi",
    aciklama: "Kullanıcıya dokunan yeni bir işlev koda dökülüyor.",
  },
  {
    anahtar: "plan",
    etiket: "Kapsam veya teslim planı değişti",
    aciklama: "Yetişmeyecek özellikler veya öncelik sırası güncellendi.",
  },
  {
    anahtar: "testEkledim",
    etiket: "Testler yazıldı / test kapsamı artırıldı",
    aciklama: "Birim, entegrasyon veya kritik akış testleri koşuldu.",
  },
  {
    anahtar: "yayinaAldim",
    etiket: "Canlıya veya test ortamına yayınlandı",
    aciklama: "Yeni derleme alınıp sunucuya/dağıtım ortamına yüklendi.",
  },
  {
    anahtar: "hataCikti",
    etiket: "Kritik bir hata (bug) çıktı ve düzeltildi",
    aciklama: "Kodda beklenmeyen bir çökme veya veri tutarsızlığı yakalandı.",
  },
];

export const NeDegistiScreen: React.FC<NeDegistiScreenProps> = ({
  proje,
  onOturumuBaslat,
  onProjemEkraninaGit,
}) => {
  const [seciliAnahtarlar, setSeciliAnahtarlar] = useState<string[]>([
    "veriTabani",
  ]);
  const [ozelNot, setOzelNot] = useState("");

  const toggleAnahtar = (anahtar: string) => {
    if (seciliAnahtarlar.includes(anahtar)) {
      setSeciliAnahtarlar(seciliAnahtarlar.filter((a) => a !== anahtar));
    } else {
      setSeciliAnahtarlar([...seciliAnahtarlar, anahtar]);
    }
  };

  const handleBaslat = (e: React.FormEvent) => {
    e.preventDefault();
    onOturumuBaslat(seciliAnahtarlar, ozelNot.trim());
  };

  const sonOturum = proje.oturumlar[proje.oturumlar.length - 1];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Editorial Chapter Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#515F74] uppercase mb-1">
          <span>KILAVUZ // YENİ OTURUM</span>
          <span>•</span>
          <span>GÜNCELLEME TESPİTİ</span>
        </div>
        <h1 className="text-2xl font-bold font-headline text-[#0F172A] leading-tight">
          Ne Değişti?
        </h1>
        <p className="mt-1.5 text-xs text-[#334155] leading-relaxed">
          Son oturumdan bu yana projenizde yapılan teknik güncellemeleri işaretleyin. Soru motoru bu değişikliklere göre hedeflenmiş soruları seçecektir.
        </p>
      </div>

      {/* Current Project Snapshot Card */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono font-semibold text-[#515F74] uppercase tracking-wide">
              KAYITLI PROJE
            </span>
            <h2 className="text-base font-bold font-headline text-[#0F172A] mt-0.5">
              {proje.ad}
            </h2>
            <p className="text-xs text-[#334155] mt-1 line-clamp-2">
              {proje.aciklama}
            </p>
          </div>
          <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#0F172A] font-mono text-[10px] font-semibold border border-[#CBD5E1] rounded uppercase">
            {proje.asama}
          </span>
        </div>

        {/* Quick Meta Stats */}
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] font-mono text-[#515F74]">OTURUM</span>
            <span className="text-sm font-mono font-bold text-[#0F172A]">
              #{proje.oturumlar.length}
            </span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] font-mono text-[#515F74]">AÇIK RİSK</span>
            <span className="text-sm font-mono font-bold text-[#D97706]">
              {proje.acikRiskler.length}
            </span>
          </div>
          <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
            <span className="block text-[10px] font-mono text-[#515F74]">DURUM</span>
            <span
              className={`text-xs font-mono font-bold ${
                sonOturum?.sonuc === "saglikli" ? "text-[#16A34A]" : "text-[#D97706]"
              }`}
            >
              {sonOturum?.sonuc === "saglikli" ? "SAĞLIKLI" : "RİSKLİ"}
            </span>
          </div>
        </div>

        {/* View Project Action */}
        <button
          type="button"
          data-cy="projem-goruntule"
          onClick={onProjemEkraninaGit}
          className="mt-3 w-full py-1.5 px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] text-xs font-mono font-medium rounded border border-[#E2E8F0] transition-colors flex items-center justify-center space-x-1.5"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#515F74]" />
          <span>Projem Sayfasını Doğrudan İncele</span>
        </button>
      </div>

      {/* Changes Form */}
      <form onSubmit={handleBaslat} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>YAPILAN DEĞİŞİKLİKLERİ SEÇİN</span>
            <span className="text-[10px] text-[#515F74] font-normal font-mono">
              ({seciliAnahtarlar.length} seçildi)
            </span>
          </label>

          <div className="space-y-2">
            {DEGISIKLIK_SECENEKLERI.map((secenek) => {
              const secili = seciliAnahtarlar.includes(secenek.anahtar);
              return (
                <button
                  type="button"
                  key={secenek.anahtar}
                  onClick={() => toggleAnahtar(secenek.anahtar)}
                  className={`w-full text-left p-3 rounded border transition-all flex items-start space-x-2.5 ${
                    secili
                      ? "bg-[#FFFFFF] border-[#0F172A] text-[#0F172A] shadow-sm"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:bg-[#FFFFFF]"
                  }`}
                >
                  <div className="mt-0.5 text-[#0F172A]">
                    {secili ? (
                      <CheckSquare className="w-4 h-4 fill-[#0F172A] text-[#FFFFFF]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold leading-snug block">
                      {secenek.etiket}
                    </span>
                    <span className="text-[11px] text-[#515F74] leading-relaxed block mt-0.5">
                      {secenek.aciklama}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Note Entry */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase tracking-wide">
            ÖZEL GELİŞTİRME NOTU (İSTEĞE BAĞLI)
          </label>
          <textarea
            rows={2}
            value={ozelNot}
            onChange={(e) => setOzelNot(e.target.value)}
            placeholder="ör. Firestore kurallarında test modundan çıkıldı, e-posta onay adımı yapıldı..."
            className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors resize-none"
          />
        </div>

        {/* Start Session Button */}
        <button
          type="submit"
          data-cy="ne-degisti-gonder"
          className="w-full py-3 px-4 bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] text-sm font-mono font-semibold rounded border border-[#0F172A] shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
        >
          <span>Oturumu Başlat & Soruları Getir</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
