const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const pLimit    = require('p-limit').default;

(async () => {
  const mode    = process.argv[2] === 'update' ? 'update' : 'init';
  const CAT_ID  = mode === 'update' ? 1 : 2;
  const BASE    = 'https://prices.shufersal.co.il/FileObject/UpdateCategory';
  const OUTDIR  = path.join(__dirname, 'Downloads');
  const NAV_TO  = 60000;
  const PAGE_CONC     = 5;
  const DL_CONC       = 10;
  const MAX_DL_RETRY  = 3;
  const failed404     = [];

  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  console.log(`📦 Mode: ${mode.toUpperCase()} (CAT_ID=${CAT_ID})`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });

  const page0 = await browser.newPage();
  page0.setDefaultNavigationTimeout(NAV_TO);
  await page0.goto(`${BASE}?catID=${CAT_ID}`, { waitUntil: 'networkidle2' });
  const nums = await page0.$$eval('a[href*="page="]', els =>
    els.map(a => {
      const m = a.href.match(/page=(\d+)/);
      return m ? +m[1] : NaN;
    }).filter(n => !isNaN(n))
  );
  const maxPage = nums.length ? Math.max(...nums) : 1;
  await page0.close();
  console.log(`🗂 Detected ${maxPage} pages`);

  const scrapeLimit = pLimit(PAGE_CONC);
  const allFiles = (
    await Promise.all(
      Array.from({ length: maxPage }, (_, i) =>
        scrapeLimit(() => scrapePage(browser, i + 1))
      )
    )
  ).flat();

  const latest = {};
  for (const f of allFiles) {
    if (!latest[f.storeId] || f.ts > latest[f.storeId].ts) {
      latest[f.storeId] = f;
    }
  }
  const toDownload = Object.values(latest);
  console.log(`\n📂 ${toDownload.length} stores → will download one file each`);

  const dlLimit = pLimit(DL_CONC);
  let succ = 0, fail = 0;

  await Promise.all(toDownload.map(f =>
    dlLimit(() => downloadWithRetry(f).then(ok => ok ? succ++ : fail++))
  ));

  console.log(`\n✅ Done!  Success: ${succ}, Failed: ${fail}`);
  if (failed404.length) {
    console.log(`\n⚠️ 404 after retries (${failed404.length}):`);
    failed404.forEach(n => console.log(` - ${n}`));
    fs.writeFileSync(path.join(__dirname,'404_list.txt'), failed404.join('\n'));
  }

  await browser.close();
  console.log(`👋 Browser closed.`);

  async function scrapePage(browser, pageNum) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAV_TO);
    try {
      await page.goto(`${BASE}?catID=${CAT_ID}&page=${pageNum}`, {
        waitUntil: 'networkidle2'
      });
      const links = await page.$$eval('a[href*=".gz"]', els =>
        els.map(a => a.href)
      );
      console.log(`   🎯 Page ${pageNum}: ${links.length} .gz links`);

      return links.map(link => {
        const name = path.basename(link.split('?')[0]);
        let m = name.match(/Price(?:Full)?\d+-(\d+)-(\d{12})\.gz$/i)
             || name.match(/Price(?:Full)?\d+-(\d+)-(\d{8})(\d{4})\.gz$/i);
        if (!m) return null;
        return {
          link,
          name,
          storeId: m[1],
          ts:      m[3] ? m[3] : m[2] + m[3] + '00'
        };
      }).filter(Boolean);
    } catch {
      return [];
    } finally {
      await page.close();
    }
  }

  async function downloadWithRetry(file) {
    const out = path.join(OUTDIR, file.name);
    for (let i = 1; i <= MAX_DL_RETRY; i++) {
      try {
        console.log(`⬇️ [${i}/${MAX_DL_RETRY}] ${file.name}`);
        const resp = await axios.get(file.link, {
          responseType: 'stream',
          timeout: 90000,
          validateStatus: () => true,
          headers: { Referer: BASE, 'Accept-Encoding': 'identity' }
        });
        if (resp.status === 404) {
          console.warn(`   ⚠️ 404: ${file.name}`);
          if (i < MAX_DL_RETRY) { await wait(3000*i); continue; }
          failed404.push(file.name);
          return false;
        }
        if (resp.status >= 400) throw new Error(`Status ${resp.status}`);
        await new Promise((res, rej) =>
          resp.data.pipe(fs.createWriteStream(out))
            .on('finish', res).on('error', rej)
        );
        console.log(`   ✔️ Saved ${file.name}`);
        return true;
      } catch (err) {
        console.error(`   ❌ ${file.name}: ${err.message}`);
        if (i < MAX_DL_RETRY) await wait(3000*i);
        else return false;
      }
    }
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
})();