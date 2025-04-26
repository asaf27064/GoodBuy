// extract_hazihinam_latest.js
// הורד אוטומטית רק קבצי PriceFull הכי עדכניים עבור "חצי חינם"

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

// עדכן פה את ה-URL של הדף הראשי עם הפאגינציה
const basePageUrl = 'https://shop.hazi-hinam.co.il/Prices';

async function fetchPage(pageNum) {
  const url = `${basePageUrl}?p=${pageNum}&s=&f=&t=&d=`;
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  const rows = $('tbody tr');
  if (rows.length === 0) return null;

  const items = [];
  rows.each((_, tr) => {
    const cols = $(tr).find('td');

    // עמודה 0: תאריך ושעה
    const dateSpans = cols.eq(0).find('span').map((i, el) => $(el).text()).get();
    const dateStr = dateSpans.join(' ');              // "25-04-2025 08:28"
    const [d, m, y, time] = dateStr.split(/[-\s]+/);
    const dateIso = `${y}-${m}-${d}T${time}`;
    const datetime = new Date(dateIso);

    // עמודה 1: קוד חנות
    const branch = cols.eq(1).text().trim();

    // עמודה 2: שם הקובץ
    const name = cols.eq(2).text().trim();

    // עמודה 5: קישור הורדה
    const urlDownload = cols.eq(5).find('a').attr('href');

    // רק PriceFull
    if (name.startsWith('PriceFull')) {
      items.push({ branch, name, datetime, url: urlDownload });
    }
  });
  return items;
}

(async () => {
  let page = 1;
  const allItems = [];
  while (true) {
    console.log(`Fetching page ${page}...`);
    const items = await fetchPage(page);
    if (!items) break;
    allItems.push(...items);
    page++;
  }

  if (!allItems.length) {
    console.error('⚠️ לא נמצאו קבצי PriceFull. בדוק את basePageUrl.');
    process.exit(1);
  }

  // בוחרים את הפריט הכי עדכני לכל סניף
  const latestByBranch = {};
  for (const it of allItems) {
    const prev = latestByBranch[it.branch];
    if (!prev || it.datetime > prev.datetime) {
      latestByBranch[it.branch] = it;
    }
  }

  // תיקיית יציאה
  const outDir = path.join(__dirname, 'FullPriceDownloads');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // הורדה
  for (const [branch, it] of Object.entries(latestByBranch)) {
    const filename = it.url.split('/').pop();
    const outPath = path.join(outDir, `${branch}-${filename}`);
    console.log(`Downloading [${branch}] ${filename} ...`);

    await axios({ url: it.url, responseType: 'stream' })
      .then(response => new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      }));

    console.log(`✅ Saved to ${outPath}`);
  }

  console.log('\n🎉 All done! Only PriceFull files are in ./hazihinam');
})();