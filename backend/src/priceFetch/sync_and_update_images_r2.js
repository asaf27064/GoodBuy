const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const pLimit = require('p-limit').default;
const axios = require('axios');
const cheerio = require('cheerio');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const ItemImage = require('../models/ItemImage');
const PriceItem = require('../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ALLOW_CHP_API     = process.env.CHP_API_ENABLED === 'true';
const ALLOW_R2_UPLOAD   = process.env.R2_UPLOAD_ENABLED === 'true';

const DOWNLOAD_DIR      = path.join(__dirname, 'DownloadsMissingPhotos');
const R2_BUCKET         = process.env.R2_BUCKET;
const R2_REGION         = process.env.R2_REGION;
const R2_ENDPOINT       = process.env.R2_ENDPOINT;
const PUBLIC_DEV_URL    = process.env.PUBLIC_DEV_URL;
const R2_CONCURRENCY    = require('os').cpus().length * 2;
const CHP_CONCURRENCY   = require('os').cpus().length * 2;
const MAX_CHP_TIMEOUT   = 90_000;

const s3 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const mode = process.argv[2] === 'update' ? 'update' : 'init';
const now = () => new Date().toISOString();

async function listAllR2Images(prefix = 'images/') {
  let images = [];
  let ContinuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken
    }));
    for (const obj of res.Contents || []) {
      if (obj.Key.endsWith('.png')) {
        images.push(path.basename(obj.Key, '.png'));
      }
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return images;
}

async function downloadBigImage(sku) {
  if (!ALLOW_CHP_API) {
    throw new Error('CHP API usage is disabled. Set CHP_API_ENABLED=true to enable downloads.');
  }
  const url = `https://chp.co.il/main_page/compare_results?product_barcode=${sku}`;
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
  const res = await axios.get(url, {
    timeout: MAX_CHP_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Accept-Language': 'he-IL,he;q=0.9',
      'Referer': 'https://chp.co.il/',
      'Origin': 'https://chp.co.il'
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

async function uploadToR2(filePath, sku) {
  if (!ALLOW_R2_UPLOAD) {
    throw new Error('R2 upload is disabled. Set R2_UPLOAD_ENABLED=true to enable uploads.');
  }
  const fileContent = fs.readFileSync(filePath);
  const Key = `images/${sku}.png`;
  const uploadParams = {
    Bucket: R2_BUCKET,
    Key,
    Body: fileContent,
    ContentType: 'image/png'
  };
  await s3.send(new PutObjectCommand(uploadParams));
  fs.unlinkSync(filePath);
  const imageUrl = `${PUBLIC_DEV_URL}/images/${sku}.png`;
  return { key: Key, imageUrl };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('✖️ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[${now()}] ✅ Connected to MongoDB in ${mode.toUpperCase()} mode`);

  const allCodes = await PriceItem.distinct('itemCode');

  if (mode === 'init') {
    console.log(`[${now()}] 🔍 Scanning R2 for existing images...`);
    const r2Images = await listAllR2Images();
    const r2Limit = pLimit(R2_CONCURRENCY);

    await Promise.all(allCodes.map(itemCode => r2Limit(async () => {
      const Key = `images/${itemCode}.png`;
      const imageUrl = `${PUBLIC_DEV_URL}/images/${itemCode}.png`;

      if (r2Images.includes(itemCode)) {
        await ItemImage.updateOne(
          { itemCode },
          {
            $set: {
              status: 'found',
              s3Key: Key,
              imageUrl,
              lastCheckedAt: new Date(),
              attempts: 0
            }
          },
          { upsert: true }
        );
      } else {
        await ItemImage.updateOne(
          { itemCode },
          { $set: { status: 'not_found', lastCheckedAt: new Date() }, $setOnInsert: { attempts: 1 } },
          { upsert: true }
        );
      }
    })));
    console.log(`[${now()}] 🏁 INIT completed — MongoDB now fully synced to R2 & PriceItem`);
  }

  if (mode === 'update') {
    const seenCodes = await ItemImage.distinct('itemCode');
    const missing = allCodes.filter(code => !seenCodes.includes(code));
    const r2Images = await listAllR2Images();
    const chpLimit = pLimit(CHP_CONCURRENCY);

    await Promise.all(missing.map(sku => chpLimit(async () => {
      const Key = `images/${sku}.png`;
      const imageUrl = `${PUBLIC_DEV_URL}/images/${sku}.png`;

      if (r2Images.includes(sku)) {
        await ItemImage.updateOne(
          { itemCode: sku },
          {
            $set: { status: 'found', s3Key: Key, imageUrl, lastCheckedAt: new Date(), attempts: 0 }
          },
          { upsert: true }
        );

      } else {
        try {
          const filePath = await downloadBigImage(sku);
          console.log(`[${now()}] ✅ Downloaded CHP image for SKU ${sku}`);
          const { key, imageUrl: uploadedUrl } = await uploadToR2(filePath, sku);
          await ItemImage.updateOne(
            { itemCode: sku },
            {
              $set: { status: 'found', s3Key: key, imageUrl: uploadedUrl, lastCheckedAt: new Date() },
              $inc: { attempts: 1 }
            },
            { upsert: true }
          );
          console.log(`[${now()}] 🚀 Uploaded to R2 & recorded for SKU ${sku}`);
        } catch (err) {
          console.warn(`[${now()}] ⚠️ SKU ${sku} failed: ${err.message}`);
          await ItemImage.updateOne(
            { itemCode: sku },
            { $set: { status: 'not_found', lastCheckedAt: new Date() }, $inc: { attempts: 1 } },
            { upsert: true }
          );
        }
      }
    })));
    console.log(`[${now()}] 🏁 UPDATE completed — All new products processed`);
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[${now()}] Fatal error:`, err);
    process.exit(1);
  });
}
