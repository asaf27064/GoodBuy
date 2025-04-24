// fetch_pricefull_laibcatalog.js
// --------------------------------------------------
// Fetches exactly one (newest) PriceFull .gz per store
// for the three chains hosted at laibcatalog.co.il.
// --------------------------------------------------

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');

const URL               = 'https://laibcatalog.co.il/';
const DOWNLOAD_DIR      = path.join(__dirname, 'downloads_pricefull');
const SUCCESS_LIST_PATH = path.join(__dirname, 'success_pricefull_laibcatalog.json');

// כאן hard-code של שלוש הרשתות וה-chainId שלהן
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

  console.log(`🌐 Loading file list from ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle2' });
  try {
    // לחכות למחרוזות .gz
    await page.waitForSelector('a[href$=".gz"]', { timeout: 30000 });
  } catch (_) { /* לא קריטי */ }

  // לאסוף את כל הקישורים ל־.gz
  let allLinks = await page.$$eval('a', els =>
    els
      .map(a => a.href || a.getAttribute('href'))
      .filter(href => href && href.includes('.gz'))
  );
  // לנרמל לקישורים מוחלטים ולסלק כפילויות
  allLinks = Array.from(new Set(allLinks.map(h => new URL(h, URL).href)));

  await browser.close();

  const summary = [];

  // עבור כל רשת — סינון, בחירת newest, הורדה
  for (const { name, chainId } of chains) {
    console.log(`\n🌐 Processing chain ${chainId}: ${name}`);

    // לסנן רק קבצים ששייכים ל־chainId הזה
    const reChain = new RegExp(`PriceFull${chainId}-`, 'i');
    const chainLinks = allLinks.filter(link => reChain.test(path.basename(link)));

    console.log(`  🎯 Found ${chainLinks.length} PriceFull .gz files for this chain`);

    // לפרק כל קובץ ל־storeId ול־timestamp
    const files = chainLinks.map(link => {
      const fn = path.basename(link.split('?')[0]);
      let m, storeId, ts;

      // סגנון A: PriceFull<chain>-<sub>-<store>-YYYYMMDD-HHMMSS.gz
      m = fn.match(new RegExp(`PriceFull\\d+-\\d+-([0-9]+)-(\\d{8})-(\\d{6})\\.gz$`));
      if (m) {
        storeId = m[1];
        ts      = m[2] + m[3];
      } else {
        // סגנון B: PriceFull<chain>-<store>-YYYYMMDDHHmm.gz
        m = fn.match(new RegExp(`PriceFull\\d+-([0-9]+)-(\\d{12})\\.gz$`));
        if (m) {
          storeId = m[1];
          const dt = m[2];            // YYYYMMDDHHmm
          ts       = dt.slice(0,8)    // YYYYMMDD
                   + dt.slice(8,12) // HHmm
                   + '00';          // assume seconds = 00
        } else {
          return null;
        }
      }
      return { link, fn, storeId, ts };
    }).filter(Boolean);

    // לבחור את הקובץ הכי חדש לכל store
    const newest = {};
    for (const f of files) {
      if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
        newest[f.storeId] = f;
      }
    }
    const toDownload = Object.values(newest);
    console.log(`  📂 ${toDownload.length} stores → downloading 1 file each`);

    // תיקיית הרשת
    const shopDir = path.join(
      DOWNLOAD_DIR,
      name.replace(/[\\/:"*?<>|]/g, '')
    );
    if (!fs.existsSync(shopDir)) {
      fs.mkdirSync(shopDir, { recursive: true });
    }

    // הורדה בפועל
    for (const f of toDownload) {
      console.log(`   ⬇️  ${f.fn}`);
      try {
        const resp = await axios.get(f.link, {
          responseType: 'stream',
          timeout: 60000
        });
        const out = path.join(shopDir, f.fn);
        const ws  = fs.createWriteStream(out);
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

  // לכתוב סיכום
  fs.writeFileSync(SUCCESS_LIST_PATH, JSON.stringify(summary, null, 2));
  console.log(`\n✅ Done — downloaded ${summary.length} files into ${DOWNLOAD_DIR}`);
})();
