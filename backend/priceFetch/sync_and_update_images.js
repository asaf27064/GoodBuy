// sync_and_update_images.js
const path      = require('path');
const fs        = require('fs');
const fsp       = fs.promises;
const os        = require('os');
const mongoose  = require('mongoose');
const { google }= require('googleapis');
const pLimit    = require('p-limit').default;
const axios     = require('axios');
const cheerio   = require('cheerio');
const ItemImage = require('../models/ItemImage');
const PriceItem = require('../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// הגדרות
const KEYFILE         = path.join(__dirname, 'drive-key.json');
const FOLDER_ID       = '1JZXJWP4maO_-3U4TSx4nZ2iGtWlgvxzQ';
const DOWNLOAD_DIR    = path.join(__dirname, 'DownloadsMissingPhotos');
// כמות מקביליות מותאמת למכונה
const DRIVE_CONCURRENCY = os.cpus().length * 2;
const CHP_CONCURRENCY   = os.cpus().length * 2;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1) Recursively list all images in Drive folder
async function listAllImages(folderId, drive) {
  let images = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'nextPageToken, files(id,name,mimeType)',
      pageSize: 1000,
      pageToken
    });
    for (const f of res.data.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        images.push(...await listAllImages(f.id, drive));
      } else if (f.mimeType.startsWith('image/')) {
        images.push(f);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return images;
}

// 2) Download big image from CHP with full headers, single attempt
async function downloadBigImage(sku) {
  const url = `https://chp.co.il/main_page/compare_results?product_barcode=${sku}`;
  await wait(200 + Math.random() * 300);
  const res = await axios.get(url, {
    timeout: 90000,
    headers: {
      'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language':  'he-IL,he;q=0.9,en-US;q=0.8',
      'Referer':          'https://chp.co.il/',
      'Origin':           'https://chp.co.il'
    },
    validateStatus: () => true
  });

  if (res.status >= 400) {
    await ItemImage.updateOne(
      { itemCode: sku },
      { $set: { noImage: true } },
      { upsert: true }
    );
    throw new Error(`HTTP ${res.status}`);
  }

  const $ = cheerio.load(res.data);
  const dataUri = $('img[data-uri]').attr('data-uri');
  if (!dataUri) {
    await ItemImage.updateOne(
      { itemCode: sku },
      { $set: { noImage: true } },
      { upsert: true }
    );
    throw new Error('no image found');
  }

  const base64 = dataUri.split(',')[1];
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const filePath = path.join(DOWNLOAD_DIR, `${sku}.png`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

// 5) Upload new image to Drive and delete local file
async function uploadToDrive(filePath, sku, drive) {
  const fileMetadata = {
    name: `${sku}.png`,
    parents: [FOLDER_ID]
  };
  const media = {
    mimeType: 'image/png',
    body: fs.createReadStream(filePath)
  };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
  fs.unlinkSync(filePath);
  return res.data.id;
}

// 3) main orchestration
async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) { console.error('✖️ MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Google Drive client
  const auth  = new google.auth.GoogleAuth({ keyFile: KEYFILE, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  // ---- Drive sync in parallel ----
  console.log('🔍 Scanning Drive for images...');
  const images = await listAllImages(FOLDER_ID, drive);
  console.log(`🔎 Found ${images.length} Drive images`);
  const driveLimit = pLimit(DRIVE_CONCURRENCY);
  await Promise.all(images.map(({ id, name }) => driveLimit(async () => {
    const itemCode = path.basename(name, path.extname(name));
    const imageUrl = `https://drive.google.com/uc?export=view&id=${id}`;
    await ItemImage.updateOne(
      { itemCode },
      { $set: { imageUrl }, $unset: { noImage: '' } },
      { upsert: true }
    );
  })));
  console.log('✅ Drive sync complete');

  // ---- Find missing unique SKUs ----
  const existingCodes = await ItemImage.distinct('itemCode', { noImage: { $ne: true } });
  const missingCodes  = await PriceItem.distinct('itemCode', { itemCode: { $nin: existingCodes } });
  console.log(`🔍 ${missingCodes.length} unique SKUs missing images`);

  // ---- Download & upload missing images in parallel ----
  const chpLimit = pLimit(CHP_CONCURRENCY);
  await Promise.all(missingCodes.map(sku => chpLimit(async () => {
    try {
      const filePath = await downloadBigImage(sku);
      console.log(`✅ Downloaded CHP image for SKU ${sku}`);
      const newId = await uploadToDrive(filePath, sku, drive);
      const imageUrl = `https://drive.google.com/uc?export=view&id=${newId}`;
      await ItemImage.updateOne(
        { itemCode: sku },
        { $set: { imageUrl }, $unset: { noImage: '' } },
        { upsert: true }
      );
      console.log(`🚀 Uploaded to Drive for SKU ${sku}`);
    } catch (err) {
      console.warn(`⚠️ SKU ${sku} failed: ${err.message}`);
    }
  })));

  console.log('🏁 All done — images synced & uploaded');
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
}

module.exports = main;
