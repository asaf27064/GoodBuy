// price_fetcher_no_gov.js
// Fetches price files from retailers specified in retailer_accounts_merged.json
// Special Shufersal branch: download & decompress all .gz
// Others: generic first-.gz-only logic

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const zlib      = require('zlib');

const DOWNLOAD_DIR     = path.join(__dirname, 'downloads');
const SUCCESS_LIST_PATH = path.join(__dirname, 'success_list.json');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const retailers = require('./retailer_accounts_merged.json');
const successfulRetailers = [];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const seenNoLogin = new Set();

  for (const entry of retailers) {
    // dedupe no-login URLs
    if (!entry.login) {
      if (seenNoLogin.has(entry.url)) {
        console.log(`⏭️ Skipping duplicate no-login URL for ${entry.name}`);
        continue;
      }
      seenNoLogin.add(entry.url);
    }

    console.log(`\n📥 Processing retailer: ${entry.name}`);

    // SPECIAL CASE: Shufersal
    if (entry.url.includes('prices.shufersal.co.il') || entry.name.includes('שופרסל')) {
      const page = await browser.newPage();
      const listUrl = 'https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=0&storeId=0';
      console.log(`   ↪️  Shufersal mode: going to ${listUrl}`);
      try {
        await page.goto(listUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('table tbody', { timeout: 15000 });
        console.log('     ✅ Table body is present.');

        // collect all .gz links
        const gzLinks = await page.$$eval('a', as =>
          as.map(a => a.href).filter(h => h.includes('.gz'))
        );
        console.log(`     🎯 Found ${gzLinks.length} .gz candidates.`);

        // prepare output dir
        const safeName = entry.name.replace(/[\\\/:"*?<>|]/g, '');
        const OUT_DIR = path.join(DOWNLOAD_DIR, safeName);
        if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

        for (const link of gzLinks) {
          const rawName = path.basename(link.split('?')[0]);      // e.g. Price729…400.gz
          const gzPath  = path.join(OUT_DIR, rawName);
          const base    = rawName.replace(/\.gz$/i, '');         // strip .gz
          const outName = /\.(xml|json)$/i.test(base) ? base : base + '.xml';
          const outPath = path.join(OUT_DIR, outName);

          // download .gz
          console.log(`     ⬇️ Downloading ${rawName}…`);
          const resp = await axios.get(link, { responseType: 'stream', timeout: 60000 });
          await new Promise((res, rej) => {
            const ws = fs.createWriteStream(gzPath);
            resp.data.pipe(ws);
            ws.on('finish', res);
            ws.on('error', rej);
          });
          console.log(`       ✔️ Saved gzip: ${gzPath}`);

          // decompress to .xml
          console.log(`       🔓 Decompressing → ${outName}…`);
          await new Promise((res, rej) => {
            const src    = fs.createReadStream(gzPath);
            const gunzip = zlib.createGunzip();
            const dst    = fs.createWriteStream(outPath);
            src.pipe(gunzip).pipe(dst)
              .on('finish', res)
              .on('error', rej);
          });
          console.log(`       ✔️ Decompressed: ${outPath}`);

          // delete .gz
          fs.unlinkSync(gzPath);
          console.log(`       🗑 Deleted gzip.`);
        }

        successfulRetailers.push({ name: entry.name, url: entry.url, downloaded: `${gzLinks.length} file(s)` });
      } catch (err) {
        console.error(`     ⚠️ Shufersal failed: ${err.message}`);
      } finally {
        await page.close();
      }

      // skip the generic logic
      continue;
    }

    // GENERIC branch for all other retailers
    const page = await browser.newPage();
    try {
      if (entry.login) {
        await page.goto(entry.url, { waitUntil: 'networkidle2' });
        await page.type('#username', entry.login.username);
        if (entry.login.password) await page.type('#password', entry.login.password);
        await Promise.all([
          page.click('button[type="submit"], input[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);
      } else {
        await page.goto(entry.url, { waitUntil: 'networkidle2' });
      }

      // wait up to 60s for .gz links
      try {
        await page.waitForSelector('a[href$=".gz"]', { timeout: 60000 });
      } catch (e) {}

      let gzLinks = await page.$$eval('a[href$=".gz"]', as => as.map(a => a.href));

      // if none, drill down once
      if (!gzLinks.length) {
        const subs = await page.$$eval('a', as =>
          as.map(a => a.href).filter(h => !h.endsWith('.gz') && h !== location.href)
        );
        if (subs.length) {
          await page.goto(subs[0], { waitUntil: 'networkidle2' });
          try { await page.waitForSelector('a[href$=".gz"]', { timeout: 60000 }); } catch {}
          gzLinks = await page.$$eval('a[href$=".gz"]', as => as.map(a => a.href));
        }
      }

      console.log(`   ↳ Found ${gzLinks.length} .gz file(s)`);
      if (gzLinks.length) {
        const fileUrl = gzLinks[0];
        const rawName = path.basename(fileUrl.split('?')[0]);
        const safeName = entry.name.replace(/[\\\/:"*?<>|]/g, '');
        const targetDir = path.join(DOWNLOAD_DIR, safeName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        console.log(`   ⬇️ Downloading ${rawName}`);
        const resp = await axios.get(fileUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(path.join(targetDir, rawName));
        resp.data.pipe(writer);
        await new Promise((res, rej) => {
          writer.on('finish', res);
          writer.on('error', rej);
        });
        console.log(`     ✔️ Saved: ${safeName}/${rawName}`);
        successfulRetailers.push({ name: entry.name, url: entry.url, downloaded: rawName });
      }
    } catch (err) {
      console.error(`   ⚠️ Error processing ${entry.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(SUCCESS_LIST_PATH, JSON.stringify(successfulRetailers, null, 2));
  console.log(`\n✅ Completed. ${successfulRetailers.length} entries saved to ${SUCCESS_LIST_PATH}`);
})();
