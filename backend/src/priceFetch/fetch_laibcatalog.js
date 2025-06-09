const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const pLimit    = require('p-limit');

const BASE_URL     = 'https://laibcatalog.co.il/';
const DOWNLOAD_DIR = path.join(__dirname, 'Downloads');
const DOWNLOAD_CONCURRENCY = 8;

const mode = process.argv[2] === 'update' ? 'update' : 'init';
console.log(`📦 Running in mode: ${mode === 'update' ? 'UPDATE (Price/Prices)' : 'INIT (PriceFull)'}`);

const chains = [
  { name: 'כ.נ מחסני השוק בע"מ',           chainId: '7290661400001' },
  { name: 'ח. כהן סוכנות מזון ומשקאות בע"מ', chainId: '7290455000004' },
  { name: 'ויקטורי רשת סופרמרקטים בע"מ',     chainId: '7290696200003' }
];

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
  } catch (_) {
    console.warn('⚠️ No .gz links found immediately, continuing...');
  }

  let allLinks = await page.$$eval('a', els =>
    els
      .map(a => a.href || a.getAttribute('href'))
      .filter(href => href && href.includes('.gz'))
  );
  allLinks = Array.from(new Set(
    allLinks.map(h => new URL(h, BASE_URL).href)
  ));

  await browser.close();
  const limit = pLimit(DOWNLOAD_CONCURRENCY);

  for (const { name, chainId } of chains) {
    console.log(`\n🔍 Processing chain ${chainId} (${name})`);

    // Only match relevant files per mode
    const filePrefix = mode === 'init' ? 'PriceFull' : 'Price';
    const re = new RegExp(`^${filePrefix}${chainId}-`, 'i');
    const chainLinks = allLinks.filter(link => re.test(path.basename(link)));

    const files = chainLinks.map(link => {
      const fn = path.basename(link.split('?')[0]);
      const parts = fn.replace(/\.gz$/i, '').split('-');
      const isPriceFull = fn.startsWith('PriceFull');
      const isPrices = fn.startsWith('Prices') || fn.startsWith('Price');

      if (mode === 'init' && !isPriceFull) return null;
      if (mode === 'update' && !isPrices) return null;

      if (parts.length === 4) {
        return { link, fn, storeId: parts[1], ts: parts[2] + parts[3] };
      }
      if (parts.length === 3) {
        return { link, fn, storeId: parts[1], ts: parts[2] + '00' };
      }
      return null;
    }).filter(Boolean);

    const newest = {};
    for (const f of files) {
      if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
        newest[f.storeId] = f;
      }
    }

    const toDownload = Object.values(newest);
    console.log(`  📂 ${toDownload.length} stores → downloading...`);

    await Promise.all(toDownload.map(f => limit(async () => {
      const outPath = path.join(DOWNLOAD_DIR, f.fn);
      if (fs.existsSync(outPath)) {
        console.log(`   ⚠️  Skipping existing ${f.fn}`);
        return;
      }

      console.log(`   ⬇️  ${f.fn}`);
      try {
        const resp = await axios.get(f.link, { responseType: 'stream', timeout: 60000 });
        const ws = fs.createWriteStream(outPath);
        resp.data.pipe(ws);
        await new Promise((res, rej) => ws.on('finish', res).on('error', rej));
        console.log(`     ✔️ Saved ${f.fn}`);
      } catch (err) {
        console.error(`     ❌ Failed ${f.fn}: ${err.message}`);
      }
    })));
  }

  console.log(`\n✅ Done — files downloaded into ${DOWNLOAD_DIR}`);
})();
