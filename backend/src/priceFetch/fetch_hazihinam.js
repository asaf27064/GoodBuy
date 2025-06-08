const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');

const basePageUrl = 'https://shop.hazi-hinam.co.il/Prices';
const DOWNLOAD_DIR = path.join(__dirname, 'Downloads');
const PAGE_CONCURRENCY = 5;
const DOWNLOAD_CONCURRENCY = 5;

const mode = process.argv[2] === 'update' ? 'update' : 'init';
console.log(`📦 Running in mode: ${mode === 'update' ? 'UPDATE (Price/Prices)' : 'INIT (PriceFull)'}`);

async function fetchPage(pageNum) {
  const url = `${basePageUrl}?p=${pageNum}&s=&f=&t=&d=`;
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  const rows = $('tbody tr');
  if (rows.length === 0) return null;

  const items = [];
  rows.each((_, tr) => {
    const cols = $(tr).find('td');
    const dateSpans = cols.eq(0).find('span').map((i, el) => $(el).text()).get();
    const dateStr = dateSpans.join(' ');
    const [d, m, y, time] = dateStr.split(/[-\s]+/);
    const dateIso = `${y}-${m}-${d}T${time}`;
    const datetime = new Date(dateIso);
    const branch = cols.eq(1).text().trim();
    const name = cols.eq(2).text().trim();
    const urlDownload = cols.eq(5).find('a').attr('href');

    const isFull = name.startsWith('PriceFull');
    const isPartial = name.startsWith('Prices') || name.startsWith('Price');
    const isRelevant = mode === 'init' ? isFull : isPartial;

    if (isRelevant) {
      items.push({ branch, name, datetime, url: urlDownload });
    }
  });

  return items;
}

async function fetchAllPages() {
  let page = 1;
  const allItems = [];
  const limit = pLimit(PAGE_CONCURRENCY);

  while (true) {
    const batch = await Promise.all(
      Array.from({ length: PAGE_CONCURRENCY }, (_, i) =>
        limit(() => fetchPage(page + i))
      )
    );
    const flat = batch.flat().filter(Boolean);
    if (flat.length === 0) break;
    allItems.push(...flat);
    page += PAGE_CONCURRENCY;
  }

  return allItems;
}

async function downloadFile({ branch, url }) {
  const filename = url.split('/').pop();
  const outPath = path.join(DOWNLOAD_DIR, `${branch}-${filename}`);
  const response = await axios({ url, responseType: 'stream' });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  console.log(`✅ Saved to ${outPath}`);
}

(async () => {
  console.log(`📥 Fetching all pages from ${basePageUrl}...`);
  const allItems = await fetchAllPages();

  if (!allItems.length) {
    console.error(`⚠️ No price files of type ${mode === 'init' ? 'PriceFull' : 'Price/Prices'} were found.`);
    process.exit(1);
  }

  const latestByBranch = {};
  for (const it of allItems) {
    const prev = latestByBranch[it.branch];
    if (!prev || it.datetime > prev.datetime) {
      latestByBranch[it.branch] = it;
    }
  }

  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

  const limit = pLimit(DOWNLOAD_CONCURRENCY);
  await Promise.all(
    Object.values(latestByBranch).map(it =>
      limit(() => {
        console.log(`Downloading [${it.branch}] ${path.basename(it.url)} ...`);
        return downloadFile(it);
      })
    )
  );

  console.log(`\n🎉 Done! Downloaded ${Object.keys(latestByBranch).length} files to ${DOWNLOAD_DIR}`);
})();
