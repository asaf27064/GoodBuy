const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const pLimit    = require('p-limit').default;

const DOWNLOAD_DIR = path.join(__dirname, 'Downloads');
const RETAILER_CONCURRENCY = 4;
const DOWNLOAD_CONCURRENCY = 8;
const MAX_RETRIES = 2;
const delay = ms => new Promise(res => setTimeout(res, ms));

const mode = process.argv[2] === 'update' ? 'update' : 'init';
console.log(`📦 Running in mode: ${mode === 'update' ? 'UPDATE (Prices/Price)' : 'INIT (PriceFull)'}`);

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const allRetailers = require('./retailers.json');
const retailers    = allRetailers.filter(r => r.url.includes('url.publishedprices.co.il'));

const successRetailers = [];
const emptyRetailers = [];

(async () => {
  const retailerLimit = pLimit(RETAILER_CONCURRENCY);
  await Promise.all(
    retailers.map(entry => retailerLimit(() => runRetailerWithRetries(entry)))
  );

  console.log('\n📋 Summary:');
  console.log(`✅ Successful downloads from ${successRetailers.length} retailers.`);
  console.log(`❌ No files found in ${emptyRetailers.length} retailers.`);

  if (successRetailers.length > 0) {
    console.log('\n✅ Retailers with files:');
    successRetailers.forEach(name => console.log(`- ${name}`));
  }

  if (emptyRetailers.length > 0) {
    console.log('\n❌ Retailers with no files:');
    emptyRetailers.forEach(name => console.log(`- ${name}`));
  }
})();

async function runRetailerWithRetries(entry) {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const success = await handleRetailer(entry);
    if (success) return;
    await delay(3000);
  }
  emptyRetailers.push(entry.name);
}

async function handleRetailer(entry) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 300000 });

    await page.type('#username', entry.login.username);
    if (entry.login.password) {
      await page.type('#password', entry.login.password);
    }

    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 300000 })
    ]);

    const found = await page.waitForSelector('a[href$=".gz"]', { timeout: 60000 }).catch(() => null);
    if (!found) {
      await page.close();
      await browser.close();
      return false;
    }

    const rawHrefs = await page.$$eval(
      'a[href$=".gz"]',
      els => els.map(a => a.href || a.getAttribute('href'))
    );

    const gzLinks = rawHrefs
      .map(h => new URL(h, page.url()).href)
      .filter(h => {
        const name = path.basename(h).toLowerCase();
        if (mode === 'init') {
          return name.startsWith('pricefull') && name.endsWith('.gz');
        } else {
          return (name.startsWith('prices') || (name.startsWith('price') && !name.startsWith('pricefull'))) && name.endsWith('.gz');
        }
      });

    if (gzLinks.length === 0) {
      await page.close();
      await browser.close();
      return false;
    }

    const files = gzLinks.map(link => {
      const name = path.basename(link.split('?')[0]);
      let m, storeId, ts;

      m = name.match(/(?:PriceFull|Prices|Price)\d+-\d+-([0-9]+)-(\d{8})-(\d{6})\.gz$/i);
      if (m) {
        storeId = m[1];
        ts      = m[2] + m[3];
      } else {
        m = name.match(/(?:PriceFull|Prices|Price)\d+-([0-9]+)-(\d{12})\.gz$/i);
        if (m) {
          storeId = m[1];
          const dt = m[2];
          ts       = dt.slice(0,8) + dt.slice(8,12) + '00';
        } else {
          return null;
        }
      }

      return { link, name, storeId, ts };
    }).filter(Boolean);

    const newest = {};
    for (const f of files) {
      if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
        newest[f.storeId] = f;
      }
    }

    const downloadLimit = pLimit(DOWNLOAD_CONCURRENCY);
    const cookieHeader = (await page.cookies()).map(c => `${c.name}=${c.value}`).join('; ');

    await Promise.all(Object.values(newest).map(file => downloadLimit(async () => {
      const outPath = path.join(DOWNLOAD_DIR, file.name);
      if (fs.existsSync(outPath)) return;

      try {
        const resp = await axios.get(file.link, {
          responseType    : 'stream',
          timeout         : 120000,
          decompress      : false,
          headers         : {
            Cookie           : cookieHeader,
            'Accept-Encoding': 'identity'
          }
        });
        const ws = fs.createWriteStream(outPath);
        resp.data.pipe(ws);
        await new Promise((res, rej) => ws.on('finish', res).on('error', rej));
      } catch (_) {
      }
    })));

    successRetailers.push(entry.name);
    await page.close();
    await browser.close();
    return true;

  } catch (_) {
    try { await page.close(); } catch {}
    await browser.close();
    return false;
  }
}
