// SE Primer · Veri Toplama Modu (?veri=1) uçtan uca testleri — spec.md §10.4
// Satırlar localStorage'daki sePrimer.veri.v1'den okunur. /api/** istekleri primer.cy.js'deki gibi 500 döner.
const SECENEK = '[data-cy^="secenek-"]'
const VERI_ANAHTARI = 'sePrimer.veri.v1'
const PROJE_ANAHTARI = 'sePrimer.v1'

/** Veri modunda açar. Math.random sabitlenir: yazı-tura ve seçenek karıştırma her koşuda aynı olur. */
function veriModundaAc() {
  cy.visit('/?veri=1', {
    onBeforeLoad(win) { cy.stub(win.Math, 'random').returns(0.1) },
  })
  cy.get('[data-cy="veri-modu-bandi"]').should('be.visible')
}

/** Tanışma formunu doldurur; ilk oturumun soruları doğrudan açılır. */
function yeniProje(deneyimli) {
  veriModundaAc()
  cy.get('input[placeholder^="ör. Kampüs Etkinlik"]').type('Test Projesi')
  cy.get('textarea[placeholder^="Uygulama ne işe yarıyor"]')
    .type('Cypress ile veri modu testi')
  cy.get(deneyimli ? '[data-cy="seviye-deneyimli"]' : '[data-cy="seviye-yeni"]').click()
  cy.get('[data-cy="tanisma-gonder"]').click()
  cy.get(SECENEK).should('have.length.at.least', 2)
}

/** 'iyi' = düşük risk; 'kotu' = önce yüksek, yoksa orta risk. */
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

function oturumuTamamla(t) {
  cevapla(t, false); cevapla(t, false); cevapla(t, true)
  cy.get('[data-cy="yeni-oturum"]').should('be.visible')
}

/** Projem → "Ne değişti?" → sorular. */
function yeniOturumBaslat() {
  cy.get('[data-cy="yeni-oturum"]').click()
  cy.get('[data-cy="ne-degisti-gonder"]').should('be.visible').click()
  cy.get(SECENEK).should('have.length.at.least', 2)
}

function satirlar() {
  return cy.window().then((w) => JSON.parse(w.localStorage.getItem(VERI_ANAHTARI) || '[]'))
}

/** Satırları oturum sırasına göre gruplar (oturum_no artan). */
function oturumlaraBol(rows) {
  const harita = new Map()
  rows.forEach((r) => {
    if (!harita.has(r.oturum_id)) harita.set(r.oturum_id, [])
    harita.get(r.oturum_id).push(r)
  })
  return [...harita.values()].sort((a, b) => a[0].oturum_no - b[0].oturum_no)
}

describe('SE Primer · Veri Toplama Modu', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/**', { statusCode: 500, body: { hata: 'test' } })
    cy.clearLocalStorage()
  })

  it('1) Tanışmada "Deneyimliyim" -> veri satırlarında seviye = 2', () => {
    yeniProje(true)
    oturumuTamamla('iyi')
    satirlar().then((rows) => {
      expect(rows, 'satır sayısı').to.have.length(3)
      rows.forEach((r) => expect(r.seviye, `${r.soru_id} seviye`).to.eq(2))
    })
  })

  it('2) Riskli seçimler: basari = 0, aynı konuda önceki riskli sayısı artar, beceri puanı düşer', () => {
    yeniProje(false)
    oturumuTamamla('kotu')
    yeniOturumBaslat(); oturumuTamamla('kotu')
    yeniOturumBaslat(); oturumuTamamla('kotu')
    yeniOturumBaslat(); oturumuTamamla('kotu')

    // Soru türü (karar / kontrol) bankadan okunur: puan kuralı türe göre farklıdır.
    cy.readFile('../src/data/soruBankasi.json').then((banka) => {
      const tur = Object.fromEntries(banka.sorular.map((s) => [s.id, s.tur]))

      satirlar().then((rows) => {
        const oturumlar = oturumlaraBol(rows)
        expect(oturumlar, 'oturum sayısı').to.have.length(4)
        expect(rows, 'satır sayısı').to.have.length(12)

        // Hep riskli seçildi -> her satırda basari = 0
        rows.forEach((r) => expect(r.basari, `${r.soru_id} (oturum ${r.oturum_no}) basari`).to.eq(0))

        // 1. oturumdaki her konunun ilk satırı: o anki puan ve soru türü
        const ilk = {}
        oturumlar[0].forEach((r) => { if (!(r.konu in ilk)) ilk[r.konu] = r })

        const tekrarlar = oturumlar.slice(1).flat().filter((r) => r.konu in ilk)
        cy.log(`1. oturum konuları: ${Object.keys(ilk).join(', ')}; sonraki oturumlarda tekrar: ${tekrarlar.length}`)
        expect(tekrarlar.length, '1. oturumdaki bir konu sonraki oturumlarda geldi').to.be.at.least(1)

        // Puan düşüşü yalnız şu durumda beklenir (uygulamanın puan kuralı):
        //  - 1. oturumdaki soru bir KARAR sorusuydu (riskli seçim -1; kontrolde "Hayır"/"Emin değilim" 0 verir),
        //  - ve puan 0'ın üstündeydi (beceri 0-5 arasına sıkıştırılır, 0'dan aşağı inmez).
        // Diğer durumlarda puan en azından artmamalıdır.
        let dusmesiGereken = 0
        tekrarlar.forEach((r) => {
          const etiket = `${r.konu} (oturum ${r.oturum_no})`
          const ilkSatir = ilk[r.konu]
          expect(r.konudaki_onceki_riskli_sayisi, `${etiket} önceki riskli`).to.be.at.least(1)
          if (tur[ilkSatir.soru_id] === 'karar' && ilkSatir.konu_beceri_puani > 0) {
            dusmesiGereken++
            expect(r.konu_beceri_puani, `${etiket} beceri puanı düştü`).to.be.lessThan(ilkSatir.konu_beceri_puani)
          } else {
            expect(r.konu_beceri_puani, `${etiket} beceri puanı artmadı`).to.be.at.most(ilkSatir.konu_beceri_puani)
          }
        })
        expect(dusmesiGereken, 'puanı düşmesi gereken en az bir tekrar var').to.be.at.least(1)
      })
    })
  })

  it('3) proje_id bütün satırlarda dolu ve aynı, oturum_id her oturumda farklı', () => {
    yeniProje(false)
    oturumuTamamla('iyi')
    yeniOturumBaslat(); oturumuTamamla('kotu')
    yeniOturumBaslat(); oturumuTamamla('iyi')

    satirlar().then((rows) => {
      expect(rows, 'satır sayısı').to.have.length(9)
      const projeIdler = new Set(rows.map((r) => r.proje_id))
      expect(projeIdler.size, 'farklı proje_id sayısı').to.eq(1)
      const [projeId] = projeIdler
      expect(projeId, 'proje_id dolu').to.be.a('string').and.not.be.empty

      const oturumlar = oturumlaraBol(rows)
      expect(oturumlar, 'oturum sayısı').to.have.length(3)
      oturumlar.forEach((o) => {
        expect(o, 'oturum başına satır').to.have.length(3)
        expect(o[0].oturum_id, 'oturum_id dolu').to.be.a('string').and.not.be.empty
      })
      expect(new Set(rows.map((r) => r.oturum_id)).size, 'farklı oturum_id sayısı').to.eq(3)

      // Kart da aynı proje kimliğini taşır
      cy.window().then((w) => {
        expect(JSON.parse(w.localStorage.getItem(PROJE_ANAHTARI)).projeId, 'karttaki projeId').to.eq(projeId)
      })
    })
  })

  it('4) "Toplanan veriyi sil" yalnız veri satırlarını siler, proje kartı kalır', () => {
    yeniProje(false)
    oturumuTamamla('iyi')
    cy.get('[data-cy="veri-satir-sayisi"]').should('have.text', '3')

    let kartOnce
    cy.window().then((w) => {
      kartOnce = w.localStorage.getItem(PROJE_ANAHTARI)
      expect(kartOnce, 'proje kartı var').to.not.be.null
      cy.stub(w, 'confirm').returns(true).as('onay')
    })

    cy.get('[data-cy="veri-sil"]').click()
    cy.get('@onay').should('have.been.calledOnce')
    cy.get('[data-cy="veri-satir-sayisi"]').should('have.text', '0')

    cy.window().then((w) => {
      expect(w.localStorage.getItem(VERI_ANAHTARI), 'veri satırları silindi').to.be.null
      const kartSonra = w.localStorage.getItem(PROJE_ANAHTARI)
      expect(kartSonra, 'proje kartı değişmedi').to.eq(kartOnce)
      expect(JSON.parse(kartSonra).oturumlar, 'oturumlar duruyor').to.have.length(1)
    })
    cy.get('[data-cy="yeni-oturum"]').should('be.visible')
  })
})
