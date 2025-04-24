// fetch_pricefull_per_store.js
// Logs into each url.publishedprices.co.il retailer and, for each store,
// finds the newest PriceFull .gz (in either naming style) and downloads one file per store.

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');

const DOWNLOAD_DIR      = path.join(__dirname, 'downloads_pricefull');
const SUCCESS_LIST_PATH = path.join(__dirname, 'success_pricefull_by_store.json');

// tiny helper to replace page.waitForTimeout
const delay = ms => new Promise(res => setTimeout(res, ms));

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const allRetailers = require('./retailer_accounts_merged.json');
// only publishedprices.co.il entries
const retailers    = allRetailers.filter(r => r.url.includes('url.publishedprices.co.il'));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const summary = [];

  for (const entry of retailers) {
    console.log(`\n🔐 ${entry.name}`);
    const page = await browser.newPage();

    try {
      // — LOGIN —
      await page.goto(entry.url, { waitUntil: 'networkidle2' });
      await page.type('#username', entry.login.username);
      if (entry.login.password) {
        await page.type('#password', entry.login.password);
      }
      await Promise.all([
        page.click('button[type="submit"], input[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);

      // — WAIT FOR FILE LIST ROWS —
      await page.waitForSelector('#fileList tbody tr', { timeout: 30000 });
      let rows = await page.$$('#fileList tbody tr');
      if (rows.length === 0) {
        await delay(2000);
        rows = await page.$$('#fileList tbody tr');
      }
      if (rows.length === 0) {
        console.warn(`   ⚠️ No files found for ${entry.name}, skipping.`);
        await page.close();
        continue;
      }

      // — COLLECT ALL .gz LINKS —
      const rawHrefs = await page.$$eval(
        '#fileList tbody tr a.f',
        as => as.map(a => a.href || a.getAttribute('href'))
      );
      const gzLinks = rawHrefs
        .map(h => new URL(h, page.url()).href)
        .filter(h => /PriceFull.*\.gz$/i.test(h));

      console.log(`   🎯 Found ${gzLinks.length} PriceFull .gz files total`);

      // — PARSE STORE & TIMESTAMP FOR BOTH NAMING STYLES —
      const files = gzLinks.map(link => {
        const name = path.basename(link.split('?')[0]);
        let storeId, ts, m;

        // 1) chain-subChain-store-YYYYMMDD-HHMMSS.gz
        m = name.match(/PriceFull\d+-\d+-([0-9]+)-(\d{8})-(\d{6})\.gz$/i);
        if (m) {
          storeId = m[1];
          ts      = m[2] + m[3];
        } else {
          // 2) chain-store-YYYYMMDDHHmm.gz  (no subChain, time only to minutes)
          m = name.match(/PriceFull\d+-([0-9]+)-(\d{12})\.gz$/i);
          if (m) {
            storeId = m[1];
            const dt = m[2];           // YYYYMMDDHHmm
            ts       = dt.slice(0,8)   // YYYYMMDD
                      + dt.slice(8,12) // HHmm
                      + '00';          // assume seconds = 00
          } else {
            return null;
          }
        }

        return { link, name, storeId, ts };
      }).filter(Boolean);

      // — PICK THE NEWEST PER STORE —
      const newest = {};
      for (const f of files) {
        if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
          newest[f.storeId] = f;
        }
      }
      const toDownload = Object.values(newest);
      console.log(`   📂 ${toDownload.length} stores → downloading 1 file each`);

      // — DOWNLOAD EACH FILE —
      const shopDir = path.join(
        DOWNLOAD_DIR,
        entry.name.replace(/[\\/:"*?<>|]/g, '')
      );
      if (!fs.existsSync(shopDir)) {
        fs.mkdirSync(shopDir, { recursive: true });
      }

      for (const file of toDownload) {
        console.log(`   ⬇️  ${file.name}`);
        const resp = await axios.get(file.link, {
          responseType: 'stream',
          timeout: 60000
        });
        const outPath = path.join(shopDir, file.name);
        const ws = fs.createWriteStream(outPath);
        resp.data.pipe(ws);
        await new Promise((res, rej) =>
          ws.on('finish', res).on('error', rej)
        );
        console.log(`     ✔️ Saved to ${shopDir}/${file.name}`);

        summary.push({
          retailer: entry.name,
          storeId:  file.storeId,
          filename: file.name
        });
      }
    } catch (err) {
      console.error(`   ❌ ${entry.name}: ${err.message}`);
    } finally {
      try {
        if (!page.isClosed()) await page.close();
      } catch {}
    }
  }

  await browser.close();
  fs.writeFileSync(SUCCESS_LIST_PATH, JSON.stringify(summary, null, 2));
  console.log(
    `\n✅ Done — downloaded ${summary.length} files ` +
    `(one per store) into ${DOWNLOAD_DIR}`
  );
})();
