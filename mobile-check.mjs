import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = "./mobile-screenshots";

const pages = [
  { path: "/login", name: "login" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/dashboard/new", name: "new-post" },
  { path: "/dashboard/connect", name: "accounts" },
  { path: "/dashboard/analytics", name: "analytics" },
  { path: "/dashboard/settings", name: "settings" },
];

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
});
const page = await context.newPage();

for (const p of pages) {
  try {
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(500);
    const filePath = `${OUT_DIR}/${p.name}.png`;
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✅ Saved: ${filePath}`);
  } catch (err) {
    console.log(`❌ Failed on ${p.path}: ${err.message}`);
  }
}

await browser.close();
console.log("\nDone. Check the mobile-screenshots folder.");
