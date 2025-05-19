const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const pLimit = require('p-limit').default;
const axios = require('axios');
const cheerio = require('cheerio');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const ItemImage = require('../../models/ItemImage');
const PriceItem = require('../../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DOWNLOAD_DIR = path.join(__dirname, 'DownloadsMissingPhotos');
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION;
const S3_CONCURRENCY = require('os').cpus().length * 2;
const CHP_CONCURRENCY = require('os').cpus().length * 2;
const MAX_CHP_TIMEOUT = 90_000; // ms

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const mode = process.argv[2] === 'update' ? 'update' : 'init';
const now = () => new Date().toISOString();

async function listAllS3Images(prefix = 'images/') {
  let images = [];
  let ContinuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
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

async function uploadToS3(filePath, sku) {
  const fileContent = fs.readFileSync(filePath);
  const Key = `images/${sku}.png`;
  const uploadParams = {
    Bucket: S3_BUCKET,
    Key,
    Body: fileContent,
    ContentType: 'image/png'
  };
  await s3.send(new PutObjectCommand(uploadParams));
  fs.unlinkSync(filePath);
  return {
    key: Key,
    imageUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${Key}`
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('✖️ MONGO_URI not set'); process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[${now()}] ✅ Connected to MongoDB in ${mode.toUpperCase()} mode`);

  const allCodes = await PriceItem.distinct('itemCode');

  if (mode === 'init') {
    console.log(`[${now()}] 🔍 Scanning S3 for existing images...`);
    const s3Images = await listAllS3Images();
    const s3Limit = pLimit(S3_CONCURRENCY);

    await Promise.all(allCodes.map(itemCode => s3Limit(async () => {
      const Key = `images/${itemCode}.png`;
      const imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${Key}`;

      if (s3Images.includes(itemCode)) {
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
    console.log(`[${now()}] 🏁 INIT completed — MongoDB now fully synced to S3 & PriceItem`);
  }

  if (mode === 'update') {
    const seenCodes = await ItemImage.distinct('itemCode');
    const missing = allCodes.filter(code => !seenCodes.includes(code));
    const s3Images = await listAllS3Images();
    const chpLimit = pLimit(CHP_CONCURRENCY);

    await Promise.all(missing.map(sku => chpLimit(async () => {
      const Key = `images/${sku}.png`;
      const imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${Key}`;
      if (s3Images.includes(sku)) {
        await ItemImage.updateOne(
          { itemCode: sku },
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
        try {
          const filePath = await downloadBigImage(sku);
          console.log(`[${now()}] ✅ Downloaded CHP image for SKU ${sku}`);
          const { key, imageUrl } = await uploadToS3(filePath, sku);
          await ItemImage.updateOne(
            { itemCode: sku },
            {
              $set: {
                status: 'found',
                s3Key: key,
                imageUrl,
                lastCheckedAt: new Date()
              },
              $inc: { attempts: 1 }
            },
            { upsert: true }
          );
          console.log(`[${now()}] 🚀 Uploaded to S3 & recorded for SKU ${sku}`);
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
