# CLAUDE.md — SE Primer (YZM301)

Bu repo YZM301 dersi için SE Primer uygulamasıdır. Bu haftanın ödevi `ODEV.md` içindedir;
başlangıç reposu `../huggingface-hello-web` (özellikle `hf_cli.py` ve `web/index.html`).

## Kurallar

1. **Dil:** Tüm dokümanlar, kod yorumları, commit mesajları ve kullanıcıya gösterilen metinler **Türkçe** yazılır.
   Mevcut adlandırma düzeni de Türkçedir (`konuSec`, `ProjeKarti`, `secenek-A` …); yeni kod bu düzene uyar.
2. **Mevcut 7 Cypress testi bozulmamalı** (`e2e/cypress/e2e/primer.cy.js`). Bu testler ödevdeki regresyon testidir.
   - Var olan `data-cy` değerleri (`ornek-proje`, `ne-degisti-gonder`, `secenek-A/B/C`, `devam`, `sonuc`,
     `yeni-oturum`, `tanisma-gonder` …) ve `data-risk` niteliği silinmez, adı değiştirilmez.
   - localStorage anahtarı `sePrimer.v1` ve içindeki `acikRiskler` yapısı korunur.
   - Seçimden önce risk/puan ipucu ("düşük risk", "Hazır (+1)" vb.) ekranda görünmez (test 7).
   - Testlerde `/api/**` istekleri 500 döner; uygulama yapay zekâ olmadan soru bankasıyla çalışmaya devam etmeli.
     Model (ONNX) yüklenemezse de uygulama çökmeden kural tabanlı davranışa dönmeli.
   - Değişiklikten sonra testler çalıştırılır: `cd e2e && npx cypress run --browser chrome`.
3. **Kişisel veri toplanmaz.** `data/oturumlar.csv` ve uygulama kayıtlarında ad, e-posta, telefon, cihaz kimliği,
   konum, IP vb. tutulmaz. Oturum kimliği rastgele üretilir. Serbest metin alanları (gerekçe, not) veri setine
   yazılmaz; yazılması gerekirse `src/primer/maskele.ts` ile maskelenir. (KVKK — bkz. `spec.md` kapsam dışı.)
4. **seed = 13** yalnız **eğitim, veri bölme ve sentetik veri** için kullanılır: `random_state=13`
   (train/test bölme, model) ve sentetik veri üreticisi. (Başlangıç reposundaki `SEED = 13` ile aynı.)
   - **İstisna:** Veri Toplama Modu'ndaki zorluk yazı-turası bilerek gerçek rastgeledir (`Math.random`), çünkü bu
     bir rastgele atamadır. Sabit tohum her oturumda aynı zorluk sırasını üretir ve atamayı bozar.
   - Testlerde gerekirse `Math.random` stub'lanır (ör. `cy.stub(win.Math, "random").returns(0.1)`).
   - Mevcut seçenek karıştırma (`SoruScreen.tsx`, Fisher-Yates) da `Math.random` kullanır; testler bu yüzden
     seçenekleri harfe göre değil `data-risk` niteliğine göre seçer.

## Ödev için hatırlatmalar

- Kabul eşiği `spec.md`'ye **eğitimden önce** yazılır; eşiğin altındaki model yayınlanmaz (`train.py` hata vererek durur).
- `data/oturumlar.csv` içinde `kaynak` sütunu zorunlu: `gercek` | `sentetik`.
- Model Hugging Face'ten `main` ile değil, **commit'e sabitlenmiş** `resolve/<commit>/` URL'siyle indirilir.
- ONNX ↔ sklearn ve uygulama ↔ Python (parite) farkı `1e-4`'ü geçmez.
