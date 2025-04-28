// download_all_images.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const cheerio  = require('cheerio');

// Setup paths
const outputDir = path.join(__dirname, 'product_images_big', 'success');
const logDir    = path.join(__dirname, 'logs');

// Ensure folders exist
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Create log streams
const noImageLog = fs.createWriteStream(path.join(logDir, 'no_image_found.log'), { flags: 'a' });
const errorLog   = fs.createWriteStream(path.join(logDir, 'download_errors.log'), { flags: 'a' });

// Preload existing SKU images
const existingFiles = new Set(
  fs.readdirSync(outputDir)
    .filter(name => name.endsWith('.png'))
    .map(name => path.basename(name, '.png'))
);

// Download function
async function downloadBigImageForSKU(entry) {
  const { itemCode: sku, chainName, itemName } = entry;
  try {
    const url = `https://chp.co.il/main_page/compare_results?product_barcode=${sku}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://chp.co.il/',
        'Origin':  'https://chp.co.il'
      }
    });

    const $ = cheerio.load(res.data);
    const imgDataUri = $('img[data-uri]').attr('data-uri');
    if (!imgDataUri) {
      console.warn(`⚠️ No big image found for SKU ${sku}`);
      noImageLog.write(`[${new Date().toISOString()}] Chain: ${chainName} | SKU: ${sku} | Name: ${itemName}\n`);
      return;
    }

    const base64Image = imgDataUri.split(',')[1];
    const filePath = path.join(outputDir, `${sku}.png`);
    fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));
    console.log(`✅ Saved BIG image for SKU ${sku}`);
  } catch (err) {
    console.error(`❌ Error fetching big image for SKU ${sku}:`, err.message);
    errorLog.write(`[${new Date().toISOString()}] Chain: ${chainName} | SKU: ${sku} | Name: ${itemName} | Error: ${err.message}\n`);
  }
}

// Main
(async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('✖️ MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const PriceItem = require('./models/PriceItem');

  // Get all itemCode + chainName + itemName
  const skuList = await PriceItem.find({}, 'itemCode chainName itemName').lean();
  console.log(`🔍 Found ${skuList.length} unique SKUs in database`);

  for (const entry of skuList) {
    if (existingFiles.has(entry.itemCode)) {
      console.log(`⏭️ Already have image for SKU ${entry.itemCode}`);
      continue;
    }
    await downloadBigImageForSKU(entry);
  }

  console.log('🏁 All done!');
  await mongoose.disconnect();
})();
