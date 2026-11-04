// Tek komutla uçtan uca testler: npm test
//
// 1. localhost:3000'de sunucu yoksa "npm run dev" ile açar (varsa olanı kullanır).
// 2. e2e/ içinde Cypress'i çalıştırır: primer (7) + veri (4) + model (3) + parite (1) = 15 test.
//    demo.cy.js demo videosu içindir, burada çalıştırılmaz.
// 3. Kendi açtığı sunucuyu kapatır ve Cypress'in çıkış kodunu döndürür.
//
// Testler ağa çıkmaz: yapay zekâ çağrıları 500, model fixtures/ altındaki kopyadan gelir (support/e2e.js).
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADRES = "http://localhost:3000/";
const SPECLER = ["primer", "veri", "model", "parite"].map((s) => `cypress/e2e/${s}.cy.js`).join(",");
const WINDOWS = process.platform === "win32";

async function acikMi() {
  try {
    return (await fetch(ADRES)).ok;
  } catch {
    return false;
  }
}

async function bekle(saniye) {
  for (let i = 0; i < saniye; i++) {
    if (await acikMi()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function kapat(surec) {
  if (!surec || surec.exitCode !== null) return;
  if (WINDOWS) spawnSync("taskkill", ["/pid", String(surec.pid), "/T", "/F"], { stdio: "ignore" });
  else process.kill(-surec.pid, "SIGTERM");
}

let sunucu = null;
if (await acikMi()) {
  console.log(`• ${ADRES} zaten açık; o sunucu kullanılıyor.`);
} else {
  console.log("• Sunucu açılıyor: npm run dev");
  sunucu = spawn("npm", ["run", "dev"], { cwd: KOK, shell: WINDOWS, detached: !WINDOWS, stdio: "ignore" });
  if (!(await bekle(120))) {
    kapat(sunucu);
    console.error(`✗ ${ADRES} 120 sn içinde açılmadı.`);
    process.exit(1);
  }
}

const cypress = spawnSync("npx", ["cypress", "run", "--browser", "chrome", "--config", "video=false", "--spec", SPECLER], {
  cwd: join(KOK, "e2e"),
  shell: WINDOWS,
  stdio: "inherit",
});
kapat(sunucu);
process.exit(cypress.status ?? 1);
