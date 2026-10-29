const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Uygulamayı "npm run dev" ile çalıştırınca terminalde yazan adres.
    // Farklıysa burayı değiştir (ör. http://localhost:5173).
    baseUrl: 'http://localhost:3000',
    viewportWidth: 390,   // telefon genişliği
    viewportHeight: 844,
    video: true,          // demo videosu için
    defaultCommandTimeout: 8000,
  },
})
