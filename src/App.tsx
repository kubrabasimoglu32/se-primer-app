/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Terminal, ShieldCheck, X } from "lucide-react";
import { Header } from "./components/Header";
import { TanismaScreen } from "./components/TanismaScreen";
import { NeDegistiScreen } from "./components/NeDegistiScreen";
import { SoruScreen } from "./components/SoruScreen";
import { ProjemScreen } from "./components/ProjemScreen";
import {
  ProjeKarti,
  SoruCevap,
  OturumSonucu,
  BeceriHaritasi,
  Oturum,
  SecilmisSoru,
} from "./types/sePrimer";
import { loadProje, saveProje, clearProje, ORNEK_PROJE } from "./services/storage";
import { konuSec } from "./primer/konuSec";
import { analizEtVeKartOlustur, sorulariUyarla } from "./services/api";
import { onMaskelemeBildirimi } from "./primer/maskele";

type Ekran = "tanisma" | "nedegisti" | "soru" | "projem";

export default function App() {
  const [proje, setProje] = useState<ProjeKarti | null>(null);
  const [ekran, setEkran] = useState<Ekran>("tanisma");
  const [bekleyenDegisiklikler, setBekleyenDegisiklikler] = useState<string[]>([]);
  const [bekleyenNot, setBekleyenNot] = useState<string>("");
  const [aktifSorular, setAktifSorular] = useState<SecilmisSoru[]>([]);
  const [yuklendi, setYuklendi] = useState<boolean>(false);
  const [hazirlaniyor, setHazirlaniyor] = useState<boolean>(false);
  const [hazirlaniyorMesaji, setHazirlaniyorMesaji] = useState<string>("Proje analizi yapılıyor...");
  const [maskelemeBildirimi, setMaskelemeBildirimi] = useState<string | null>(null);

  // Maskeleme bildirim dinleyicisi
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const unsub = onMaskelemeBildirimi((mesaj) => {
      setMaskelemeBildirimi(mesaj);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMaskelemeBildirimi(null);
      }, 5500);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  // Başlangıç kontrolü: Kayıtlı bir proje varsa uygulama "Ne değişti?" ekranıyla açılır, yoksa Tanışma ile.
  useEffect(() => {
    const kayitliProje = loadProje();
    if (kayitliProje) {
      setProje(kayitliProje);
      setEkran("nedegisti");
    } else {
      setEkran("tanisma");
    }
    setYuklendi(true);
  }, []);

  // Tanışma ekranından yeni proje oluşturma (POST /api/kart ve POST /api/soru-uyarla)
  const handleProjeOlustur = async (temelProje: ProjeKarti) => {
    setHazirlaniyor(true);
    setHazirlaniyorMesaji("Proje kartı ve ilk mimari riskler analiz ediliyor...");

    try {
      // 1. POST /api/kart çağrısı (Gemini sunucu tarafı)
      const analiz = await analizEtVeKartOlustur(temelProje);
      const tamProje: ProjeKarti = {
        ...temelProje,
        teknoloji: analiz.teknoloji,
        mimari: analiz.mimari,
        dosyaYapisi: analiz.dosyaYapisi,
        acikRiskler: analiz.acikRiskler,
      };

      // 2. Soru seçimi (hangi konu) KODDA kalır, Gemini'ye bırakılmaz
      const secilenSorular = konuSec(tamProje, ["plan"]);

      setHazirlaniyorMesaji("Sorular projenize özel uyarlanıyor...");

      // 3. POST /api/soru-uyarla çağrısı (Gemini sunucu tarafı)
      const uyarlanmisSorular = await sorulariUyarla(tamProje, secilenSorular);

      setProje(tamProje);
      saveProje(tamProje);
      setAktifSorular(uyarlanmisSorular);
      setBekleyenDegisiklikler(["plan"]);
      setBekleyenNot("İlk seans: Proje başlangıç tanımı.");
      setEkran("soru");
    } catch (error) {
      console.warn("Proje oluşturma akışında hata, yerel verilerle devam ediliyor:", error);
      const secilenSorular = konuSec(temelProje, ["plan"]);
      setProje(temelProje);
      saveProje(temelProje);
      setAktifSorular(secilenSorular);
      setBekleyenDegisiklikler(["plan"]);
      setBekleyenNot("İlk seans: Proje başlangıç tanımı.");
      setEkran("soru");
    } finally {
      setHazirlaniyor(false);
    }
  };

  // "Örnek projeyle dene"
  const handleOrnekProjeYukle = () => {
    setProje(ORNEK_PROJE);
    saveProje(ORNEK_PROJE);
    setEkran("projem");
  };

  // "Ne değişti?" ekranından soru ekranına geçiş (POST /api/soru-uyarla)
  const handleNeDegistiGonder = async (degisiklikler: string[], notMetni: string) => {
    if (!proje) return;

    setHazirlaniyor(true);
    setHazirlaniyorMesaji("Seçilen sorular projenize özel uyarlanıyor...");

    try {
      // 1. Soru seçimi KODDA kalır
      const secilenSorular = konuSec(proje, degisiklikler);

      // 2. POST /api/soru-uyarla çağrısı
      const uyarlanmisSorular = await sorulariUyarla(proje, secilenSorular);

      setAktifSorular(uyarlanmisSorular);
      setBekleyenDegisiklikler(degisiklikler);
      setBekleyenNot(notMetni);
      setEkran("soru");
    } catch (error) {
      console.warn("Soru uyarlama çağrısında hata, bankadaki orijinal sorular kullanılıyor:", error);
      const secilenSorular = konuSec(proje, degisiklikler);
      setAktifSorular(secilenSorular);
      setBekleyenDegisiklikler(degisiklikler);
      setBekleyenNot(notMetni);
      setEkran("soru");
    } finally {
      setHazirlaniyor(false);
    }
  };

  // Soru ekranı tamamlandığında (3 soru sırayla → Projem ekranı)
  const handleOturumTamamla = (
    soruCevaplar: SoruCevap[],
    sonuc: OturumSonucu,
    puanFarki: Partial<BeceriHaritasi>,
    eklenenRiskler: string[],
    kapatilanRiskler: string[],
    genelOturumNotu?: string
  ) => {
    if (!proje) return;

    const simdikiTarih = new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const yeniOturumNo = proje.oturumlar.length + 1;

    // Becerileri güncelle: Puanlar 0-5 arasında kalsın
    const guncelBeceri: BeceriHaritasi = { ...proje.beceri };
    (Object.keys(guncelBeceri) as (keyof BeceriHaritasi)[]).forEach((key) => {
      if (puanFarki[key] !== undefined) {
        guncelBeceri[key] = Math.min(5, Math.max(0, guncelBeceri[key] + (puanFarki[key] || 0)));
      }
    });

    const yeniOturum: Oturum = {
      no: yeniOturumNo,
      tarih: simdikiTarih,
      degisiklikler: bekleyenDegisiklikler.length > 0 ? bekleyenDegisiklikler : ["Rutin kontrol"],
      not: genelOturumNotu || bekleyenNot || "Oturum başarıyla tamamlandı.",
      sorular: soruCevaplar,
      sonuc: sonuc,
      beceriSnapshot: { ...guncelBeceri },
      puanFarki: { ...puanFarki },
      eklenenRiskler: [...eklenenRiskler],
      kapatilanRiskler: [...kapatilanRiskler],
    };

    // Açık riskleri güncelle: Kapatılanları temizle
    let guncelRiskler = proje.acikRiskler.filter(
      (mevcut) =>
        !kapatilanRiskler.some(
          (k) =>
            mevcut.toLowerCase().includes(k.toLowerCase()) ||
            k.toLowerCase().includes(mevcut.toLowerCase())
        )
    );

    // Yeni eklenen riskleri iliştir
    eklenenRiskler.forEach((yeniRisk) => {
      if (!guncelRiskler.includes(yeniRisk)) {
        guncelRiskler.push(yeniRisk);
      }
    });

    const guncelProje: ProjeKarti = {
      ...proje,
      beceri: guncelBeceri,
      acikRiskler: guncelRiskler,
      oturumlar: [...proje.oturumlar, yeniOturum],
    };

    setProje(guncelProje);
    saveProje(guncelProje);
    setBekleyenDegisiklikler([]);
    setBekleyenNot("");
    setAktifSorular([]);

    // Soru ekranı → Projem ekranı
    setEkran("projem");
  };

  // "Yeni oturum" butonu tıklandığında: Projem → "Ne değişti?"
  const handleYeniOturum = () => {
    setEkran("nedegisti");
  };

  // Dışarıdan Proje Yükleme (İçe Aktar)
  const handleProjeYukle = (yuklenenProje: ProjeKarti) => {
    setProje(yuklenenProje);
    saveProje(yuklenenProje);
    setEkran("projem");
  };

  // Proje Aşamasını Güncelleme (ör. "bitti")
  const handleAsamaDegistir = (yeniAsama: any) => {
    if (!proje) return;
    const guncel: ProjeKarti = { ...proje, asama: yeniAsama };
    setProje(guncel);
    saveProje(guncel);
  };

  // Projeyi sıfırlama
  const handleProjeyiSifirla = () => {
    clearProje();
    setProje(null);
    setBekleyenDegisiklikler([]);
    setBekleyenNot("");
    setAktifSorular([]);
    setEkran("tanisma");
  };

  if (!yuklendi) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center font-mono text-xs text-[#515F74]">
        <span>Yükleniyor...</span>
      </div>
    );
  }

  const oturumSayisi = proje ? proje.oturumlar.length + 1 : 1;

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col text-[#0F172A] relative">
      <Header
        proje={proje}
        ekran={ekran}
        onSifirla={proje ? handleProjeyiSifirla : undefined}
        onEkranaGit={(hedef) => setEkran(hedef)}
      />

      <main className="flex-1 pb-10">
        {ekran === "tanisma" && (
          <TanismaScreen
            onProjeOlustur={handleProjeOlustur}
            onOrnekProjeYukle={handleOrnekProjeYukle}
            onProjeYukle={handleProjeYukle}
          />
        )}

        {ekran === "nedegisti" && proje && (
          <NeDegistiScreen
            proje={proje}
            onOturumuBaslat={handleNeDegistiGonder}
            onProjemEkraninaGit={() => setEkran("projem")}
          />
        )}

        {ekran === "soru" && aktifSorular.length > 0 && proje && (
          <SoruScreen
            kart={proje}
            sorular={aktifSorular}
            oturumNo={oturumSayisi}
            mevcutAcikRiskSayisi={proje.acikRiskler.length}
            onOturumTamamla={handleOturumTamamla}
          />
        )}

        {ekran === "projem" && proje && (
          <ProjemScreen
            proje={proje}
            onYeniOturum={handleYeniOturum}
            onProjeyiSifirla={handleProjeyiSifirla}
            onProjeYukle={handleProjeYukle}
            onAsamaDegistir={handleAsamaDegistir}
          />
        )}
      </main>

      {/* Hazırlanıyor / Uyarlanıyor Yükleme Göstergesi */}
      {hazirlaniyor && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#0F172A] rounded p-5 max-w-xs w-full shadow-2xl text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded bg-[#0F172A] flex items-center justify-center text-[#FFFFFF] shadow-sm animate-pulse">
              <Terminal className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                SE PRIMER // YAPAY ZEKÂ
              </h3>
              <p className="text-xs text-[#515F74] mt-1 leading-snug">
                {hazirlaniyorMesaji}
              </p>
            </div>
            <div className="w-full bg-[#E2E8F0] h-1.5 rounded overflow-hidden">
              <div className="bg-[#0F172A] h-full w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Maskeleme Güvenlik Bildirimi */}
      {maskelemeBildirimi && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-fadeIn">
          <div className="p-3 bg-[#0F172A] text-white text-xs font-mono rounded-md shadow-2xl border border-[#D97706] flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#FDE047] shrink-0" />
              <span className="leading-snug">{maskelemeBildirimi}</span>
            </div>
            <button
              type="button"
              onClick={() => setMaskelemeBildirimi(null)}
              className="text-white/60 hover:text-white p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
