const path = require('path');
const fs = require('fs');
const pLimit = require('p-limit').default;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const IMAGES_DIR = path.join(__dirname, 'images');

const s3 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const CONCURRENCY = require('os').cpus().length * 4;
const limit = pLimit(CONCURRENCY);

async function uploadImage(fileName) {
  const filePath = path.join(IMAGES_DIR, fileName);
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: process.env.R2_BUCKET,
    Key: `images/${fileName}`,
    Body: fileContent,
    ContentType: 'image/png'
  };

  await s3.send(new PutObjectCommand(params));
  console.log(`Uploaded: ${fileName}`);
}

async function main() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.png'));

  await Promise.all(
    files.map(file => limit(() => uploadImage(file)))
  );

  console.log('All uploads complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
