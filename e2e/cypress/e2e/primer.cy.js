// SE Primer · uçtan uca testler

function basla() {
  cy.visit('/')
  cy.get('[data-cy="ornek-proje"]').click()
  cy.get('body').then(($b) => {
    if ($b.find('[data-cy="yeni-oturum"]').length) {
      cy.get('[data-cy="yeni-oturum"]').click()
    }
  })
  cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible')
}

function sorulariGetir() {
  cy.get('[data-cy="ne-degisti-gonder"]').click()
}

function cevapla(tercih, sonSoru) {
  cy.get(tercih === 'iyi' ? '[data-cy="secenek-A"]' : '[data-cy="secenek-B"]').first().click()
  cy.get(sonSoru ? '[data-cy="sonuc"]' : '[data-cy="devam"]')
    .should('not.be.disabled')
    .click()
}

function oturumuTamamla(tercih) {
  cevapla(tercih, false)
  cevapla(tercih, false)
  cevapla(tercih, true)
}

// Kayıtlı veride "acikRiskler" listesini bulur (nerede saklandığından bağımsız)
function acikRiskleriBul(obj) {
  if (!obj || typeof obj !== 'object') return null
  if (Array.isArray(obj.acikRiskler)) return obj.acikRiskler
  for (const k of Object.keys(obj)) {
    const r = acikRiskleriBul(obj[k])
    if (r) return r
  }
  return null
}

describe('SE Primer', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/**', { statusCode: 500, body: { hata: 'test' } }).as('ai')
    cy.clearLocalStorage()
  })

  it('1) Hep düşük riskli seçim -> yeni risk eklenmez', () => {
    basla()
    sorulariGetir()
    oturumuTamamla('iyi')
    cy.get('[data-cy="yeni-oturum"]').should('be.visible') // Projem ekranına gelindi
    cy.window().then((w) => {
      const veri = JSON.parse(w.localStorage.getItem('sePrimer.v1'))
      const riskler = acikRiskleriBul(veri)
      expect(riskler, 'acikRiskler listesi bulundu').to.be.an('array')
      expect(riskler.length, 'açık risk sayısı').to.be.at.most(3)
    })
  })

  it('2) Hep yüksek riskli seçim -> Riskler Var', () => {
    basla()
    sorulariGetir()
    oturumuTamamla('kotu')
    cy.contains('İncelenmesi Gereken Mimari Riskler Var', { matchCase: false }).should('be.visible')
  })

  it('3) Seçim yapılmadan Devam pasif, seçince aktif', () => {
    basla()
    sorulariGetir()
    cy.get('[data-cy="devam"]').should('be.disabled')
    cy.get('[data-cy="secenek-A"]').first().click()
    cy.get('[data-cy="devam"]').should('not.be.disabled')
  })

  it('4) Veri tabanı değişikliği -> V-01 sorulur', () => {
    basla()
    cy.get('body').then(($b) => {
      if (/\(\s*0\s*se/i.test($b.text())) {
        cy.contains('Veri tabanı yapısı değiştirildi', { matchCase: false }).click()
      }
    })
    sorulariGetir()
    let bulundu = false
    const bak = () => cy.get('body').then(($b) => {
      if ($b.text().toLocaleLowerCase('tr').includes('mevcut kayıtlar ne olacak')) bulundu = true
    })
    bak(); cevapla('iyi', false)
    bak(); cevapla('iyi', false)
    bak().then(() => expect(bulundu, 'V-01 soruldu').to.be.true)
  })

  it('5) Oturumdan sonra yeni oturum "Ne değişti?" ile başlar', () => {
    basla()
    sorulariGetir()
    oturumuTamamla('iyi')
    cy.get('[data-cy="yeni-oturum"]').click()
    cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible')
  })

  it('6) Proje sayfa yenilenince kaybolmaz, tanışma tekrar gelmez', () => {
    basla()
    sorulariGetir()
    oturumuTamamla('iyi')
    cy.reload()
    cy.get('[data-cy="tanisma-gonder"]').should('not.exist')
    cy.window().then((w) => {
      expect(w.localStorage.getItem('sePrimer.v1'), 'kayıtlı proje').to.not.be.null
    })
  })
})
