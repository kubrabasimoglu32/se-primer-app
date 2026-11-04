// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
// Zorluk modeli (spec §10): testler ağa çıkmasın. Hugging Face'teki commit'e sabit model.onnx ve config.json
// yerine fixtures/ altındaki kopyalar (model/ klasöründekilerle aynı) verilir. Bütün testlerde geçerlidir;
// bir test kendi intercept'ini tanımlarsa (ör. 404) o öncelik kazanır.
beforeEach(() => {
  // Önce genel engel: Hugging Face'e giden başka her istek 404 (ağa çıkılmaz). Sonra tanımlananlar öncelik kazanır.
  cy.intercept('https://huggingface.co/**', { statusCode: 404, body: 'testte ağ yok' })
  cy.intercept('GET', 'https://huggingface.co/**/model.onnx', {
    fixture: 'model.onnx,null',
    headers: { 'content-type': 'application/octet-stream' },
  }).as('modelOnnx')
  cy.intercept('GET', 'https://huggingface.co/**/config.json', { fixture: 'config.json' }).as('modelConfig')
})
