// SE Primer · Diferansiyel (parite) test
// Test kahini (oracle): Python + onnxruntime → tests/parite.json (tests/parite.py üretir).
// Test edilen: tarayıcı, uygulamanın kendi çıkarım yolu (?parite=1 → src/primer/model.ts, onnxruntime-web).
// Model, diğer testlerdeki gibi fixtures/model.onnx'ten gelir; parite.py bu dosyanın sha256'sının Hugging Face'teki
// sabit commit ve model/model.onnx ile aynı olduğunu doğrular.

describe('SE Primer · Diferansiyel test (Python ↔ tarayıcı)', () => {
  it('5 referans girdide |p_uygulama - p_python| < tolerans ve 0.5 eşiğindeki karar aynı', () => {
    cy.readFile('../tests/parite.json').then((parite) => {
      const girdiler = parite.girdiler
      expect(girdiler, 'referans girdi sayısı').to.have.length(5)

      cy.visit('/?parite=1')
      cy.wait('@modelOnnx')
      cy.get('[data-cy="parite-hata"]').should('not.exist')
      cy.get('[data-cy="parite-hazir"]', { timeout: 20000 }).should('be.visible')

      const satirlar = []
      girdiler.forEach((g, i) => {
        cy.get(`[data-cy="p-${i}"]`).invoke('text').then((metin) => {
          const pUygulama = parseFloat(metin)
          const fark = Math.abs(pUygulama - g.p)
          satirlar.push({ i, ad: g.ad, pPython: g.p, pUygulama: metin, fark })
          expect(fark, `${g.ad}: |p_uygulama - p_python|`).to.be.lessThan(parite.tolerans)
          expect(metin, `${g.ad}: 8 ondalık`).to.match(/^\d\.\d{8}$/)
        })
        cy.get(`[data-cy="karar-${i}"]`).should('have.text', g.karar)
      })

      cy.then(() => {
        const maks = Math.max(...satirlar.map((s) => s.fark))
        const tablo = satirlar
          .map((s) => `  ${s.i} ${s.ad.padEnd(13)} python=${s.pPython.toFixed(10)} tarayıcı=${s.pUygulama} |fark|=${s.fark.toExponential(2)}`)
          .join('\n')
        cy.task('log', `PARİTE (model ${parite.model.surum} ${parite.model.commit.slice(0, 12)}, tolerans ${parite.tolerans})\n${tablo}\n  maks |fark| = ${maks.toExponential(2)}`)
      })
    })
  })
})
