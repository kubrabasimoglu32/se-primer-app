// SE Primer · uçtan uca testler
const SECENEK = '[data-cy^="secenek-"]'

function basla() {
  cy.visit('/')
  cy.get('[data-cy="ornek-proje"]').click()
  cy.get('body').then(($b) => {
    if ($b.find('[data-cy="yeni-oturum"]').length) cy.get('[data-cy="yeni-oturum"]').click()
  })
  cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible')
}

function sorulariGetir() { cy.get('[data-cy="ne-degisti-gonder"]').click() }

function sec(tercih) {
  cy.get(SECENEK).should('have.length.at.least', 2).then(($s) => {
    const sira = tercih === 'iyi' ? ['dusuk'] : ['yuksek', 'orta']
    for (const r of sira) {
      const h = $s.filter('[data-risk="' + r + '"]')
      if (h.length) { cy.wrap(h.first()).click(); return }
    }
    throw new Error('Uygun data-risk bulunamadı')
  })
}

function cevapla(tercih, sonSoru) {
  sec(tercih)
  cy.get(sonSoru ? '[data-cy="sonuc"]' : '[data-cy="devam"]').should('not.be.disabled').click()
}

function oturumuTamamla(t) { cevapla(t, false); cevapla(t, false); cevapla(t, true) }

function acikRiskleriBul(o) {
  if (!o || typeof o !== 'object') return null
  if (Array.isArray(o.acikRiskler)) return o.acikRiskler
  for (const k of Object.keys(o)) { const r = acikRiskleriBul(o[k]); if (r) return r }
  return null
}

describe('SE Primer', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/**', { statusCode: 500, body: { hata: 'test' } })
    cy.clearLocalStorage()
  })

  it('1) Hep düşük riskli seçim -> yeni risk eklenmez', () => {
    basla(); sorulariGetir(); oturumuTamamla('iyi')
    cy.get('[data-cy="yeni-oturum"]').should('be.visible')
    cy.window().then((w) => {
      const r = acikRiskleriBul(JSON.parse(w.localStorage.getItem('sePrimer.v1')))
      expect(r, 'acikRiskler listesi bulundu').to.be.an('array')
      expect(r.length, 'açık risk sayısı').to.be.at.most(3)
    })
  })

  it('2) Riskli seçimler -> Riskler Var', () => {
    basla(); sorulariGetir(); oturumuTamamla('kotu')
    cy.contains('İncelenmesi Gereken Mimari Riskler Var', { matchCase: false }).should('be.visible')
  })

  it('3) Seçim yapılmadan Devam pasif, seçince aktif', () => {
    basla(); sorulariGetir()
    cy.get('[data-cy="devam"]').should('be.disabled')
    cy.get(SECENEK).first().click()
    cy.get('[data-cy="devam"]').should('not.be.disabled')
  })

  it('4) Veri tabanı değişikliği -> V-01 sorulur', () => {
    basla()
    cy.get('body').then(($b) => {
      if (/\(\s*0\s*se/i.test($b.text())) cy.contains('Veri tabanı yapısı değiştirildi', { matchCase: false }).click()
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
    basla(); sorulariGetir(); oturumuTamamla('iyi')
    cy.get('[data-cy="yeni-oturum"]').click()
    cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible')
  })

  it('6) Proje sayfa yenilenince kaybolmaz, tanışma tekrar gelmez', () => {
    basla(); sorulariGetir(); oturumuTamamla('iyi')
    cy.reload()
    cy.get('[data-cy="tanisma-gonder"]').should('not.exist')
    cy.window().then((w) => expect(w.localStorage.getItem('sePrimer.v1')).to.not.be.null)
  })

  it('7) Seçimden önce risk ve puan bilgisi görünmez, seçimden sonra görünür', () => {
    basla(); sorulariGetir()
    const ipucuVar = ($b) => /düşük risk|orta risk|yüksek risk|hazır \(\+1\)|riskli \(0\)/.test($b.text().toLocaleLowerCase('tr'))
    cy.get('body').should(($b) => expect(ipucuVar($b), 'seçimden önce ipucu').to.be.false)
    cy.get(SECENEK).first().click()
    cy.get('body').should(($b) => expect(ipucuVar($b), 'seçimden sonra risk etiketi').to.be.true)
  })
})
