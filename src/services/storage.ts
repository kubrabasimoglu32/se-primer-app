/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjeKarti } from "../types/sePrimer";

export const STORAGE_KEY = "sePrimer.v1";

/**
 * Örnek proje verisi:
 * "Kampüs Etkinlik: öğrenci kulüplerinin etkinlik duyurduğu ve öğrencilerin katılım
 * bildirdiği uygulama. React + Firebase (Firestore). Aşama: kodlama. 2 kişilik ekip.
 * Kişisel veri: evet (ad, e-posta). Test: hiç."
 */
export const ORNEK_PROJE: ProjeKarti = {
  ad: "Kampüs Etkinlik",
  aciklama: "Öğrenci kulüplerinin etkinlik duyurduğu ve öğrencilerin katılım bildirdiği uygulama.",
  asama: "kodlama",
  seviye: "Lisans / 3. Sınıf",
  rol: "2 kişilik ekip (Frontend & BaaS)",
  hedef: "Üniversite genelinde kulüp etkinliklerini tek merkezde toplayıp katılım durumunu (LCV) yönetmek.",
  teknoloji: {
    onYuz: "React",
    arkaUc: "Firebase (Cloud Functions)",
    veriTabani: "Firebase (Firestore)",
  },
  mimari: "İstemci Ağırlıklı SPA + BaaS (Firebase Firestore)",
  kisiselVeri: "Evet (Ad, soyad, öğrenci e-postası, etkinlik katılım geçmişi)",
  dosyaYapisi: `campus-events/
├── src/
│   ├── components/
│   │   ├── EventList.tsx
│   │   ├── EventCard.tsx
│   │   └── RsvpModal.tsx
│   ├── firebase/
│   │   ├── config.ts
│   │   └── firestore.ts
│   ├── types/
│   │   └── event.ts
│   ├── App.tsx
│   └── main.tsx
├── firestore.rules
├── package.json
└── README.md`,
  beceri: {
    kapsam: 3,
    mimari: 3,
    veriTabani: 3,
    dosyaDuzeni: 2,
    test: 0, // Test: hiç
    guvenlik: 1,
    dagitim: 2,
    rapor: 2,
  },
  acikRiskler: [
    "Test: hiç — Otomasyonlu birim veya entegrasyon testi bulunmuyor (Test seviyesi 0/5).",
    "Kişisel Veri: Öğrencilerin ad ve e-posta kayıtları için KVKK rıza metni ve veri silme akışı tanımlanmamış.",
    "Firestore Güvenlik Kuralları: İstemciden doğrudan koleksiyona yazma izni açık, yarış durumu (race condition) riski var."
  ],
  oturumlar: [
    {
      no: 1,
      tarih: "24 Ekim 2026",
      degisiklikler: [
        "React + Tailwind arayüzü kuruldu",
        "Firestore 'events' koleksiyonu eklendi",
        "Katılım butonu UI prototipi tamamlandı"
      ],
      not: "Öğrenci kulüpleri için ilk MVP prototipi hazırlandı. Güvenlik kuralları ve testler henüz başlatılmadı.",
      sonuc: "risk",
      sorular: [
        {
          soruId: "V-01",
          konu: "veriTabani",
          tur: "karar",
          metin: "Firebase (Firestore) veri tabanının yapısını değiştirdin. İçerideki mevcut kayıtlar ne olacak?",
          cevap: "Yeni yapı eskiyle uyumlu sayılır, dokunmam",
          secilenSecenekId: "B",
          riskDerecesi: "yuksek",
          risk: "Eski kayıtlarda yeni alan boş geldi. Liste ekranı bu kayıtlarda çöktü.",
          tutorYaniti: "'Uyumlu sayılır' bir varsayımdır. Varsayım test edilmeden üretime giderse hata kullanıcıda ortaya çıkar."
        },
        {
          soruId: "G-01",
          konu: "guvenlik",
          tur: "karar",
          metin: "Kampüs Etkinlik projesinde tuttuğun kişisel veri alanları hakkında hangisi doğru?",
          cevap: "Her alanın neden gerektiğini biliyorum, gereksiz olanları tutmuyorum",
          secilenSecenekId: "A",
          riskDerecesi: "dusuk",
          tutorYaniti: "Formdan gereksiz alanları çıkardın. Korunması gereken veri azaldı."
        },
        {
          soruId: "T-01",
          konu: "test",
          tur: "karar",
          metin: "Teslimden önce Kampüs Etkinlik'nde yalnızca bir şeyi test edecek vaktin var. Hangisini seçersin?",
          cevap: "Test etmesi kolay olan yardımcı fonksiyonları test ederim",
          secilenSecenekId: "B",
          riskDerecesi: "orta",
          tutorYaniti: "Test sayısı güven ölçüsü değildir. Önemli olan neyin test edildiğidir."
        }
      ]
    }
  ]
};

/**
 * LocalStorage'dan kayıtlı projeyi yükler
 */
export function loadProje(): ProjeKarti | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjeKarti;
    // Temel alanların varlığını doğrula
    if (parsed && typeof parsed.ad === "string" && parsed.asama) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Proje yüklenirken localStorage hatası:", error);
    return null;
  }
}

/**
 * Projeyi LocalStorage'a kaydeder
 */
export function saveProje(proje: ProjeKarti): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proje));
    return true;
  } catch (error) {
    console.error("Proje kaydedilirken localStorage hatası:", error);
    return false;
  }
}

/**
 * Projeyi sıfırlar / siler
 */
export function clearProje(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Proje silinirken localStorage hatası:", error);
  }
}
