const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pLimit = require('p-limit').default;
require('dotenv').config({ path: path.join(__dirname, '../.env') });


const DIR = path.join(__dirname, 'DownloadsMissingPhotos');
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const CONCURRENCY = require('os').cpus().length * 2;

async function uploadFile(file) {
  const filePath = path.join(DIR, file);
  const Key = `images/${file}`;
  const uploadParams = {
    Bucket: S3_BUCKET,
    Key,
    Body: fs.readFileSync(filePath),
    ContentType: 'image/png',
  };
  await s3.send(new PutObjectCommand(uploadParams));
  console.log('✅ Uploaded:', file);
}

async function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));
  const limit = pLimit(CONCURRENCY);


  await Promise.all(
    files.map(file => limit(() =>
      uploadFile(file).catch(e => console.error('❌ Failed:', file, e.message))
    ))
  );
  console.log('🚀 All done!');
}

main();
