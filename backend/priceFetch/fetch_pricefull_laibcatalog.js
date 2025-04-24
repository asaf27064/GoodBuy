// fetch_pricefull_laibcatalog.js
// --------------------------------------------------
// Fetches exactly one (newest) PriceFull .gz per store
// for the three chains hosted at laibcatalog.co.il.
// --------------------------------------------------

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');

const BASE_URL          = 'https://laibcatalog.co.il/';
const DOWNLOAD_DIR      = path.join(__dirname, 'downloads_pricefull');
const SUCCESS_LIST_PATH = path.join(__dirname, 'success_pricefull_laibcatalog.json');

// שלוש הרשתות עם ה־chainId הקבוע
const chains = [
  { name: 'כ.נ מחסני השוק בע"מ',           chainId: '7290661400001' },
  { name: 'ח. כהן סוכנות מזון ומשקאות בע"מ', chainId: '7290455000004' },
  { name: 'ויקטורי רשת סופרמרקטים בע"מ',     chainId: '7290696200003' }
];

// לוודא שיש תיקיית הורדות
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();

  console.log(`🌐 Loading file list from ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  try {
    await page.waitForSelector('a[href$=".gz"]', { timeout: 30000 });
  } catch (_) { /* אם לא מופיע מיידי זה בסדר */ }

  // אוסף כל הקישורים ל־.gz
  let allLinks = await page.$$eval('a', els =>
    els
      .map(a => a.href || a.getAttribute('href'))
      .filter(href => href && href.includes('.gz'))
  );
  // נרמול וקיצור כפילויות
  allLinks = Array.from(new Set(
    allLinks.map(h => new URL(h, BASE_URL).href)
  ));

  await browser.close();

  const summary = [];

  for (const { name, chainId } of chains) {
    console.log(`\n🌐 Processing chain ${chainId}: ${name}`);

    // מסנן רק את הקישורים שמשתייכים ל-chain זה
    const re = new RegExp(`PriceFull${chainId}-`, 'i');
    const chainLinks = allLinks.filter(link => re.test(path.basename(link)));

    console.log(`  🎯 Found ${chainLinks.length} PriceFull .gz files for this chain`);

    // מפענח שם קובץ לפיו נגזור storeId ו־timestamp
    const files = chainLinks.map(link => {
      const fn = path.basename(link.split('?')[0]);
      const nameWithoutExt = fn.replace(/\.gz$/i, '');
      const parts = nameWithoutExt.split('-');
      // לצפות בפורמט: [ 'PriceFull7290...', 'STORE', 'YYYYMMDDHHmm', 'SEQ' ]
      if (parts.length === 4 && parts[0].startsWith('PriceFull')) {
        const storeId  = parts[1];
        const dateTime = parts[2]; // e.g. '202504240316'
        const seq      = parts[3]; // e.g. '001'
        const ts       = dateTime + seq;
        return { link, fn, storeId, ts };
      }
      // בפורמט Winmix יש לפעמים שלושה חלקים: [ 'PriceFull7290...', 'STORE', 'YYYYMMDDHHmm' ]
      if (parts.length === 3 && parts[0].startsWith('PriceFull')) {
        const storeId  = parts[1];
        const dateTime = parts[2]; // 'YYYYMMDDHHmm'
        const ts       = dateTime + '00';  // נניח שניות 00
        return { link, fn, storeId, ts };
      }
      return null;
    }).filter(Boolean);

    // לכל storeId נבחר את ה-newest ע"י השוואת ts
    const newest = {};
    for (const f of files) {
      if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
        newest[f.storeId] = f;
      }
    }
    const toDownload = Object.values(newest);
    console.log(`  📂 ${toDownload.length} stores → downloading 1 file each`);

    // תיקיית יעד לרשת
    const shopDir = path.join(
      DOWNLOAD_DIR,
      name.replace(/[\\/:"*?<>|]/g, '')
    );
    if (!fs.existsSync(shopDir)) {
      fs.mkdirSync(shopDir, { recursive: true });
    }

    // הורדה
    for (const f of toDownload) {
      console.log(`   ⬇️  ${f.fn}`);
      try {
        const resp = await axios.get(f.link, {
          responseType: 'stream',
          timeout: 60000
        });
        const outPath = path.join(shopDir, f.fn);
        const ws      = fs.createWriteStream(outPath);
        resp.data.pipe(ws);
        await new Promise((res, rej) =>
          ws.on('finish', res).on('error', rej)
        );
        console.log(`     ✔️ Saved to ${shopDir}/${f.fn}`);
        summary.push({
          retailer: name,
          storeId:  f.storeId,
          filename: f.fn
        });
      } catch (err) {
        console.error(`     ❌ Failed ${f.fn}: ${err.message}`);
      }
    }
  }

  fs.writeFileSync(SUCCESS_LIST_PATH, JSON.stringify(summary, null, 2));
  console.log(`\n✅ Done — downloaded ${summary.length} files into ${DOWNLOAD_DIR}`);
})();
