// extract_and_download_pricefull.js
// הורד את הקבצים הכי עדכניים של PriceFull לכל אתר

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

async function extractPriceFull(site) {
  const { data: html } = await axios.get(site);
  const $ = cheerio.load(html);

  let filesJson = null;
  $('script').each((_, el) => {
    const script = $(el).html() || '';
    const match = script.match(/const\s+files\s*=\s*JSON\.parse\(`([\s\S]*?)`\)/);
    if (match) filesJson = match[1];
  });

  if (!filesJson) return [];
  const files = JSON.parse(filesJson);
  return files
    .filter(name => name.startsWith('PriceFull'))
    .map(name => {
      // URL: site/yyyyMMdd/filename.gz
      const date = name.match(/(\d{8})\d{4}\.gz$/)[1];
      const url  = `${site.replace(/\/$/, '')}/${date}/${name}`;
      const store = name.split('-')[1];
      const timestamp = name.match(/-(\d{12})\.gz$/)[1];
      return { url, store, timestamp, name };
    });
}

async function downloadLatest(site, items) {
  // קבצים לפי סניף
  const byStore = items.reduce((acc, it) => {
    if (!acc[it.store] || acc[it.store].timestamp < it.timestamp) {
      acc[it.store] = it;
    }
    return acc;
  }, {});

  const outDir = path.join(__dirname, new URL(site).hostname);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const { url, name } of Object.values(byStore)) {
    const outPath = path.join(outDir, name);
    console.log(`⬇️ Downloading ${name}...`);
    const resp = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(outPath);
    resp.data.pipe(writer);
    await new Promise((res, rej) => {
      writer.on('finish', res);
      writer.on('error', rej);
    });
    console.log(`✅ Saved to ${outPath}`);
  }
}

(async () => {
  const sites = [
    'https://prices.ybitan.co.il/',
    'https://prices.mega.co.il/'
  ];

  for (const site of sites) {
    console.log(`\n🔍 Processing ${site}`);
    const items = await extractPriceFull(site);
    if (items.length === 0) {
      console.warn(`⚠️ No PriceFull found on ${site}`);
      continue;
    }
    await downloadLatest(site, items);
  }

  console.log('\n🎉 All done!');
})();