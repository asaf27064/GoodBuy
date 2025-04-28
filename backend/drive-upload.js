// sync_drive_images_to_mongo.js
// Recursively lists all images in a Drive folder (and subfolders) and upserts into MongoDB

require('dotenv').config();
const path      = require('path');
const mongoose  = require('mongoose');
const { google }= require('googleapis');
const ItemImage = require('./models/ItemImage');

// Path to service-account key
const KEYFILE   = path.join(__dirname, 'drive-key.json');
// Root folder ID containing images (can have subfolders)
const FOLDER_ID = '1JZXJWP4maO_-3U4TSx4nZ2iGtWlgvxzQ';

// Authenticate once
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE,
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});
const drive = google.drive({ version: 'v3', auth });

// Recursively list all image files under a folderId
async function listAllImages(folderId) {
  let images = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken
    });
    for (const file of res.data.files || []) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const sub = await listAllImages(file.id);
        images.push(...sub);
      } else if (file.mimeType.startsWith('image/')) {
        images.push(file);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return images;
}

async function main() {
  // 1) Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('✖️ MONGO_URI not set'); process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // 2) List all images from Drive recursively
  const images = await listAllImages(FOLDER_ID);
  console.log(`🔍 Found ${images.length} image files in Drive (incl. subfolders)`);

  // 3) Upsert each into ItemImage
  for (const { id, name } of images) {
    const itemCode = name.replace(path.extname(name), '');
    const imageUrl = `https://drive.google.com/uc?export=view&id=${id}`;
    try {
      await ItemImage.updateOne(
        { itemCode },
        { $setOnInsert: { imageUrl } },
        { upsert: true }
      );
      console.log(`🗂️ Upserted ${itemCode} → ${imageUrl}`);
    } catch (err) {
      console.error(`❌ Failed to upsert ${itemCode}: ${err.message}`);
    }
  }

  console.log('🏁 All images synced to MongoDB');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
