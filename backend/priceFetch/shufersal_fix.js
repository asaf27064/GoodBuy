// shufersal_live_download.js
const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const zlib      = require('zlib');

(async () => {
  const CAT_ID       = 2;
  const BASE_URL     = 'https://prices.shufersal.co.il/FileObject/UpdateCategory';
  const DOWNLOAD_DIR = path.join(__dirname, 'downloads_shufersal_pricefull');
  const delay        = ms => new Promise(res => setTimeout(res, ms));

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();

  // שלב 1: כמה עמודים יש?
  await page.goto(`${BASE_URL}?catID=${CAT_ID}`, { waitUntil: 'networkidle2' });
  const pageNums = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="page="]'))
      .map(a => a.href.match(/page=(\d+)/)?.[1])
      .filter(Boolean)
      .map(n => parseInt(n, 10))
  );
  const maxPage = pageNums.length ? Math.max(...pageNums) : 1;
  console.log(`🗂️ זוהו ${maxPage} עמודים בסה"כ.`);

  // שלב 2: בקר כל עמוד והורד את הקבצים תוך כדי
  for (let p = 1; p <= maxPage; p++) {
    const url = `${BASE_URL}?catID=${CAT_ID}&page=${p}`;
    console.log(`\n📄 טוען עמוד ${p}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await delay(500);

    const hrefs = await page.$$eval('a[href*=".gz"]', as =>
      as.map(a => a.getAttribute('href')).filter(Boolean)
    );
    console.log(`🎯 נמצאו ${hrefs.length} קישורים בעמוד`);

    for (let href of hrefs) {
      const fullUrl = new URL(href, BASE_URL).href;
      const u       = new URL(fullUrl);
      const name    = u.searchParams.get('fileName');
      if (!name || !/PriceFull/i.test(name)) continue;

      const rawName = name;
      const gzPath  = path.join(DOWNLOAD_DIR, rawName);
      const xmlPath = path.join(DOWNLOAD_DIR, rawName.replace(/\.gz$/i, '.xml'));

      console.log(`⬇️ הורדה: ${rawName}`);
      try {
        const resp = await axios.get(fullUrl, { responseType: 'stream', timeout: 60000 });
        await new Promise((res, rej) => {
          const writer = fs.createWriteStream(gzPath);
          resp.data.pipe(writer);
          writer.on('finish', res).on('error', rej);
        });
        console.log(`✔️ נשמר gzip: ${gzPath}`);

        await new Promise((res, rej) => {
          fs.createReadStream(gzPath)
            .pipe(zlib.createGunzip())
            .pipe(fs.createWriteStream(xmlPath))
            .on('finish', res)
            .on('error', rej);
        });
        console.log(`🔓 דקומפרס ל־xml: ${xmlPath}`);

        fs.unlinkSync(gzPath);
        console.log(`🗑️ נמחק gzip: ${gzPath}`);
      } catch (err) {
        console.error(`❌ שגיאה בהורדה של ${rawName}: ${err.message}`);
      }
    }
  }

  await browser.close();
  console.log('\n🏁 הסתיים.');
})();
