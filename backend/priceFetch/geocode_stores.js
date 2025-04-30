const mongoose      = require('mongoose');
const geocodeGoogle = require('./geocode-google');
const geocodeOSM    = require('./geocode-util');
const Store         = require('../models/Store');
const pLimit        = require('p-limit').default;
const fs            = require('fs');
const path          = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const stores = await Store.find({
    $or: [
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates.0': 0, 'location.coordinates.1': 0 }
    ]
  }).select('_id address city zipCode').lean();

  console.log(`🔍 Need geocode for ${stores.length} stores`);
  const limit = pLimit(10);
  const ops = [];
  const failedStores = [];

  await Promise.all(stores.map(s => limit(async () => {
    let coords = null;
    if (s.address) {
      try {
        coords = await geocodeGoogle(s);
      } catch (err) {
        console.warn(`⚠️ Google failed for ${s._id}: ${err.message}`);
      }
    }
    if (!coords && s.address) {
      try {
        coords = await geocodeOSM(s);
      } catch (err) {
        console.warn(`⚠️ OSM failed for ${s._id}: ${err.message}`);
      }
    }
    if (coords) {
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { location: { type: 'Point', coordinates: [coords.lng, coords.lat] } } }
        }
      });
      console.log(`✔️ Geocoded ${s._id}: ${coords.lat},${coords.lng}`);
    } else {
      console.warn(`❌ No coords for ${s._id}`);
      failedStores.push({
        _id: s._id,
        address: s.address,
        city: s.city,
        zipCode: s.zipCode
      });
    }
  })));

  if (ops.length) {
    console.log(`⏳ Writing ${ops.length} updates to Mongo…`);
    await Store.bulkWrite(ops);
  }

  if (failedStores.length) {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'geocode_failures.json');
    fs.writeFileSync(logPath, JSON.stringify(failedStores, null, 2), 'utf-8');
    console.log(`❌ ${failedStores.length} stores failed. See log: ${logPath}`);

    const idsToDelete = failedStores.map(s => s._id);
    const deleteResult = await Store.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} failed stores from database`);
  }

  console.log('🏁 Geocoding complete');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
