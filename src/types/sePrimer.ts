/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Asama = "fikir" | "tasarim" | "kodlama" | "test" | "teslim" | "bitti";

export type Konu =
  | "kapsam"
  | "mimari"
  | "veriTabani"
  | "dosyaDuzeni"
  | "test"
  | "guvenlik"
  | "dagitim"
  | "rapor";

export interface Teknoloji {
  onYuz: string;
  arkaUc: string;
  veriTabani: string;
}

export interface BeceriHaritasi {
  kapsam: number;     // 0-5
  mimari: number;     // 0-5
  veriTabani: number; // 0-5
  dosyaDuzeni: number;// 0-5
  test: number;       // 0-5
  guvenlik: number;   // 0-5
  dagitim: number;    // 0-5
  rapor: number;      // 0-5
}

export type SoruTuru = "karar" | "kontrol";

export type OturumSonucu = "saglikli" | "risk";

export interface SoruCevap {
  soruId: string;
  konu: Konu | string;
  tur: SoruTuru;
  metin: string;
  cevap: string;
  risk?: string;
  tutorYaniti?: string;
  secilenSecenekId?: "A" | "B" | "C";
  riskDerecesi?: "dusuk" | "orta" | "yuksek";
  secimNedeni?: string;
  kullaniciGerekcesi?: string;
  sokratikCevap?: string;
  kararNotu?: string;
  degerlendirme?: "yeterli" | "kismen" | "eksik";
  primerSorusu?: string;
  primerYaniti?: string;
}

export interface Oturum {
  no: number;
  tarih: string;
  degisiklikler: string[];
  not?: string;
  sorular: SoruCevap[];
  sonuc: OturumSonucu;
  beceriSnapshot?: BeceriHaritasi;
  puanFarki?: Partial<BeceriHaritasi>;
  eklenenRiskler?: string[];
  kapatilanRiskler?: string[];
}

export interface ProjeKarti {
  ad: string;
  aciklama: string;
  asama: Asama;
  seviye: string;
  rol: string;
  hedef: string;
  teknoloji: Teknoloji;
  mimari: string;
  kisiselVeri: string;
  dosyaYapisi?: string;
  beceri: BeceriHaritasi;
  acikRiskler: string[];
  oturumlar: Oturum[];
  ogrenmekIstedigiKonu?: Konu;
  bilmedigiKonu?: Konu;
}

export interface BankSoruSecenek {
  id: "A" | "B" | "C";
  metin: string;
  risk: "dusuk" | "orta" | "yuksek";
  sonuc: string;
  neden: string;
}

export interface BankSoruTetik {
  asama?: string[];
  degisiklik?: string[];
  mimari?: string[];
  veriTabani?: string[];
  dosyaYapisiVar?: boolean;
  test?: string[];
  kisiselVeri?: (boolean | string)[];
  her?: boolean;
}

export interface BankSoru {
  id: string;
  konu: Konu;
  tur: SoruTuru;
  tetik: BankSoruTetik;
  metin: string;
  secenekler?: BankSoruSecenek[] | string[];
  beklenen?: string;
  evetSonuc?: string;
  hayirRisk?: string;
  metinFirebase?: string;
  metinSql?: string;
  gerekceAlani?: boolean;
  notAlani?: string;
  ipucu?: string;
}

export interface SecilmisSoru extends BankSoru {
  secimNedeni: string;
  oncekiSecimNotu?: string;
  ipucu?: string;
}
