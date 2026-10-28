/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, ArrowRight, Shield, Layers, Database, Cpu, CheckCircle2, Upload } from "lucide-react";
import { Asama, Konu, ProjeKarti } from "../types/sePrimer";
import { ORNEK_PROJE } from "../services/storage";

interface TanismaScreenProps {
  onProjeOlustur: (proje: ProjeKarti) => void;
  onOrnekProjeYukle: () => void;
  onProjeYukle?: (proje: ProjeKarti) => void;
}

const ASAMA_LISTESI: { value: Asama; label: string }[] = [
  { value: "fikir", label: "01. Fikir / Konsept" },
  { value: "tasarim", label: "02. Sistem Tasarımı" },
  { value: "kodlama", label: "03. Kodlama / Geliştirme" },
  { value: "test", label: "04. Test & Doğrulama" },
  { value: "teslim", label: "05. Teslimat / Dağıtım" },
  { value: "bitti", label: "06. Canlıda / Tamamlandı" },
];

export const TanismaScreen: React.FC<TanismaScreenProps> = ({
  onProjeOlustur,
  onOrnekProjeYukle,
  onProjeYukle,
}) => {
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [asama, setAsama] = useState<Asama>("kodlama");
  const [seviye, setSeviye] = useState("Yeni başladım");
  const [rol, setRol] = useState("2 kişilik ekip");
  const [hedef, setHedef] = useState("");
  const [onYuz, setOnYuz] = useState("React + Vite");
  const [arkaUc, setArkaUc] = useState("Node.js / Express");
  const [veriTabani, setVeriTabani] = useState("PostgreSQL");
  const [mimari, setMimari] = useState("İstemci Ağırlıklı SPA + REST API");
  const [kisiselVeri, setKisiselVeri] = useState("Evet (Ad, e-posta)");
  const [ogrenmekIstedigiKonu, setOgrenmekIstedigiKonu] = useState<Konu>("mimari");
  const [bilmedigiKonu, setBilmedigiKonu] = useState<Konu>("guvenlik");
  const [hata, setHata] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad.trim()) {
      setHata("Lütfen projenizin adını belirtin.");
      return;
    }
    if (!aciklama.trim()) {
      setHata("Lütfen projenizin kısa açıklamasını yazın.");
      return;
    }

    const yeniProje: ProjeKarti = {
      ad: ad.trim(),
      aciklama: aciklama.trim(),
      asama,
      seviye: seviye.trim() || "Lisans Projesi",
      rol: rol.trim() || "Geliştirici",
      hedef: hedef.trim() || aciklama.trim(),
      teknoloji: {
        onYuz: onYuz.trim() || "Modern Frontend",
        arkaUc: arkaUc.trim() || "Sunucu Servisi",
        veriTabani: veriTabani.trim() || "İlişkisel / NoSQL",
      },
      mimari: mimari.trim() || "Modüler İstemci-Sunucu",
      kisiselVeri: kisiselVeri.trim() || "Hayır",
      dosyaYapisi: `${ad.toLowerCase().replace(/[^a-z0-9]/g, "-")}/
├── src/
│   ├── components/
│   ├── services/
│   ├── types/
│   └── main.tsx
└── package.json`,
      beceri: {
        kapsam: 2,
        mimari: 2,
        veriTabani: 2,
        dosyaDuzeni: 2,
        test: 0,
        guvenlik: 1,
        dagitim: 1,
        rapor: 1,
      },
      acikRiskler: [
        "Başlangıç Aşaması: Henüz mimari risk değerlendirmesi yapılmadı.",
        "Test Kapsamı: Otomasyonlu testler belirlenmedi.",
      ],
      oturumlar: [],
      ogrenmekIstedigiKonu,
      bilmedigiKonu,
    };

    onProjeOlustur(yeniProje);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Editorial Title Banner */}
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#515F74] uppercase mb-1">
          <span>KILAVUZ // BÖLÜM 01</span>
          <span>•</span>
          <span>TANIŞMA VE BAŞLANGIÇ</span>
        </div>
        <h1 className="text-2xl font-bold font-headline text-[#0F172A] leading-tight">
          Yazılım Mimarisini Netleştirin
        </h1>
        <p className="mt-2 text-sm text-[#334155] leading-relaxed">
          SE Primer, projenizin mimari tercihlerini, veritabanı kararlarını ve güvenlik risklerini adım adım denetleyen bir mühendislik rehberidir.
        </p>
      </div>

      {/* Quick Example Loader Card */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#0F172A]" />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-[#0F172A]">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>HIZLI BAŞLANGIÇ</span>
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A] mt-1">
              Örnek Proje: Kampüs Etkinlik
            </h3>
            <p className="text-xs text-[#515F74] mt-1 line-clamp-2">
              React + Firebase (Firestore), 2 kişilik ekip, kodlama aşaması ve test edilmemiş kişisel veri akışı.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            data-cy="ornek-proje"
            onClick={onOrnekProjeYukle}
            className="w-full py-2 px-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-mono font-semibold rounded border border-[#CBD5E1] transition-all flex items-center justify-center space-x-1.5 active:bg-[#CBD5E1]"
          >
            <span>$ load sample_project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onProjeYukle && (
            <label className="w-full py-2 px-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-mono font-semibold rounded border border-[#CBD5E1] transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#515F74]" />
              <span>Yedekten İçe Aktar (JSON)</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const parsed = JSON.parse(ev.target?.result as string);
                      if (parsed && parsed.ad && parsed.beceri) {
                        onProjeYukle(parsed);
                      } else {
                        setHata("Geçersiz SE Primer JSON dosyası.");
                      }
                    } catch {
                      setHata("JSON dosyası ayrıştırılamadı.");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-[#E2E8F0]"></div>
        <span className="flex-shrink mx-3 text-[11px] font-mono text-[#76777D] uppercase">veya kendi projeni tanımla</span>
        <div className="flex-grow border-t border-[#E2E8F0]"></div>
      </div>

      {/* Project Definition Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {hata && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded text-xs text-[#DC2626] font-medium flex items-center space-x-2">
            <span>{hata}</span>
          </div>
        )}

        {/* Proje Adı */}
        <div className="space-y-1">
          <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase tracking-wide">
            Proje Adı <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            required
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="ör. Kampüs Etkinlik, Mezun Ağı, Kütüphane API"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors"
          />
        </div>

        {/* Kısa Açıklama */}
        <div className="space-y-1">
          <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase tracking-wide">
            Proje Açıklaması <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Uygulama ne işe yarıyor? Kimler hangi amaçla kullanacak?"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors resize-none"
          />
        </div>

        {/* Aşama Seçimi */}
        <div className="space-y-1">
          <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase tracking-wide">
            Mevcut Aşama
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ASAMA_LISTESI.map((item) => {
              const secili = asama === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setAsama(item.value)}
                  className={`text-left px-2.5 py-1.5 text-xs font-mono rounded border transition-colors ${
                    secili
                      ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A]"
                      : "bg-[#FFFFFF] text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ekip & Seviye */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-[#515F74] uppercase">
              Ekip & Rol
            </label>
            <input
              type="text"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              placeholder="ör. 2 kişilik ekip, Tek geliştirici"
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-[#515F74] uppercase">
              Mühendislik Deneyimi
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-cy="seviye-yeni"
                onClick={() => setSeviye("Yeni başladım")}
                className={`px-2 py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                  seviye === "Yeni başladım"
                    ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] font-semibold"
                    : "bg-[#FFFFFF] text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Yeni başladım
              </button>
              <button
                type="button"
                data-cy="seviye-deneyimli"
                onClick={() => setSeviye("Deneyimliyim")}
                className={`px-2 py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                  seviye === "Deneyimliyim"
                    ? "bg-[#0F172A] text-[#FFFFFF] border-[#0F172A] font-semibold"
                    : "bg-[#FFFFFF] text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Deneyimliyim
              </button>
            </div>
          </div>
        </div>

        {/* Teknoloji Kümesi */}
        <div className="border border-[#E2E8F0] rounded p-3 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#334155]" />
            <span>TEKNOLOJİ YIĞINI (TECH STACK)</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <span className="block text-[10px] font-mono text-[#515F74]">ÖN YÜZ (FRONTEND)</span>
              <input
                type="text"
                value={onYuz}
                onChange={(e) => setOnYuz(e.target.value)}
                placeholder="ör. React, Next.js, Vue, Svelte"
                className="w-full mt-0.5 px-2 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <span className="block text-[10px] font-mono text-[#515F74]">ARKA UÇ (BACKEND)</span>
              <input
                type="text"
                value={arkaUc}
                onChange={(e) => setArkaUc(e.target.value)}
                placeholder="ör. Node/Express, Django, Firebase Functions"
                className="w-full mt-0.5 px-2 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <span className="block text-[10px] font-mono text-[#515F74]">VERİ TABANI</span>
              <input
                type="text"
                value={veriTabani}
                onChange={(e) => setVeriTabani(e.target.value)}
                placeholder="ör. PostgreSQL, MongoDB, Cloud Firestore"
                className="w-full mt-0.5 px-2 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* Mimari & Kişisel Veri */}
        <div className="grid grid-cols-1 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-[#515F74] uppercase">
              Mimari Yaklaşım
            </label>
            <input
              type="text"
              value={mimari}
              onChange={(e) => setMimari(e.target.value)}
              placeholder="ör. SPA + REST API, Monolit MVC, Mikroservis"
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-[#515F74] uppercase">
              Kişisel Veri (KVKK / Gizlilik)
            </label>
            <input
              type="text"
              value={kisiselVeri}
              onChange={(e) => setKisiselVeri(e.target.value)}
              placeholder="ör. Evet (Ad, e-posta, tel) veya Hayır"
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>

        {/* İlk Oturum Odak Konuları (Kural 5: 1-Öğrenmek istediği, 2-Bilmiyorum dediği) */}
        <div className="border border-[#E2E8F0] rounded p-3 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-1.5">
            <Layers className="w-3.5 h-3.5 text-[#334155]" />
            <span>İLK OTURUM ÖNCELİKLERİ</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-semibold text-[#515F74] uppercase">
                ÖĞRENMEK İSTEDİĞİN
              </label>
              <select
                value={ogrenmekIstedigiKonu}
                onChange={(e) => setOgrenmekIstedigiKonu(e.target.value as Konu)}
                className="w-full px-2 py-1.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
              >
                <option value="kapsam">Kapsam</option>
                <option value="mimari">Mimari</option>
                <option value="veriTabani">Veri Tabanı</option>
                <option value="dosyaDuzeni">Dosya Düzeni</option>
                <option value="test">Test</option>
                <option value="guvenlik">Güvenlik</option>
                <option value="dagitim">Dağıtım</option>
                <option value="rapor">Rapor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-semibold text-[#515F74] uppercase">
                EN ÇOK TEREDDÜT ETTİĞİN
              </label>
              <select
                value={bilmedigiKonu}
                onChange={(e) => setBilmedigiKonu(e.target.value as Konu)}
                className="w-full px-2 py-1.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0F172A]"
              >
                <option value="guvenlik">Güvenlik</option>
                <option value="mimari">Mimari</option>
                <option value="veriTabani">Veri Tabanı</option>
                <option value="test">Test</option>
                <option value="dosyaDuzeni">Dosya Düzeni</option>
                <option value="dagitim">Dağıtım</option>
                <option value="kapsam">Kapsam</option>
                <option value="rapor">Rapor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gönder Butonu */}
        <button
          type="submit"
          data-cy="tanisma-gonder"
          className="w-full mt-4 py-3 px-4 bg-[#0F172A] hover:bg-[#000000] text-[#FFFFFF] text-sm font-mono font-semibold rounded border border-[#0F172A] shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
        >
          <span>Projemi tanıt & Soru Seansını Başlat</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
