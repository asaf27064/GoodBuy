const path        = require('path');
const fs          = require('fs');
const mongoose    = require('mongoose');
const { google }  = require('googleapis');
const pLimit      = require('p-limit').default;
const axios       = require('axios');
const cheerio     = require('cheerio');
const ItemImage   = require('../../models/ItemImage');
const PriceItem   = require('../../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const KEYFILE           = path.join(__dirname, 'drive-key.json');
const DRIVE_FOLDER_ID   = '1JZXJWP4maO_-3U4TSx4nZ2iGtWlgvxzQ';
const DOWNLOAD_DIR      = path.join(__dirname, 'DownloadsMissingPhotos');
const DRIVE_CONCURRENCY = require('os').cpus().length * 2;
const CHP_CONCURRENCY   = require('os').cpus().length * 2;
const MAX_CHP_TIMEOUT   = 90_000;  // ms

const mode = process.argv[2] === 'update' ? 'update' : 'init';
const now  = () => new Date().toISOString();

async function listAllImages(folderId, drive) {
  let images = [], pageToken = null;
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

async function downloadBigImage(sku) {
  const url = `https://chp.co.il/main_page/compare_results?product_barcode=${sku}`;
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
  const res = await axios.get(url, {
    timeout: MAX_CHP_TIMEOUT,
    headers: {
      'User-Agent':      'Mozilla/5.0',
      'Accept':          'text/html',
      'Accept-Language': 'he-IL,he;q=0.9',
      'Referer':         'https://chp.co.il/',
      'Origin':          'https://chp.co.il'
    },
    validateStatus: () => true
  });
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status}`);
  }
  const $ = cheerio.load(res.data);
  const dataUri = $('img[data-uri]').attr('data-uri');
  if (!dataUri) {
    throw new Error('no image found');
  }
  const base64 = dataUri.split(',')[1];
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  const filePath = path.join(DOWNLOAD_DIR, `${sku}.png`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

async function uploadToDrive(filePath, sku, drive) {
  const fileMetadata = {
    name: `${sku}.png`,
    parents: [DRIVE_FOLDER_ID]
  };
  const media = {
    mimeType: 'image/png',
    body: fs.createReadStream(filePath)
  };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
  fs.unlinkSync(filePath);
  return res.data.id;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('✖️ MONGO_URI not set'); process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[${now()}] ✅ Connected to MongoDB in ${mode.toUpperCase()} mode`);

  const auth  = new google.auth.GoogleAuth({ keyFile: KEYFILE, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  if (mode === 'init') {
    console.log(`[${now()}] 🔍 Scanning Drive for existing images...`);
    const images     = await listAllImages(DRIVE_FOLDER_ID, drive);
    const driveLimit = pLimit(DRIVE_CONCURRENCY);

    console.log(`[${now()}] 🔎 Found ${images.length} Drive images`);
    await Promise.all(images.map(({ id, name }) => driveLimit(async () => {
      const itemCode = path.basename(name, path.extname(name));
      const imageUrl = `https://drive.google.com/uc?export=view&id=${id}`;
      await ItemImage.updateOne(
        { itemCode },
        {
          $set: {
            status: 'found',
            driveId: id,
            imageUrl,
            lastCheckedAt: new Date(),
            attempts: 0
          }
        },
        { upsert: true }
      );
    })));

    const foundCodes = await ItemImage.distinct('itemCode', { status: 'found' });
    const allCodes   = await PriceItem.distinct('itemCode');
    const toMark     = allCodes.filter(code => !foundCodes.includes(code));
    console.log(`[${now()}] 🔍 Marking ${toMark.length} SKUs as not_found`);
    await Promise.all(toMark.map(code =>
      ItemImage.updateOne(
        { itemCode: code },
        { $set: { status: 'not_found', lastCheckedAt: new Date() }, $setOnInsert: { attempts: 1 } },
        { upsert: true }
      )
    ));
  }

  const seenCodes  = await ItemImage.distinct('itemCode');
  const allCodes   = await PriceItem.distinct('itemCode');
  const missing    = allCodes.filter(code => !seenCodes.includes(code));
  console.log(`[${now()}] 🔍 ${missing.length} BRAND-NEW SKUs to fetch images for`);

  const chpLimit = pLimit(CHP_CONCURRENCY);
  await Promise.all(missing.map(sku => chpLimit(async () => {
    try {
      const filePath = await downloadBigImage(sku);
      console.log(`[${now()}] ✅ Downloaded CHP image for SKU ${sku}`);
      const newId    = await uploadToDrive(filePath, sku, drive);
      const imageUrl = `https://drive.google.com/uc?export=view&id=${newId}`;
      await ItemImage.updateOne(
        { itemCode: sku },
        {
          $set: {
            status: 'found',
            driveId: newId,
            imageUrl,
            lastCheckedAt: new Date()
          },
          $inc: { attempts: 1 }
        },
        { upsert: true }
      );
      console.log(`[${now()}] 🚀 Uploaded to Drive & recorded for SKU ${sku}`);
    } catch (err) {
      console.warn(`[${now()}] ⚠️ SKU ${sku} failed: ${err.message}`);
      await ItemImage.updateOne(
        { itemCode: sku },
        { $set: { status: 'not_found', lastCheckedAt: new Date() }, $inc: { attempts: 1 } },
        { upsert: true }
      );
    }
  })));

  console.log(`[${now()}] 🏁 All done — images synced & uploaded`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[${now()}] Fatal error:`, err);
    process.exit(1);
  });
}
