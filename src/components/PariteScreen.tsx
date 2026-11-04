/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Diferansiyel (parite) test sayfası: ?parite=1
 *
 * tests/parite.json'daki 5 referans girdiyi uygulamanın KENDİ çıkarım yoluyla çalıştırır:
 * src/primer/model.ts → modeliYukle() (modelKaynak.ts'teki commit'e sabit URL) → model.tahminEt() (onnxruntime-web).
 * Ayrı bir model kopyası ya da ayrı bir çıkarım kodu yoktur; uygulamada soru seçerken kullanılan fonksiyonlar bunlar.
 * Python tarafı (test kahini): tests/parite.py. Karşılaştırma: e2e/cypress/e2e/parite.cy.js.
 */

import React, { useEffect, useState } from "react";
import parite from "../../tests/parite.json";
import { modeliYukle } from "../primer/model";
import { MODEL_COMMIT, MODEL_SURUM } from "../primer/modelKaynak";
import { OZELLIK_SIRASI, OzellikVektoru } from "../primer/veriToplama";

interface PariteGirdisi {
  ad: string;
  aciklama: string;
  girdi: Record<string, number>;
  p: number;
  karar: "zor" | "kolay";
}

const GIRDILER = parite.girdiler as PariteGirdisi[];

function vektor(g: Record<string, number>): OzellikVektoru {
  const v = {} as OzellikVektoru;
  OZELLIK_SIRASI.forEach((ad) => (v[ad] = g[ad]));
  return v;
}

export const PariteScreen: React.FC = () => {
  const [sonuc, setSonuc] = useState<{ p: number[]; esik: number } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const model = await modeliYukle();
      if (!model) {
        if (!iptal) setHata("Model yüklenemedi (ayrıntı konsolda).");
        return;
      }
      const p = await model.tahminEt(GIRDILER.map((g) => vektor(g.girdi)));
      if (!iptal) setSonuc({ p, esik: model.esik });
    })().catch((e) => {
      console.warn("Parite sayfası:", e);
      if (!iptal) setHata("Çıkarım çalıştırılamadı (ayrıntı konsolda).");
    });
    return () => {
      iptal = true;
    };
  }, []);

  const farklar = sonuc ? GIRDILER.map((g, i) => Math.abs(sonuc.p[i] - g.p)) : [];
  const maksFark = farklar.length ? Math.max(...farklar) : undefined;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4 font-mono text-xs text-[#0F172A]">
      <div className="border-b border-[#E2E8F0] pb-3">
        <h1 className="text-base font-bold">Diferansiyel test (parite)</h1>
        <p className="text-[#515F74] mt-1 leading-relaxed">
          Test kahini: Python (onnxruntime {parite.kahin.surum}). Test edilen: bu tarayıcı (onnxruntime-web,
          uygulamanın model.ts kodu). Model {MODEL_SURUM} · {MODEL_COMMIT.slice(0, 12)} · tolerans {parite.tolerans}
        </p>
        {parite.model.commit !== MODEL_COMMIT && (
          <p data-cy="parite-commit-uyari" className="mt-1 text-[#DC2626]">
            Uyarı: parite.json başka bir commit için üretilmiş ({parite.model.commit.slice(0, 12)}).
          </p>
        )}
      </div>

      {hata && (
        <div data-cy="parite-hata" className="p-2 border border-[#FCA5A5] bg-[#FEF2F2] rounded text-[#DC2626]">
          {hata}
        </div>
      )}
      {!sonuc && !hata && <div data-cy="parite-bekliyor">Model yükleniyor…</div>}

      <div className="space-y-2">
        {GIRDILER.map((g, i) => (
          <div key={g.ad} className="p-2 border border-[#CBD5E1] rounded bg-white space-y-0.5">
            <div className="font-bold">
              {i}. {g.ad}
            </div>
            <div className="text-[#515F74]">[{OZELLIK_SIRASI.map((ad) => g.girdi[ad]).join(", ")}]</div>
            <div>
              Python: <span data-cy={`py-${i}`}>{g.p.toFixed(8)}</span> ({g.karar})
            </div>
            <div>
              Tarayıcı: <span data-cy={`p-${i}`}>{sonuc ? sonuc.p[i].toFixed(8) : "…"}</span>{" "}
              (<span data-cy={`karar-${i}`}>{sonuc ? (sonuc.p[i] >= sonuc.esik ? "zor" : "kolay") : "…"}</span>)
            </div>
            {sonuc && <div className="text-[#515F74]">|fark| = {farklar[i].toExponential(2)}</div>}
          </div>
        ))}
      </div>

      {sonuc && (
        <div data-cy="parite-hazir" className="p-2 border border-[#86EFAC] bg-[#F0FDF4] rounded">
          Maks |fark| = <span data-cy="parite-maks-fark">{maksFark!.toExponential(2)}</span>
        </div>
      )}
    </div>
  );
};
