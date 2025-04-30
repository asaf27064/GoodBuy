const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

const mode = process.argv[2] === 'update' ? 'update' : 'init';
console.log(`📦 Running in mode: ${mode === 'update' ? 'UPDATE (Price/Prices)' : 'INIT (PriceFull)'}`);

const DOWNLOAD_DIR = path.join(__dirname, 'Downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

async function extractRelevantFiles(site) {
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
    .filter(name => {
      if (mode === 'init') return name.startsWith('PriceFull');
      return name.startsWith('Prices') || name.startsWith('Price');
    })
    .map(name => {
      const matchDate = name.match(/(\d{8})\d{4}\.gz$/);
      const matchTimestamp = name.match(/-(\d{12})\.gz$/);
      if (!matchDate || !matchTimestamp) return null;
      const date = matchDate[1];
      const timestamp = matchTimestamp[1];
      const url = `${site.replace(/\/$/, '')}/${date}/${name}`;
      const store = name.split('-')[1];
      return { url, store, timestamp, name };
    })
    .filter(Boolean);
}

async function downloadLatest(site, items) {
  const byStore = items.reduce((acc, it) => {
    if (!acc[it.store] || acc[it.store].timestamp < it.timestamp) {
      acc[it.store] = it;
    }
    return acc;
  }, {});

  for (const { url, name } of Object.values(byStore)) {
    const outPath = path.join(DOWNLOAD_DIR, name);
    if (fs.existsSync(outPath)) {
      console.log(`⚠️  Skipping existing ${name}`);
      continue;
    }
    console.log(`⬇️ Downloading ${name}...`);
    const resp = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(outPath);
    await new Promise((res, rej) => {
      resp.data.pipe(writer);
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
    const items = await extractRelevantFiles(site);
    if (items.length === 0) {
      console.warn(`⚠️ No matching files found on ${site}`);
      continue;
    }
    await downloadLatest(site, items);
  }

  console.log('\n🎉 All done!');
})();
