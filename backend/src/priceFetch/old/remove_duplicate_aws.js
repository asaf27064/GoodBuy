const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const path        = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function deleteDuplicates() {
  let ContinuationToken;
  let toDelete = [];
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: 'images/',
      ContinuationToken
    }));

    for (const obj of res.Contents || []) {
      if (/\(\d+\)\.png$/.test(obj.Key)) {
        toDelete.push({ Key: obj.Key });
      }
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);

  if (toDelete.length === 0) {
    console.log('לא נמצאו כפילויות למחיקה!');
    return;
  }

  for (let i = 0; i < toDelete.length; i += 1000) {
    const chunk = toDelete.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
      Delete: { Objects: chunk }
    }));
    console.log(`נמחקו ${chunk.length} קבצים`);
  }
  console.log('המחיקה הושלמה!');
}

deleteDuplicates().catch(console.error);
