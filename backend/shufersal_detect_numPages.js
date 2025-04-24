// shufersal_fetch_latest_per_store.js
const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const zlib      = require('zlib');

(async () => {
  const CAT_ID      = 2;  // pricefull
  const BASE_URL    = 'https://prices.shufersal.co.il/FileObject/UpdateCategory';
  const DOWNLOAD_DIR= path.join(__dirname, 'downloads_shufersal_pricefull');

  // ensure download dir exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();

  // load page 1
  await page.goto(`${BASE_URL}?catID=${CAT_ID}`, { waitUntil: 'networkidle2' });

  // scrape all page numbers from any anchor containing "?page="
  const pageNums = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('a[href*="page="]')
    )
      .map(a => {
        const m = a.href.match(/page=(\d+)/);
        return m ? parseInt(m[1], 10) : NaN;
      })
      .filter(n => !isNaN(n));
  });

  const maxPage = pageNums.length ? Math.max(...pageNums) : 1;
  console.log(`🗂️  Detected ${maxPage} page(s) total.`);

  // collect every .gz file entry across all pages
  const allFiles = [];
  for (let p = 1; p <= maxPage; p++) {
    console.log(`\n📄 Loading page ${p}: ${BASE_URL}?catID=${CAT_ID}&page=${p}`);
    await page.goto(`${BASE_URL}?catID=${CAT_ID}&page=${p}`, { waitUntil: 'networkidle2' });
    // give the DOM a moment
    await page.waitForTimeout(500);

    // grab every .gz link on this page
    const links = await page.$$eval('a[href*=".gz"]', as => as.map(a => a.href));
    console.log(`   🎯 Found ${links.length} .gz file(s)`);

    // parse out storeId + timestamp from filename
    for (const link of links) {
      const name = path.basename(link.split('?')[0]);
      // match PriceFull<chain>-<subChain>-<store>-YYYYMMDD-HHMMSS.gz
      let m = name.match(/PriceFull\d+-\d+-([0-9]+)-(\d{8})-(\d{6})\.gz$/i);
      if (!m) continue;
      const [, storeId, yyyymmdd, hhmmss] = m;
      allFiles.push({
        link,
        name,
        storeId,
        ts: `${yyyymmdd}${hhmmss}`
      });
    }
  }

  await browser.close();

  // pick the newest file per store
  const latestByStore = {};
  for (const f of allFiles) {
    if (!latestByStore[f.storeId] || f.ts > latestByStore[f.storeId].ts) {
      latestByStore[f.storeId] = f;
    }
  }
  const toDownload = Object.values(latestByStore);
  console.log(`\n📂 ${toDownload.length} stores → will download 1 file each`);

  // now download + gunzip each one
  for (const file of toDownload) {
    console.log(`\n⬇️ Downloading: ${file.name}`);
    const gzPath  = path.join(DOWNLOAD_DIR, file.name);
    const xmlName = file.name.replace(/\.gz$/i, '.xml');
    const xmlPath = path.join(DOWNLOAD_DIR, xmlName);

    // download .gz
    const resp = await axios.get(file.link, { responseType: 'stream', timeout: 60000 });
    await new Promise((res, rej) => {
      const ws = fs.createWriteStream(gzPath);
      resp.data.pipe(ws).on('finish', res).on('error', rej);
    });
    console.log(`   ✔️ Saved gzip: ${gzPath}`);

    // gunzip → .xml
    await new Promise((res, rej) => {
      fs.createReadStream(gzPath)
        .pipe(zlib.createGunzip())
        .pipe(fs.createWriteStream(xmlPath))
        .on('finish', res)
        .on('error', rej);
    });
    console.log(`   🔓 Decompressed: ${xmlPath}`);

    // remove .gz
    fs.unlinkSync(gzPath);
    console.log(`   🗑  Deleted gzip: ${gzPath}`);
  }

  console.log('\n🏁 All done.');
})();
