// rescue_images_cse.js
// Fetches big images for each SKU: CHP first, then Google CSE fallback, then Google HTML scrape fallback, with quality check
require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const cheerio  = require('cheerio');
// robust image-size import
let sizeOf;
try {
  const sizeOfLib = require('image-size');
  sizeOf = typeof sizeOfLib === 'function' ? sizeOfLib : sizeOfLib.default || sizeOfLib.imageSize;
} catch(e) {
  console.warn('⚠️ image-size module not installed, quality check disabled');
  sizeOf = null;
}

const PriceItem = require('./models/PriceItem');

// Directory setup
const BASE_DIR = path.join(__dirname, 'product_images_big');
const DIRS = ['success','no_big','error','failed'];
for (const d of DIRS) {
  const p = path.join(BASE_DIR, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// Quality thresholds
const MIN_WIDTH  = 250;
const MIN_HEIGHT = 250;

// 1) Try the CHP page for a base64 image
async function tryChp(sku) {
  const url = `https://chp.co.il/main_page/compare_results?product_barcode=${sku}`;
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const dataUri = $('img[data-uri]').attr('data-uri');
    if (!dataUri) return 'no_big';

    const base64 = dataUri.split(',')[1];
    const out = path.join(BASE_DIR, 'success', `${sku}.png`);
    fs.writeFileSync(out, Buffer.from(base64, 'base64'));
    console.log(`✅ CHP image saved for ${sku}`);
    return 'success';
  } catch (err) {
    console.warn(`⚠️ CHP error for ${sku}: ${err.message}`);
    return 'error';
  }
}

// 2) Fallback: Google Custom Search JSON API
async function tryGoogleCSE(sku, itemName, chainName, category) {
  const key = process.env.GOOGLE_API_KEY;
  const cx  = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) {
    console.warn(`⚠️ CSE credentials missing, will fallback to HTML scrape for ${sku}`);
    return false;
  }
  const q = encodeURIComponent(`${itemName} ${chainName} ${sku}`);
  const url =
    `https://www.googleapis.com/customsearch/v1` +
    `?key=${key}` +
    `&cx=${cx}` +
    `&searchType=image` +
    `&q=${q}` +
    `&num=1`;
  try {
    const { data } = await axios.get(url);
    if (!data.items || data.items.length === 0) throw new Error('no image results');
    const imageUrl = data.items[0].link;
    const resp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const ext  = path.extname(new URL(imageUrl).pathname) || '.jpg';
    const out  = path.join(BASE_DIR, category, `${sku}${ext}`);
    fs.writeFileSync(out, resp.data);
    console.log(`🔍 CSE image saved for ${sku} → ${category}`);
    return true;
  } catch (e) {
    if (e.response && e.response.status === 403) {
      console.error(`❌ CSE 403 for ${sku}: check GOOGLE_API_KEY / GOOGLE_CSE_ID`);
    } else {
      console.error(`❌ CSE fallback failed for ${sku}: ${e.message}`);
    }
    return false;
  }
}

// 3) Final fallback: Google Images HTML scrape
async function tryGoogleHtml(sku, itemName, chainName, category) {
  const query = encodeURIComponent(`${itemName} ${chainName} ${sku}`);
  const url   = `https://www.google.com/search?tbm=isch&q=${query}`;
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    let src;
    $('img').each((i, el) => {
      if (i === 0) return; // skip first (placeholder)
      const candidate = $(el).attr('data-src') || $(el).attr('src');
      if (candidate && candidate.startsWith('http')) {
        src = candidate;
        return false; // break
      }
    });
    if (!src) throw new Error('no valid img src');

    const resp = await axios.get(src, { responseType: 'arraybuffer' });
    const ext  = path.extname(new URL(src).pathname) || '.jpg';
    const out  = path.join(BASE_DIR, category, `${sku}${ext}`);
    fs.writeFileSync(out, resp.data);
    console.log(`🌐 HTML image saved for ${sku} → ${category}`);
    return true;
  } catch (e) {
    console.error(`❌ HTML fallback failed for ${sku}: ${e.message}`);
    return false;
  }
}

(async () => {
  // connect
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) { console.error('✖️ MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  // all SKUs
  const skus = await PriceItem.distinct('itemCode');
  console.log(`🔍 ${skus.length} SKUs`);

  for (const sku of skus) {
        // skip if already have a success image
    const successDir = path.join(BASE_DIR, 'success');
    const existing = fs.readdirSync(successDir).some(f => f.startsWith(`${sku}.`));
    if (existing) {
      console.log(`⏭️ Already have image for ${sku}, skipping`);
      continue;
    }

    // metadata
    const pi = await PriceItem.findOne({ itemCode: sku }, 'itemName chainName').lean();
    const itemName  = pi?.itemName   || sku;
    const chainName = pi?.chainName  || '';

    // 1) CHP
    const cat = await tryChp(sku);
    if (cat === 'success') continue;

    // 2) CSE
    const okCSE = await tryGoogleCSE(sku, itemName, chainName, cat);
    if (okCSE) continue;

    // 3) HTML scrape
    await tryGoogleHtml(sku, itemName, chainName, cat);
  }

  console.log('🏁 Complete');
  await mongoose.disconnect();
})();
