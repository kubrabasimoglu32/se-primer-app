// SE Primer · 60 saniyelik demo (altyazılı)
const bekle = (ms) => cy.wait(ms)
const DUSUK = '[data-cy^="secenek-"][data-risk="dusuk"]'
const RISKLI = '[data-cy^="secenek-"][data-risk="yuksek"], [data-cy^="secenek-"][data-risk="orta"]'

function altyazi(metin) {
  cy.document().then((doc) => {
    let el = doc.getElementById('demo-altyazi')
    if (!el) {
      el = doc.createElement('div'); el.id = 'demo-altyazi'
      Object.assign(el.style, { position: 'fixed', left: '8px', right: '8px', bottom: '10px', zIndex: 99999,
        background: 'rgba(17,24,39,.92)', color: '#fff', padding: '10px 12px',
        font: '600 15px/1.4 system-ui, sans-serif', borderRadius: '10px', textAlign: 'center', pointerEvents: 'none' })
      doc.body.appendChild(el)
    }
    el.textContent = metin
  })
}

describe('SE Primer · Demo', () => {
  it('Bir öğrencinin haftalık oturumu', () => {
    cy.intercept('POST', '/api/**', { statusCode: 500, body: {} })
    cy.clearLocalStorage()
    cy.visit('/')
    altyazi('SE Primer: projeni tanıyan ve proje büyüdükçe sana soru soran öğrenme asistanı'); bekle(4000)
    altyazi('Örnek proje: Kampüs Etkinlik (React + Firebase, kodlama aşaması)'); bekle(2000)
    cy.get('[data-cy="ornek-proje"]').click()
    cy.get('body').then(($b) => { if ($b.find('[data-cy="yeni-oturum"]').length) cy.get('[data-cy="yeni-oturum"]').click() })
    altyazi('Her girişte Primer sorar: Bu hafta projende ne değişti?'); bekle(3000)
    cy.get('body').then(($b) => { if (/\(\s*0\s*se/i.test($b.text())) cy.contains('Veri tabanı yapısı değiştirildi', { matchCase: false }).click() })
    altyazi('Veri tabanını değiştirdiğini işaretledin. Sorular buna göre seçilecek.'); bekle(3500)
    cy.get('[data-cy="ne-degisti-gonder"]').click()
    altyazi('Soru 1 — Primer cevabı söylemez. Seçmeden önce hangisinin riskli olduğu görünmez.'); bekle(4500)
    cy.get(DUSUK).first().click()
    altyazi('Seçince ne olacağı, nedeni ve risk derecesi gösterilir.'); bekle(4000)
    cy.get('[data-cy="soru-cevap-girdi"]').type('Önce kopyada denersem asıl veri bozulmaz.', { delay: 35 }); bekle(1500)
    cy.get('[data-cy="devam"]').click()
    altyazi('Soru 2 — Bu kez riskli bir seçenek seçelim.'); bekle(3500)
    cy.get(RISKLI).first().click()
    altyazi('Riskli seçim: sonucu açıklanır ve risk projenin kaydına eklenir.'); bekle(4500)
    cy.get('[data-cy="devam"]').click()
    altyazi('Soru 3'); bekle(2500)
    cy.get(DUSUK).first().click(); bekle(3000)
    cy.get('[data-cy="sonuc"]').click()
    altyazi('Projem: oturum sonucu, açık riskler, beceri haritası ve karar kaydı'); bekle(4500)
    cy.scrollTo('bottom', { duration: 2500, ensureScrollable: false }); bekle(2000)
    altyazi('Primer projeyi hatırlar: bir dahaki girişte yine "Ne değişti?" diye sorar.'); bekle(2000)
    cy.reload()
    altyazi('Primer projeyi hatırlar: bir dahaki girişte yine "Ne değişti?" diye sorar.'); bekle(4000)
  })
})
