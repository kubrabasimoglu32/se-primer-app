// SE Primer · Zorluk modeli (spec §10.7 kabul örnekleri 8, 9, 10)
// Model Hugging Face'ten değil, support/e2e.js'deki intercept ile fixtures/model.onnx ve config.json'dan gelir.
// /api/** istekleri diğer testlerdeki gibi 500 döner (yapay zekâ yok, soru bankası).
const SECENEK = '[data-cy^="secenek-"]'

/**
 * fixtures/kart-zor.json: seviye "Deneyimliyim", aşama "tasarim", mimari ve veri tabanı becerisi 5, bir önceki oturum
 * (son cevap: 20 sn, 100 karakter gerekçe). 1. soru konusu "mimari" için girdiler [2, 5, 0, 0, 20, 100, 2].
 * Python'da model/model.onnx ile p = 0.9455 (>= 0.5) → zor soru.
 */
const BEKLENEN_P = '0.9455'

function kartlaAc() {
  cy.fixture('kart-zor.json').then((kart) => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('sePrimer.v1', JSON.stringify(kart))
      },
    })
  })
  cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible')
}

function sec(risk) {
  cy.get(SECENEK).should('have.length.at.least', 2).then(($s) => {
    const h = $s.filter(`[data-risk="${risk}"]`)
    cy.wrap(h.length ? h.first() : $s.first()).click()
  })
}

describe('SE Primer · Zorluk modeli', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/**', { statusCode: 500, body: { hata: 'test' } })
    cy.clearLocalStorage()
  })

  it('8) p >= 0.5 → 1. soru zor gelir, "Primer seni zorluyor" ve cevaptan sonra derinleş sorusu görünür', () => {
    kartlaAc()
    cy.wait('@modelOnnx')
    cy.get('[data-cy="ne-degisti-gonder"]').click()

    cy.get('[data-cy="p"]').should('have.text', BEKLENEN_P)
    cy.get('[data-cy="p"]').invoke('text').then((t) => expect(parseFloat(t)).to.be.at.least(0.5))
    cy.get('[data-cy="zorluk"]').should('have.text', 'zor')
    cy.get('[data-cy="model-notu"]').should('contain.text', 'Primer seni zorluyor')

    // Seçimden önce derinleş sorusu ve risk/puan etiketi yok
    cy.get('[data-cy="derinles"]').should('not.exist')
    cy.get('body').should(($b) =>
      expect(/düşük risk|orta risk|yüksek risk|hazır \(\+1\)|riskli \(0\)/.test($b.text().toLocaleLowerCase('tr'))).to.be.false
    )

    sec('dusuk')
    cy.get('[data-cy="derinles"]').should('be.visible').invoke('text').should('have.length.greaterThan', 15)
  })

  it('9) Model yüklüyken "Veri tabanı yapısı değiştirildi" → 3 sorudan biri yine V-01 ve not görünür', () => {
    kartlaAc()
    cy.wait('@modelOnnx')
    // Ekran "Veri tabanı yapısı değiştirildi"yi varsayılan olarak işaretli açar; yalnız o işaretli olmalı.
    cy.get('body').then(($b) => {
      if (/\(\s*0\s*se/i.test($b.text())) cy.contains('Veri tabanı yapısı değiştirildi', { matchCase: false }).click()
    })
    cy.contains(/\(\s*1\s*seçildi\)/).should('exist')
    cy.get('[data-cy="ne-degisti-gonder"]').click()

    // Model devrede: 1. soruda model notu var
    cy.get('[data-cy="p"]').should('exist')
    sec('dusuk')
    cy.get('[data-cy="devam"]').should('not.be.disabled').click()

    // 2. soru (değişiklik tetikli) modelden etkilenmez: V-01
    cy.contains('V-01').should('be.visible')
    cy.get('[data-cy="degisiklik-notu"]').should('have.text', 'Veri tabanı yapını değiştirdiğini söyledin.')
    cy.get('[data-cy="p"]').should('not.exist')
  })

  it('10) model.onnx 404 dönerse eski kural çalışır, hata gösterilmez', () => {
    cy.intercept('GET', 'https://huggingface.co/**/model.onnx', { statusCode: 404, body: 'Not Found' }).as('model404')
    kartlaAc()
    cy.wait('@model404')
    cy.get('[data-cy="ne-degisti-gonder"]').click()

    cy.get(SECENEK).should('have.length.at.least', 2)
    cy.get('[data-cy="model-notu"]').should('not.exist')
    cy.get('[data-cy="p"]').should('not.exist')
    cy.get('body').should(($b) => {
      const metin = $b.text().toLocaleLowerCase('tr')
      expect(metin).not.to.include('zorluk modeli')
      expect(metin).not.to.include('yüklenemedi')
      expect(metin).not.to.include('http 404')
      expect(metin).not.to.include('primer seni zorluyor')
      expect(metin).not.to.include('primer temelden alıyor')
    })

    // Oturum eski kuralla sonuna kadar tamamlanır
    sec('dusuk'); cy.get('[data-cy="devam"]').should('not.be.disabled').click()
    sec('dusuk'); cy.get('[data-cy="devam"]').should('not.be.disabled').click()
    sec('dusuk'); cy.get('[data-cy="sonuc"]').should('not.be.disabled').click()
    cy.get('[data-cy="yeni-oturum"]').should('be.visible')
  })
})
